# 코어테크인베스트먼트 홈페이지

- 홈페이지: https://koretechinv.yoonho-3fa.workers.dev (도메인 연결 전)
- 관리자: https://koretechinv.yoonho-3fa.workers.dev/admin
- 최종 도메인(예정): https://www.koretechinv.com

## 구조

| 영역 | 기술 | 비고 |
| --- | --- | --- |
| 화면 | Astro 5 | 소개 페이지는 빌드 때 정적 생성, 메인·공지·포트폴리오·관리자는 요청 때 서버 렌더링 |
| 서버 | Cloudflare Workers `koretechinv` | `@astrojs/cloudflare` 어댑터 |
| DB | Cloudflare D1 `koretech-db` | 스키마 `migrations/` |
| 첨부파일 | Cloudflare R2 `koretech-files` | `/files/<id>/<파일명>` 으로 내려받기 |
| 메인 3D | three.js | `src/components/HeroJourney.astro` |

```
src/lib/site.ts        회사 정보·메뉴·문구 (여기만 고치면 전 페이지 반영)
src/lib/server.ts      인증·DB·첨부·본문 렌더링·변경 이력
src/middleware.ts      /admin 보호
src/pages/admin/       관리자 화면
public/brand/          로고 세트 — 프로젝트 폴더 작업기록/스크립트/make_brand.py 가 원본 AI 에서 생성
```

## 개발 · 배포

```bash
npm install
npm run dev                 # 로컬 (D1·R2 는 로컬 에뮬레이션)
npm run db:migrate          # 원격 D1 스키마 적용
npm run deploy              # 빌드 + 배포
```
배포에는 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 환경변수가 필요하다.

관리자 계정 발급·비밀번호 초기화: `node scripts/create-admin.mjs <아이디> <이름> <비밀번호 저장 파일>`

검수: `node scripts/shots.cjs <폴더>` (히어로 5막·메인·소개·관리자·모바일 캡처 + 콘솔 오류)

## 보안
- 비밀번호: PBKDF2-SHA256 10만회, 솔트 16바이트
- 세션: HMAC 서명 쿠키(HttpOnly · Secure · SameSite=Strict, 8시간), 키는 `wrangler secret SESSION_SECRET`
- 로그인 실패 15분 8회 → 잠금, 다른 출처 POST 거부(Astro checkOrigin)
- 본문 마크다운의 원시 HTML 은 글자로 바꿔 표시, 작성중 글·첨부는 관리자만
- 관리자 응답: no-store · noindex · X-Frame-Options DENY

## 도메인 연결 (예정)
koretechinv.com 은 가비아 등록 · 아사달 네임서버(고객사 보유). 연결하려면 존을 Cloudflare 로 옮기거나(메일 MX 유지 필수)
고객사 DNS 에서 www 레코드를 추가한 뒤 Workers 사용자 지정 도메인을 붙이고 `astro.config.mjs` 의 `SITE_URL` 을 바꾼다.
