# 코어테크인베스트먼트 홈페이지

㈜코어테크인베스트먼트(KoreTech Investment) 공식 홈페이지.

- **공개 주소(임시)**: https://yoonho0625.github.io/koretechinv/
- **최종 주소(예정)**: https://www.koretechinv.com
- **콘텐츠 관리**: https://yoonho0625.github.io/koretechinv/admin/

---

## 1. 구조

| 영역 | 사용 기술 | 비고 |
| --- | --- | --- |
| 사이트 생성 | Astro 5 (정적 빌드) | 서버·DB 없음 |
| 히어로 3D | three.js | 직접 번들, CDN 의존 없음 |
| 콘텐츠 관리 | Decap CMS | `/admin/` |
| 배포 | GitHub Actions → GitHub Pages | `main` 에 커밋되면 자동 재배포 |
| 문의 폼 | Netlify Forms 규격 | Netlify 이전 시 바로 동작 (아래 4번 참고) |

```
src/
  lib/site.ts          회사 정보·메뉴·업무영역·투자프로세스 (여기만 고치면 전 페이지 반영)
  styles/global.css    디자인 시스템 (CI 3색에서 파생)
  components/          Header, Footer, PageHero, HeroJourney(메인 3D)
  layouts/             Base(공통), Legal(법정 고지)
  content/             공시·뉴스·포트폴리오 마크다운 (CMS가 여기에 쓴다)
  pages/               페이지
public/
  brand/               로고 파생 에셋 (원본 로고에서 자동 생성)
  admin/               Decap CMS
  uploads/             CMS로 올린 첨부파일·이미지
```

## 2. 개발

```bash
npm install
npm run dev      # http://localhost:4321/koretechinv
npm run build    # dist/ 생성
```

## 3. 콘텐츠 등록 (담당 직원용)

1. https://yoonho0625.github.io/koretechinv/admin/ 접속
2. GitHub 계정으로 로그인
3. 좌측에서 **경영공시 / 뉴스 / 포트폴리오** 선택 → `New` 클릭
4. 내용 작성 후 **Publish** → 약 1~2분 뒤 홈페이지에 반영

- **작성중** 스위치를 켜두면 홈페이지에 노출되지 않는다. 완성 후 끄면 공개된다.
- 공시 첨부는 hwp / pdf / docx / xlsx 모두 가능. **10MB 이하** 권장.

### 관리자 로그인 설정 (최초 1회)

`public/admin/config.yml` 의 `app_id` 에 GitHub OAuth App의 Client ID를 넣어야 로그인이 된다.

1. https://github.com/settings/developers → **New OAuth App**
2. 입력값
   - Application name: `KoreTech CMS`
   - Homepage URL: `https://yoonho0625.github.io/koretechinv/`
   - Authorization callback URL: `https://yoonho0625.github.io/koretechinv/admin/`
3. 발급된 **Client ID** 를 `config.yml` 의 `app_id:` 값으로 교체하고 커밋

> Netlify로 옮기면 `backend` 를 `git-gateway` 로 바꾸고 Netlify Identity로 초대하는 방식도 가능하다.

## 4. 배포처 변경

`astro.config.mjs` 는 환경변수로 주소를 받는다.

| 배포처 | SITE_URL | BASE_PATH |
| --- | --- | --- |
| GitHub Pages (현재) | `https://yoonho0625.github.io` | `/koretechinv` |
| 자체 도메인 | `https://www.koretechinv.com` | `/` |

GitHub Pages에서 자체 도메인을 붙이려면 저장소 Settings → Pages → Custom domain 에
`www.koretechinv.com` 을 넣고, 위 표에 맞춰 저장소 Variables(`SITE_URL`, `BASE_PATH`)를 바꾼다.

**문의 폼**은 Netlify Forms 규격(`data-netlify="true"`)으로 작성되어 있다.
GitHub Pages에서는 폼 전송이 동작하지 않으므로, Netlify로 옮기면 별도 작업 없이 바로 접수된다.
GitHub Pages를 계속 쓸 경우 Formspree 등 외부 폼 서비스의 `action` 주소로 바꾸면 된다.

## 5. 로고 에셋

`public/brand/` 의 파일은 원본 로고(`Logo 투명 png.png`)에서 파생한 것이다.
로고가 바뀌면 원본을 교체한 뒤 파생 파일을 다시 만들어야 한다.

- `wordmark-dark.png` — **메인 히어로 4막에서 입자가 이 이미지를 샘플링**해 로고 모양을 만든다
- `logo-full-dark.png` — 푸터
- `wordmark.png` / `wordmark-dark.png` — 헤더 (밝은/어두운 배경)
- `favicon-*.png`, `favicon.ico` — 파비콘
- `og-image.png` — 카카오톡·페이스북 공유 미리보기

## 6. 남은 작업

- [ ] 법정 고지 3종(개인정보처리방침·신용정보활용체제·금리인하요구권)을 법무 검토본으로 교체하고
      `src/pages/legal/*.astro` 의 `draft` 속성 제거
- [ ] 조직도 확정안 반영 (`src/pages/about/organization.astro`)
- [ ] 연혁의 유상증자일·등록일 확정 (`src/pages/about/history.astro`)
- [ ] 개인정보 보호책임자 / 신용정보관리·보호인 성명·직위 기재
- [ ] 도메인 연결 및 Netlify 이전(문의 폼 활성화)
- [ ] 네이버 서치어드바이저 / 구글 서치콘솔 사이트 등록
