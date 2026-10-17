// 관리자 계정 만들기 / 비밀번호 초기화
//   node scripts/create-admin.mjs <아이디> <이름> <비밀번호를 적을 파일>
// 비밀번호는 무작위로 만들어 지정한 파일에만 적는다(화면에 찍지 않는다).
// KT_DB_PATH 가 있으면 그 SQLite 파일에, 없으면 Cloudflare D1(CLOUDFLARE_API_TOKEN 필요)에 쓴다.
import { webcrypto as crypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const [username, name, outFile] = process.argv.slice(2);
if (!username || !name || !outFile) {
  console.error('사용법: node scripts/create-admin.mjs <아이디> <이름> <비밀번호 저장 파일>');
  process.exit(1);
}

const ITER = 100_000;
const b64url = (u8) => Buffer.from(u8).toString('base64url');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const rnd = crypto.getRandomValues(new Uint8Array(16));
const password = Array.from(rnd, (b) => ALPHA[b % ALPHA.length]).join('') + '!7';

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql =
  `INSERT INTO admins (username, name, pw_hash, pw_salt, pw_iter) VALUES (${q(username)}, ${q(name)}, ${q(b64url(new Uint8Array(bits)))}, ${q(b64url(salt))}, ${ITER}) ` +
  `ON CONFLICT(username) DO UPDATE SET name = excluded.name, pw_hash = excluded.pw_hash, pw_salt = excluded.pw_salt, pw_iter = excluded.pw_iter;`;

if (process.env.KT_DB_PATH) {
  // 국내 VPS / 로컬: SQLite 파일에 바로 쓴다 (서버를 한 번 띄워 스키마가 만들어진 뒤에)
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(process.env.KT_DB_PATH);
  db.exec(sql);
  db.close();
} else {
  // Cloudflare D1: 셸이 SQL 을 쪼개지 않도록 파일로 넘기고, 끝나면 지운다
  const tmp = join(tmpdir(), `kt-admin-${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'koretech-db', '--remote', '--yes', `--file="${tmp}"`], { stdio: ['ignore', 'ignore', 'inherit'], shell: true });
  } finally {
    unlinkSync(tmp);
  }
}

mkdirSync(dirname(outFile), { recursive: true });
appendFileSync(outFile, `${new Date().toISOString()}  아이디: ${username}  이름: ${name}  비밀번호: ${password}\n`, 'utf8');
console.log(`계정 ${username} 저장 완료 → 비밀번호는 ${outFile} 에 적었습니다.`);
