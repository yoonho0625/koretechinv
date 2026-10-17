import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/server';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/admin/login', 303);
};
