/** 사이트 공통 상수 — 회사 정보는 이 파일 한 곳에서만 고친다. */

export const COMPANY = {
  nameKo: '주식회사 코어테크인베스트먼트',
  nameKoShort: '코어테크인베스트먼트',
  nameEn: 'KoreTech Investment Co., Ltd.',
  ceo: '정대화',
  founded: '2026년 6월 5일',
  address: '서울특별시 강남구 봉은사로 306, 11층 (역삼동, 나강빌딩)',
  addressShort: '서울특별시 강남구 봉은사로 306, 11층',
  business: '신기술사업금융업',
  capital: '120억원',
  shareholder: '주식회사 엘아이아이씨엠 100%',
  tel: '02-558-2555',
  fax: '02-558-5488',
  email: 'info@koretechinv.com',
  mapUrl: 'https://naver.me/xk9pYSjK',
  domain: 'www.koretechinv.com',
} as const;

/** base 경로를 붙인 내부 링크를 만든다. 모든 내부 href는 이 함수를 거친다. */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}` || '/';
}

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const NAV: NavItem[] = [
  {
    label: 'About us',
    href: '/about/overview',
    children: [
      { label: '회사소개', href: '/about/overview' },
      { label: '투자철학', href: '/about/philosophy' },
      { label: '연혁', href: '/about/history' },
      { label: '조직도', href: '/about/organization' },
    ],
  },
  { label: 'Portfolio', href: '/portfolio' },
  {
    label: 'Notice',
    href: '/notice/disclosure',
    children: [
      { label: '경영공시', href: '/notice/disclosure' },
      { label: '뉴스', href: '/notice/news' },
    ],
  },
  { label: 'Contact', href: '/contact' },
];

/** 투자 프로세스 — 메인과 서브에서 함께 쓴다. */
export const PROCESS = [
  { step: '01', title: '투자 발굴', en: 'Deal Sourcing', desc: '기술력과 성장성을 갖춘 신기술사업자·벤처기업을 발굴합니다.' },
  { step: '02', title: '검토 및 실사', en: 'Review & Due Diligence', desc: '기술성·시장성·재무·법률 전반을 다각도로 검증합니다.' },
  { step: '03', title: '투자심의위원회', en: 'Investment Committee', desc: '투자심의위원회의 심의·의결을 거쳐 투자를 확정합니다.' },
  { step: '04', title: '투자 집행', en: 'Execution', desc: '계약 체결과 대금 납입으로 투자를 집행합니다.' },
  { step: '05', title: '사후관리', en: 'Portfolio Management', desc: '경영·기술 지도와 후속 투자로 성장을 함께합니다.' },
] as const;

/** 관심 투자 분야 — 메인의 흐르는 띠에 쓴다. */
export const SECTORS = [
  '반도체·디스플레이',
  '인공지능',
  '로보틱스',
  '이차전지',
  '바이오·헬스케어',
  '소재·부품·장비',
  '모빌리티',
  '우주항공·방산',
  '사이버보안',
  '친환경 에너지',
] as const;

/** 업무영역 */
export const SERVICES = [
  {
    title: '투자',
    en: 'Equity Investment',
    desc: '신기술사업자 및 벤처기업의 지분을 인수하여 성장 단계에 필요한 자본을 공급합니다.',
    items: ['보통주·우선주 투자', '전환사채(CB)·신주인수권부사채(BW)', '프로젝트 투자'],
  },
  {
    title: '융자',
    en: 'Loan & Debt',
    desc: '지분 희석 없이 자금이 필요한 기업에 사채 인수와 대출로 유동성을 지원합니다.',
    items: ['사채 인수', '운영·시설 자금 대출', '기술담보 여신'],
  },
  {
    title: '경영·기술 지도',
    en: 'Value-up Support',
    desc: '투자 이후에도 경영 전략과 기술 사업화를 함께 설계하는 파트너로 남습니다.',
    items: ['경영 자문 및 지배구조 정비', '후속 투자유치 연계', '사업화·판로 지원'],
  },
] as const;
