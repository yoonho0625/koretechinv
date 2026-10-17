import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, readSession } from './lib/server';

/**
 * 관리자 영역 보호
 *  - /admin/* 는 로그인 세션이 있어야 들어간다 (/admin/login 제외)
 *  - 관리자 응답은 캐시·검색·프레임 삽입을 막는다
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.isPrerendered) return next();

  const path = ctx.url.pathname.replace(/\/+$/, '') || '/';
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  // 로그인 상태는 공개 페이지에서도 읽는다 (작성중 글 미리보기·첨부 열람)
  const secret = ctx.locals.runtime?.env?.SESSION_SECRET ?? '';
  if (secret) {
    const s = await readSession(secret, ctx.cookies.get(SESSION_COOKIE)?.value);
    if (s) ctx.locals.admin = s;
  }

  if (isAdmin && path !== '/admin/login' && !ctx.locals.admin) {
    const back = encodeURIComponent(ctx.url.pathname + ctx.url.search);
    return ctx.redirect(`/admin/login?next=${back}`, 302);
  }

  const res = await next();
  if (isAdmin) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Referrer-Policy', 'same-origin');
    res.headers.set('X-Content-Type-Options', 'nosniff');
  }
  return res;
});
