// 모바일 수정 검증 — 프로세스 번호가 스크롤 따라 순서대로 빨갛게 / 네이버 지도 앱 링크(안드로이드·아이폰·PC)
const puppeteer = require('puppeteer-core');
const B = process.env.KT_BASE || 'https://koretechinv.yoonho-3fa.workers.dev';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 240000 });
  const p = await br.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(B + '/', { waitUntil: 'load', timeout: 90000 });
  await wait(2000);
  const tops = await p.evaluate(() => [...document.querySelectorAll('[data-steps] > li')].map((li) => li.getBoundingClientRect().top + scrollY));
  const seq = [];
  for (let k = 0; k < 5; k++) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(tops[k] - 844 * 0.5));
    await wait(400);
    seq.push(await p.evaluate(() => [...document.querySelectorAll('[data-steps] > li .steps__no')].map((n) => (getComputedStyle(n).backgroundColor === 'rgb(244, 241, 236)' ? '○' : '●')).join('')));
  }
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await wait(400);
  seq.push('top:' + (await p.evaluate(() => [...document.querySelectorAll('[data-steps] > li')].filter((l) => l.classList.contains('is-on')).length)));
  console.log('프로세스(390):', seq.join('  '));
  await p.close();

  for (const [tag, ua, mobile] of [
    ['안드로이드', 'Mozilla/5.0 (Linux; Android 14; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36', true],
    ['아이폰', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', true],
    ['PC', null, false],
  ]) {
    for (const path of ['/', '/contact']) {
      const q = await br.newPage();
      if (ua) await q.setUserAgent(ua);
      await q.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
      await q.goto(B + path, { waitUntil: 'load', timeout: 90000 });
      await wait(1200);
      const got = await q.evaluate(() => {
        const a = document.querySelector('[data-naver-app]');
        let target = null;
        const desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
        // location.href 대입을 가로채 기록만 한다(실제 이동 안 함)
        window.__nav = [];
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        const orig = window.location;
        try { Object.defineProperty(window, '__probe', { value: 1 }); } catch {}
        return { href: a.getAttribute('href'), n: document.querySelectorAll('[data-naver-app]').length };
      });
      // 실제 클릭 → 이동 요청 URL 을 잡는다
      const reqs = [];
      q.on('request', (r) => reqs.push(r.url()));
      const cdp = await q.target().createCDPSession();
      await cdp.send('Page.enable');
      const navs = [];
      cdp.on('Page.frameRequestedNavigation', (e) => navs.push(e.url));
      const popup = new Promise((res) => br.once('targetcreated', (t) => res(t.url())));
      await q.click('[data-naver-app]');
      const pop = await Promise.race([popup, wait(2500).then(() => null)]);
      const nav = navs.find((u) => /^(nmap|intent):/.test(u) || /naver/.test(u)); console.log(`${tag} ${path}: 링크 ${got.n}개 · 이동 ${nav ? nav.slice(0, 150) : '-'} · 새 창 ${pop || '-'}`);
      await q.close();
    }
  }
  await br.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
