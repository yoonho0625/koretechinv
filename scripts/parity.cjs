// PC(1440) ↔ 모바일(390) 일치 검사 — 페이지마다
//  ① PC에서 보이는 글이 모바일에서 빠졌는지(헤더 메뉴는 햄버거라 제외)
//  ② 모바일 가로 넘침 ③ 모바일 12px 미만 글자 ④ 고객 지정 줄바꿈(.lines .ln)이 PC에서 한 줄인지
//  ⑤ 전체 화면 캡처(PC·모바일)
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const B = process.env.KT_BASE || 'https://koretechinv.yoonho-3fa.workers.dev';
const O = process.argv[2] || 'shots/parity/';
fs.mkdirSync(O, { recursive: true });
const ROUTES = process.env.KT_ROUTES ? process.env.KT_ROUTES.split(',') : ['/', '/about/overview', '/about/philosophy', '/about/history', '/about/organization', '/portfolio', '/notice', '/contact', '/legal/privacy', '/legal/credit-info', '/sitemap'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (r) => (r === '/' ? 'home' : r.slice(1).replace(/\//g, '_'));

const collect = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const words = new Set();
  const small = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!t || !el || el.closest('script,style,noscript,[data-header]')) continue;
    if (!vis(el)) continue;
    t.split(' ').forEach((w) => w.length > 1 && words.add(w));
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) small.push(`${fs}px "${t.slice(0, 30)}"`);
  }
  const lines = [...document.querySelectorAll('.lines .ln')].map((ln) => {
    const lh = parseFloat(getComputedStyle(ln).lineHeight) || parseFloat(getComputedStyle(ln).fontSize) * 1.6;
    return { text: ln.textContent.trim().slice(0, 24), rows: Math.round(ln.getBoundingClientRect().height / lh) };
  });
  return { words: [...words], small, lines, over: document.documentElement.scrollWidth - innerWidth };
};

const settle = async (p) => {
  // 등장 효과(.reveal)를 켜려고 끝까지 한 번 내려갔다 올라온다
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) { await p.evaluate((t) => scrollTo({ top: t, behavior: 'instant' }), y); await wait(60); }
  await p.evaluate(() => { scrollTo({ top: 0, behavior: 'instant' }); document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')); });
  await wait(1000);
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 240000, args: ['--hide-scrollbars'] });
  const report = [];
  for (const r of ROUTES) {
    const d = await browser.newPage();
    await d.setViewport({ width: 1440, height: 900 });
    const m = await browser.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const errs = [];
    for (const p of [d, m]) p.on('pageerror', (e) => errs.push(e.message));
    await Promise.all([d.goto(B + r, { waitUntil: 'networkidle2', timeout: 90000 }), m.goto(B + r, { waitUntil: 'networkidle2', timeout: 90000 })]);
    await Promise.all([settle(d), settle(m)]);
    const [cd, cm] = await Promise.all([d.evaluate(collect), m.evaluate(collect)]);
    const mw = new Set(cm.words);
    const missing = cd.words.filter((w) => !mw.has(w));
    const extra = cm.words.filter((w) => !new Set(cd.words).has(w));
    report.push({ route: r, missingOnMobile: missing, onlyOnMobile: extra, mobileOverflow: cm.over, mobileSmall: cm.small.slice(0, 8), desktopLines: cd.lines, mobileLines: cm.lines, errors: errs });
    if (r !== '/') {
      await d.screenshot({ path: `${O}${slug(r)}_pc.png`, fullPage: true });
      await m.screenshot({ path: `${O}${slug(r)}_mo.png`, fullPage: true });
    }
    await d.close(); await m.close();
  }
  fs.writeFileSync(O + 'report.json', JSON.stringify(report, null, 2));
  for (const x of report) {
    const bad = x.missingOnMobile.length || x.mobileOverflow > 0 || x.mobileSmall.length || x.errors.length || x.desktopLines.some((l) => l.rows !== 1);
    console.log(`${bad ? '✗' : '✓'} ${x.route}  누락 ${x.missingOnMobile.length} · 모바일만 ${x.onlyOnMobile.length} · 넘침 ${x.mobileOverflow} · 12px미만 ${x.mobileSmall.length} · 줄 ${x.desktopLines.map((l) => l.rows).join('/') || '-'} · 오류 ${x.errors.length}`);
    if (x.missingOnMobile.length) console.log('   누락:', x.missingOnMobile.slice(0, 25).join(' '));
    if (x.onlyOnMobile.length) console.log('   모바일만:', x.onlyOnMobile.slice(0, 25).join(' '));
    if (x.mobileSmall.length) console.log('   작은 글:', x.mobileSmall.join(' | '));
    if (x.errors.length) console.log('   오류:', x.errors.join(' | '));
  }
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
