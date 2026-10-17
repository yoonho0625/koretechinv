// 리뉴얼 시안 A·B·C 캡처 — 첫 화면 연출 3컷 + 본문을 화면 단위로 + 모바일
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const B = process.env.KT_BASE || 'https://koretechinv.yoonho-3fa.workers.dev';
const O = process.argv[2] || 'shots/design/';
fs.mkdirSync(O, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const go = (p, y) => p.evaluate((t) => scrollTo({ top: t, behavior: 'instant' }), y);

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
  const errs = [];
  const watch = (p, tag) => {
    p.on('pageerror', (e) => errs.push(`${tag} JS ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${tag} C ${m.text().slice(0, 150)}`); });
  };
  for (const k of ['a', 'b', 'c']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    watch(page, k);
    await page.goto(`${B}/design/${k}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(3500);
    const H = await page.evaluate(() => document.querySelector('[data-hero]').offsetHeight - innerHeight);
    for (const [f, n] of [[0.02, 'h1'], [0.57, 'h3'], [0.97, 'h5']]) { await go(page, Math.round(H * f)); await wait(1800); await page.screenshot({ path: `${O}${k}_${n}.png` }); }
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    let y = H + 900, i = 1;
    while (y < total && i <= 12) { await go(page, y); await wait(1100); await page.screenshot({ path: `${O}${k}_s${String(i).padStart(2, '0')}.png` }); y += 820; i++; }
    await page.close();

    const m = await browser.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    watch(m, `${k}-m`);
    await m.goto(`${B}/design/${k}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(3200);
    const H2 = await m.evaluate(() => document.querySelector('[data-hero]').offsetHeight - innerHeight);
    for (const [f, n] of [[0.02, 'mo_h1'], [0.97, 'mo_h5']]) { await go(m, Math.round(H2 * f)); await wait(1600); await m.screenshot({ path: `${O}${k}_${n}.png` }); }
    const t2 = await m.evaluate(() => document.documentElement.scrollHeight);
    let y2 = H2 + 844, j = 1;
    while (y2 < t2 && j <= 8) { await go(m, y2); await wait(900); await m.screenshot({ path: `${O}${k}_mo_s${j}.png` }); y2 += 1300; j++; }
    // 가로 넘침 검사
    const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) errs.push(`${k}-m 가로 넘침 ${over}px`);
    await m.close();
  }
  // 메인: 대표이사 타일 제거 확인
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  watch(p, 'main');
  await p.goto(`${B}/`, { waitUntil: 'networkidle2', timeout: 90000 });
  await wait(2500);
  const ceo = await p.evaluate(() => document.body.innerText.includes('정대화'));
  if (ceo) errs.push('main: 대표자 이름이 남아 있음');
  await p.evaluate(() => document.querySelector('.bento').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await p.evaluate(() => scrollBy({ top: -80, behavior: 'instant' }));
  await wait(1200);
  await p.screenshot({ path: `${O}main_bento.png` });
  console.log(errs.length ? 'ERR\n' + [...new Set(errs)].join('\n') : 'NO ERRORS');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
