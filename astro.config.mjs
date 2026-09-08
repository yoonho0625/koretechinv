// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 배포처가 바뀌면 여기만 고친다.
//  - GitHub Pages(프로젝트 저장소): site=https://<user>.github.io, base=/<repo>
//  - 자체 도메인(www.koretechinv.com): site=https://www.koretechinv.com, base='/'
const SITE = process.env.SITE_URL ?? 'https://yoonho0625.github.io';
const BASE = process.env.BASE_PATH ?? '/koretechinv';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
