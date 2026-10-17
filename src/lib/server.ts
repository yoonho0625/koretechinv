/**
 * 서버 전용 공통 모듈 — 인증 · DB · 첨부파일 · 본문 렌더링 · 변경 이력
 * (요청 때 그리는 페이지와 관리자 페이지에서만 쓴다)
 */
import { Marked } from 'marked';

// ─────────────────────────────────────────────────────────────
// 형식
// ─────────────────────────────────────────────────────────────
export type Notice = {
  id: number;
  category: string;
  title: string;
  body: string;
  post_date: string;
  published: number;
  pinned: number;
  created_at: string;
  updated_at: string;
};

export type Portfolio = {
  id: number;
  company: string;
  sector: string;
  invest_year: number | null;
  stage: string;
  summary: string;
  website: string;
  logo_file_id: number | null;
  body: string;
  sort: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: number;
  owner: 'notice' | 'portfolio';
  owner_id: number;
  r2_key: string;
  name: string;
  size: number;
  mime: string;
  sort: number;
  created_at: string;
};

export type AdminRow = {
  id: number;
  username: string;
  name: string;
  pw_hash: string;
  pw_salt: string;
  pw_iter: number;
  last_login_at: string | null;
};

export const NOTICE_CATEGORIES = ['공지', '경영공시', '수시공시', '주주총회'] as const;

// ─────────────────────────────────────────────────────────────
// 환경
// ─────────────────────────────────────────────────────────────
export function envOf(locals: App.Locals): Env {
  const env = locals.runtime?.env;
  if (!env?.DB || !env?.FILES) {
    throw new Error('서버 바인딩(DB·FILES)을 찾을 수 없습니다. wrangler.jsonc 의 d1_databases / r2_buckets 를 확인하세요.');
  }
  return env;
}

/** 없는 글·작성중 글 — 정적 404 페이지를 404 상태로 돌려준다 */
export async function notFound(locals: App.Locals, base: URL): Promise<Response> {
  const res = await envOf(locals).ASSETS.fetch(new URL('/404.html', base));
  return new Response(res.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// ─────────────────────────────────────────────────────────────
// 바이트·문자 변환
// ─────────────────────────────────────────────────────────────
const te = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─────────────────────────────────────────────────────────────
// 비밀번호 (PBKDF2-SHA256)
// ─────────────────────────────────────────────────────────────
export const PW_ITER = 100_000;

export async function hashPassword(password: string, saltB64: string, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(saltB64), iterations: iter },
    key,
    256
  );
  return b64url(bits);
}

export function newSalt(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

export async function verifyPassword(password: string, row: AdminRow): Promise<boolean> {
  const h = await hashPassword(password, row.pw_salt, row.pw_iter);
  return timingSafeEqual(h, row.pw_hash);
}

// ─────────────────────────────────────────────────────────────
// 세션 (서명된 쿠키 — 서버에 저장하지 않는다)
// ─────────────────────────────────────────────────────────────
export const SESSION_COOKIE = 'kt_admin';
const SESSION_HOURS = 8;

async function hmacKey(secret: string) {
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET 이 설정되지 않았거나 너무 짧습니다(32자 이상). wrangler secret put SESSION_SECRET');
  }
  return crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(secret: string, admin: { username: string; name: string }): Promise<string> {
  const payload = b64url(te.encode(JSON.stringify({ u: admin.username, n: admin.name, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), te.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function readSession(secret: string, value: string | undefined): Promise<{ username: string; name: string } | null> {
  if (!value || !value.includes('.')) return null;
  const [payload, sig] = value.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), te.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { u: string; n: string; exp: number };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { username: data.u, name: data.n };
  } catch {
    return null;
  }
}

export const cookieOptions = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_HOURS * 3600,
});

// ─────────────────────────────────────────────────────────────
// 로그인 시도 제한 — 15분에 8번 실패하면 막는다
// ─────────────────────────────────────────────────────────────
const LOCK_WINDOW_MS = 15 * 60_000;
const LOCK_MAX = 8;

export async function isLocked(db: D1Database, ip: string): Promise<boolean> {
  const since = Date.now() - LOCK_WINDOW_MS;
  const row = await db.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?').bind(ip, since).first<{ n: number }>();
  return (row?.n ?? 0) >= LOCK_MAX;
}

export async function recordFailure(db: D1Database, ip: string) {
  await db.batch([
    db.prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)').bind(ip, Date.now()),
    db.prepare('DELETE FROM login_attempts WHERE at < ?').bind(Date.now() - 24 * 3600_000),
  ]);
}

export async function clearFailures(db: D1Database, ip: string) {
  await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}

// ─────────────────────────────────────────────────────────────
// 변경 이력
// ─────────────────────────────────────────────────────────────
export async function audit(db: D1Database, admin: string, action: string, target = '') {
  await db.prepare('INSERT INTO audit_log (admin, action, target) VALUES (?, ?, ?)').bind(admin, action, target).run();
}

// ─────────────────────────────────────────────────────────────
// 첨부파일
// ─────────────────────────────────────────────────────────────
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/hwp+zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain; charset=utf-8',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};
export const ALLOWED_EXT = Object.keys(ALLOWED);
export const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : '';
}

/** 업로드 검증. 문제가 있으면 사람이 읽을 메시지를 돌려준다. */
export function checkUpload(file: File, onlyImages = false): string | null {
  const ext = extOf(file.name);
  if (!ext || !ALLOWED[ext]) return `'${file.name}' — 올릴 수 없는 형식입니다. (가능: ${ALLOWED_EXT.join(', ')})`;
  if (onlyImages && !IMAGE_EXT.includes(ext)) return `'${file.name}' — 로고는 이미지 파일(jpg·png·svg·webp)만 올릴 수 있습니다.`;
  if (file.size > MAX_FILE_BYTES) return `'${file.name}' — 30MB 를 넘습니다. (${(file.size / 1048576).toFixed(1)}MB)`;
  return null;
}

export async function saveFile(env: Env, owner: 'notice' | 'portfolio', ownerId: number, file: File, sort = 0): Promise<number> {
  const ext = extOf(file.name);
  const key = `${owner}/${ownerId}/${crypto.randomUUID()}.${ext}`;
  const mime = ALLOWED[ext] ?? 'application/octet-stream';
  await env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime } });
  const res = await env.DB.prepare('INSERT INTO files (owner, owner_id, r2_key, name, size, mime, sort) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(owner, ownerId, key, file.name.trim().slice(0, 200), file.size, mime, sort)
    .run();
  return Number(res.meta.last_row_id);
}

export async function deleteFile(env: Env, id: number) {
  const row = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(id).first<FileRow>();
  if (!row) return;
  await env.FILES.delete(row.r2_key);
  await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(id).run();
}

export async function filesOf(db: D1Database, owner: 'notice' | 'portfolio', ownerId: number): Promise<FileRow[]> {
  const r = await db.prepare('SELECT * FROM files WHERE owner = ? AND owner_id = ? ORDER BY sort, id').bind(owner, ownerId).all<FileRow>();
  return r.results ?? [];
}

export function fileUrl(f: Pick<FileRow, 'id' | 'name'>): string {
  return `/files/${f.id}/${encodeURIComponent(f.name)}`;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

// ─────────────────────────────────────────────────────────────
// 본문 렌더링 — 관리자가 쓴 글을 마크다운으로, 원시 HTML 은 글자로 바꾼다
// ─────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const md = new Marked({ gfm: true, breaks: true });
md.use({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    link(token) {
      const href = String(token.href || '');
      const text = this.parser.parseInline(token.tokens);
      if (!/^(https?:|mailto:|tel:|\/)/i.test(href)) return text;
      const external = /^https?:/i.test(href);
      return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    },
    image(token) {
      const href = String(token.href || '');
      if (!/^(https?:|\/)/i.test(href)) return '';
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(token.text || '')}" loading="lazy" />`;
    },
  },
});

export function renderBody(src: string): string {
  if (!src.trim()) return '';
  return md.parse(src, { async: false }) as string;
}

// ─────────────────────────────────────────────────────────────
// 입력값 정리
// ─────────────────────────────────────────────────────────────
export function str(fd: FormData, key: string, max = 2000): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function today(): string {
  // 한국 시간 기준 날짜
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function fmtDate(s: string): string {
  return s.slice(0, 10).replace(/-/g, '.');
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}
