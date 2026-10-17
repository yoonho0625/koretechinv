/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  /** 관리자 세션 서명 키 (wrangler secret) */
  SESSION_SECRET: string;
  /** 정적 파일 (404 페이지를 꺼내 쓴다) */
  ASSETS: { fetch: (input: Request | string | URL) => Promise<Response> };
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    admin?: { username: string; name: string };
  }
}
