// 모바일 메인 부분 캡처 — 설립 타일 · 프로세스 · 포트폴리오 카드. KT_CSS 로 시험 CSS 주입, KT_W 폭
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const B = process.env.KT_BASE || 'https://koretechinv.yoonho-3fa.workers.dev';
const O = process.argv[2] || 'shots/mfix/';
fs.mkdirSync(O, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 240000, args: ['--hide-scrollbars'] });
  for (const W of (process.env.KT_W || '390,360').split(',').map(Number)) {
    const p = await br.newPage();
    await p.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await p.goto(B + '/', { waitUntil: 'load', timeout: 90000 });
    await wait(2500);
    if (process.env.KT_CSS) await p.addStyleTag({ content: fs.readFileSync(process.env.KT_CSS, 'utf8') });
    await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    const info = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tile')].find((x) => x.textContent.includes('설립'));
      const n = t.querySelector('.tile__num');
      const r = n.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(n).lineHeight) || parseFloat(getComputedStyle(n).fontSize);
      return { tileW: t.getBoundingClientRect().width, numW: r.width, numH: Math.round(r.height), fs: getComputedStyle(n).fontSize, small: getComputedStyle(n.querySelector('small')).fontSize, scrollW: n.scrollWidth, clientW: n.clientWidth };
    });
    console.log(W, JSON.stringify(info));
    for (const [sel, name] of [['.bento', 'bento'], ['.panel', 'process'], ['.duo', 'duo']]) {
      const el = await p.$(sel);
      await el.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await wait(700);
      await el.screenshot({ path: `${O}${W}_${name}.png` });
    }
    await p.close();
  }
  await br.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
