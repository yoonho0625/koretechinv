import type { APIRoute } from 'astro';
import { envOf, IMAGE_EXT, extOf, type FileRow } from '../../../lib/server';

export const prerender = false;

/**
 * 첨부파일 내려받기 — /files/<id>/<파일명>
 * 공개된 글의 첨부만 누구나 받을 수 있고, 작성중인 글의 첨부는 관리자만 받는다.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const env = envOf(locals);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new Response('잘못된 주소입니다.', { status: 400 });

  const f = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(id).first<FileRow>();
  if (!f) return new Response('파일을 찾을 수 없습니다.', { status: 404 });

  const table = f.owner === 'notice' ? 'notices' : 'portfolio';
  const owner = await env.DB.prepare(`SELECT published FROM ${table} WHERE id = ?`).bind(f.owner_id).first<{ published: number }>();
  const isPublic = !!owner?.published;
  if (!isPublic && !locals.admin) return new Response('파일을 찾을 수 없습니다.', { status: 404 });

  const obj = await env.FILES.get(f.r2_key);
  if (!obj) return new Response('파일 원본이 없습니다. 관리자에게 알려주세요.', { status: 404 });

  const ext = extOf(f.name);
  const inline = ext === 'pdf' || IMAGE_EXT.includes(ext);
  const ascii = f.name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  const headers = new Headers({
    'Content-Type': f.mime,
    'Content-Length': String(obj.size),
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    'Cache-Control': isPublic ? 'public, max-age=3600' : 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (ext === 'svg') headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  return new Response(obj.body as unknown as ReadableStream, { headers });
};
