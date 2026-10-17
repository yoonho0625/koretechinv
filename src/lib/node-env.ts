/**
 * 국내 VPS(Node) 실행용 환경 — Cloudflare 의 D1·R2·ASSETS 와 같은 모양으로 감싼다.
 * 그래서 페이지·server.ts 는 실행 환경을 몰라도 된다.
 *
 *   DB    → SQLite 파일 (better-sqlite3)          KT_DB_PATH    기본 ./data/koretech.db
 *   FILES → 디스크 폴더                            KT_FILES_DIR  기본 ./data/files
 *   ASSETS→ 빌드된 정적 파일 폴더 (404.html 등)     KT_CLIENT_DIR 기본 ./dist/client
 *   SESSION_SECRET                                 환경변수 (systemd EnvironmentFile)
 *
 * 처음 켜질 때 migrations/*.sql 중 아직 안 돌린 것을 순서대로 적용한다.
 */
import Database from 'better-sqlite3';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

const cwd = process.cwd();
const DB_PATH = resolve(process.env.KT_DB_PATH ?? join(cwd, 'data', 'koretech.db'));
const FILES_DIR = resolve(process.env.KT_FILES_DIR ?? join(cwd, 'data', 'files'));
const CLIENT_DIR = resolve(process.env.KT_CLIENT_DIR ?? join(cwd, 'dist', 'client'));
const MIGRATIONS_DIR = resolve(process.env.KT_MIGRATIONS_DIR ?? join(cwd, 'migrations'));

type Row = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────
// D1 과 같은 모양의 SQLite 래퍼
// ─────────────────────────────────────────────────────────────
class Stmt {
  constructor(private db: Database.Database, private sql: string, private params: unknown[] = []) {}

  bind(...params: unknown[]) {
    return new Stmt(this.db, this.sql, params);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.params as never[])) as Row | undefined;
    if (!row) return null;
    return (column ? (row[column] as T) : (row as T)) ?? null;
  }

  async all<T = Row>(): Promise<{ results: T[]; success: true; meta: Record<string, unknown> }> {
    const results = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return { results, success: true, meta: {} };
  }

  async run(): Promise<{ success: true; meta: { last_row_id: number; changes: number } }> {
    const info = this.db.prepare(this.sql).run(...(this.params as never[]));
    return { success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } };
  }

  /** batch 안에서 동기 실행용 */
  runSync() {
    return this.db.prepare(this.sql).run(...(this.params as never[]));
  }
}

class D1Like {
  constructor(private db: Database.Database) {}

  prepare(sql: string) {
    return new Stmt(this.db, sql);
  }

  async batch(stmts: Stmt[]) {
    const tx = this.db.transaction((list: Stmt[]) => list.map((s) => s.runSync()));
    return tx(stmts).map((info) => ({ success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } }));
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 1, duration: 0 };
  }
}

function migrate(db: Database.Database) {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime(\'now\')))');
  if (!existsSync(MIGRATIONS_DIR)) return;
  const done = new Set((db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name));
  for (const f of readdirSync(MIGRATIONS_DIR).filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(f);
    })();
    console.log(`[koretech] DB 마이그레이션 적용: ${f}`);
  }
}

// ─────────────────────────────────────────────────────────────
// R2 와 같은 모양의 파일 저장소
// ─────────────────────────────────────────────────────────────
function safePath(key: string) {
  const p = normalize(join(FILES_DIR, key));
  if (!p.startsWith(FILES_DIR + sep)) throw new Error(`허용되지 않은 파일 경로: ${key}`);
  return p;
}

const filesLike = {
  async put(key: string, value: ArrayBuffer | Uint8Array) {
    const p = safePath(key);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, value instanceof Uint8Array ? value : new Uint8Array(value));
    return { key };
  },
  async get(key: string) {
    const p = safePath(key);
    if (!existsSync(p)) return null;
    const size = statSync(p).size;
    return { key, size, body: Readable.toWeb(createReadStream(p)) as unknown as ReadableStream };
  },
  async delete(key: string) {
    const p = safePath(key);
    if (existsSync(p)) unlinkSync(p);
  },
};

// ─────────────────────────────────────────────────────────────
// 정적 파일 (notFound 가 404.html 을 꺼낼 때)
// ─────────────────────────────────────────────────────────────
const assetsLike = {
  async fetch(input: Request | string | URL) {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://local');
    const p = normalize(join(CLIENT_DIR, decodeURIComponent(url.pathname)));
    if (!p.startsWith(CLIENT_DIR) || !existsSync(p) || statSync(p).isDirectory()) return new Response('Not Found', { status: 404 });
    return new Response(readFileSync(p), { headers: { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' } });
  },
};

let cached: Env | null = null;

export function nodeEnv(): Env {
  if (cached) return cached;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  mkdirSync(FILES_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  const secret = process.env.SESSION_SECRET ?? '';
  if (secret.length < 32) console.warn('[koretech] SESSION_SECRET 이 없거나 짧습니다 — 관리자 로그인이 동작하지 않습니다.');
  cached = {
    DB: new D1Like(db) as unknown as Env['DB'],
    FILES: filesLike as unknown as Env['FILES'],
    ASSETS: assetsLike,
    SESSION_SECRET: secret,
  };
  return cached;
}
