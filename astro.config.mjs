// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// 실행 환경 — node: 국내 VPS(카페24 가상서버), cloudflare: Cloudflare Workers(이전 운영)
const TARGET = process.env.KT_TARGET === 'cloudflare' ? 'cloudflare' : 'node';
// 도메인 연결 후: SITE_URL=https://www.koretechinv.com
const SITE = process.env.SITE_URL ?? 'https://koretechinv.yoonho-3fa.workers.dev';
// Node 서버가 믿을 주소(Host) — 여기 없는 주소로 들어온 폼 전송은 다른 사이트 요청으로 보고 막는다.
// 서버 기본 주소나 새 도메인이 생기면 KT_HOSTS=호스트1,호스트2 로 더해 빌드한다.
const HOSTS = [
  'www.koretechinv.com',
  'koretechinv.com',
  new URL(SITE).hostname,
  '127.0.0.1',
  'localhost',
  ...(process.env.KT_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean),
];

export default defineConfig({
  site: SITE,
  // 소개 페이지는 미리 만들어 두고(정적), 메인·공지·포트폴리오·관리자만 요청 때 DB에서 그린다.
  output: 'static',
  adapter:
    TARGET === 'cloudflare'
      ? cloudflare({ platformProxy: { enabled: true }, imageService: 'passthrough' })
      : node({ mode: 'standalone' }),
  trailingSlash: 'ignore', // Cloudflare: html_handling=drop-trailing-slash / Node: nginx 가 정리
  build: { format: 'directory' },
  security: {
    checkOrigin: true,
    allowedDomains: [...new Set(HOSTS)].map((hostname) => ({ hostname })),
  },
  vite: {
    define: { __KT_TARGET__: JSON.stringify(TARGET) },
    ssr: { external: ['better-sqlite3'] },
  },
  redirects: {
    '/notice/disclosure': '/notice',
    '/notice/news': '/notice',
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
});
