// 관리자 사용안내서용 화면 캡처 (zoopiter 계정으로 로그인)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const B = 'https://koretechinv.yoonho-3fa.workers.dev';
const O = process.argv[2];
(async () => {
  const pw = fs.readFileSync('D:/PJT 개발 산출물 백업/코어테크 KoreTech/관리자계정_비밀번호.txt', 'utf8').split('\n').filter((l) => l.includes('아이디: zoopiter')).pop().split('비밀번호: ')[1].trim();
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 760 });
  await p.goto(B + '/admin/login', { waitUntil: 'networkidle2' });
  await p.screenshot({ path: O + '/admin_login.png' });
  await p.type('#u', 'zoopiter'); await p.type('#p', pw);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }), p.click('button[type=submit]')]);
  await p.setViewport({ width: 1280, height: 1260 });
  await p.goto(B + '/admin/notices/new', { waitUntil: 'networkidle2' });
  await p.type('#title', '2026년 상반기 통일경영공시');
  await p.select('#category', '경영공시');
  await p.type('textarea[name=body]', '2026년 상반기 통일경영공시를 첨부와 같이 게시합니다.');
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: O + '/admin_new.png' });
  await p.setViewport({ width: 1280, height: 760 });
  await p.goto(B + '/admin', { waitUntil: 'networkidle2' });
  await p.screenshot({ path: O + '/admin_dash.png' });
  await b.close();
  console.log('ok');
})();
