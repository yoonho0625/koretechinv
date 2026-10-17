import type { APIRoute } from 'astro';
import { renderBody } from '../../lib/server';

export const prerender = false;

/** 관리자 글쓰기 '미리보기' — 홈페이지와 같은 방식으로 본문을 그려 돌려준다 (미들웨어가 로그인 확인) */
export const POST: APIRoute = async ({ request }) => {
  const fd = await request.formData();
  const body = String(fd.get('body') ?? '').slice(0, 50000);
  return new Response(renderBody(body), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
};
