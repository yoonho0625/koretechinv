// 히어로 1막(한반도) 캡처 — 울릉도·독도가 화면 안에 보이는지 PC·모바일로 확인
const puppeteer = require('puppeteer-core');
const B = process.env.KT_BASE || 'https://koretechinv.yoonho-3fa.workers.dev';
const O = process.argv[2] || 'shots/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 120000, args: ['--hide-scrollbars'] });
  for (const [n, vp] of [['pc', { width: 1440, height: 900 }], ['mo', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const p = await browser.newPage();
    await p.setViewport(vp);
    await p.goto(B + '/', { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(3500);
    const H = await p.evaluate(() => document.querySelector('[data-hero]').offsetHeight - innerHeight);
    for (const f of [0.02, 0.12]) {
      await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(H * f));
      await wait(1800);
      await p.screenshot({ path: `${O}map_${n}_${Math.round(f * 100)}.png` });
    }
    await p.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
