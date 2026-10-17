-- 코어테크인베스트먼트 홈페이지 DB (Cloudflare D1 / SQLite)

-- 관리자 계정. 비밀번호는 PBKDF2-SHA256 해시만 저장한다.
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL DEFAULT '',
  pw_hash       TEXT    NOT NULL,
  pw_salt       TEXT    NOT NULL,
  pw_iter       INTEGER NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- 공지사항 (경영공시 포함)
CREATE TABLE IF NOT EXISTS notices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  category   TEXT    NOT NULL DEFAULT '공지',
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  post_date  TEXT    NOT NULL,              -- 화면에 보이는 게시일 YYYY-MM-DD
  published  INTEGER NOT NULL DEFAULT 1,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notices_list ON notices (published, pinned DESC, post_date DESC, id DESC);

-- 포트폴리오
CREATE TABLE IF NOT EXISTS portfolio (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  company      TEXT    NOT NULL,
  sector       TEXT    NOT NULL DEFAULT '',
  invest_year  INTEGER,
  stage        TEXT    NOT NULL DEFAULT '',
  summary      TEXT    NOT NULL DEFAULT '',
  website      TEXT    NOT NULL DEFAULT '',
  logo_file_id INTEGER,
  body         TEXT    NOT NULL DEFAULT '',
  sort         INTEGER NOT NULL DEFAULT 0,
  published    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 첨부파일 (본문은 R2, 여기에는 목록만)
CREATE TABLE IF NOT EXISTS files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner      TEXT    NOT NULL,              -- 'notice' | 'portfolio'
  owner_id   INTEGER NOT NULL,
  r2_key     TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  size       INTEGER NOT NULL,
  mime       TEXT    NOT NULL,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files (owner, owner_id, sort);

-- 로그인 실패 기록 (무차별 대입 차단)
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT    NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts (ip, at);

-- 변경 이력 (누가 언제 무엇을 바꿨는지)
CREATE TABLE IF NOT EXISTS audit_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  admin  TEXT    NOT NULL,
  action TEXT    NOT NULL,
  target TEXT    NOT NULL DEFAULT '',
  at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
