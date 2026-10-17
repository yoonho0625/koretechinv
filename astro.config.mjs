// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// 배포처가 바뀌면 여기만 고친다. 자체 도메인 연결 후: SITE_URL=https://www.koretechinv.com
const SITE = process.env.SITE_URL ?? 'https://koretechinv.yoonho-3fa.workers.dev';

export default defineConfig({
  site: SITE,
  // 소개 페이지는 미리 만들어 두고(정적), 공지·포트폴리오·관리자만 요청 때 DB에서 그린다.
  output: 'static',
  adapter: cloudflare({ platformProxy: { enabled: true }, imageService: 'passthrough' }),
  trailingSlash: 'ignore', // 정적 파일은 wrangler html_handling=drop-trailing-slash 로 슬래시 없이 제공
  build: { format: 'directory' },
  security: { checkOrigin: true },
  redirects: {
    '/notice/disclosure': '/notice',
    '/notice/news': '/notice',
  },
  integrations: [
    sitemap({ filter: (page) => !page.includes('/admin') }),
  ],
});
