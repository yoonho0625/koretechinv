const puppeteer=require('puppeteer-core');
const fs=require('fs');

const B='https://koretechinv.yoonho-3fa.workers.dev';
const O=process.argv[2]||'shots/'; fs.mkdirSync(O,{recursive:true});
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--hide-scrollbars']});
  const errs=[]; const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const page=await browser.newPage(); await page.setViewport({width:1440,height:900});
  page.on('pageerror',e=>errs.push('JS '+e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push('C '+m.text().slice(0,150));});
  page.on('requestfailed',r=>{ if(!/google|gstatic|maps/.test(r.url())) errs.push('REQ '+r.url().slice(0,100)); });
  await page.goto(B+'/',{waitUntil:'networkidle2',timeout:90000}); await wait(3500);
  const H=await page.evaluate(()=>document.querySelector('[data-hero]').offsetHeight-innerHeight);
  for (const [f,n] of [[0.02,'h1'],[0.34,'h2'],[0.57,'h3_chip'],[0.78,'h4'],[0.97,'h5']]) { await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),Math.round(H*f)); await wait(1700); await page.screenshot({path:O+n+'.png'}); }
  const sec = async (sel,n)=>{ await page.evaluate(s=>document.querySelector(s).scrollIntoView({block:'start',behavior:'instant'}),sel); await page.evaluate(()=>scrollBy({top:-80,behavior:'instant'})); await wait(1300); await page.screenshot({path:O+n+'.png'}); };
  await sec('.bento','m_bento'); await sec('.cards','m_cards'); await sec('.list, .empty:last-of-type','m_notice'); await sec('.cta','m_contact');
  for (const [p,n] of [['/about/overview','overview'],['/about/history','history'],['/about/organization','org'],['/contact','contact'],['/about/philosophy','philosophy']]) {
    await page.goto(B+p,{waitUntil:'networkidle2'}); await wait(700);
    await page.evaluate(()=>{ const s=document.querySelector('main .section'); if(s) s.scrollIntoView({behavior:'instant'}); scrollBy({top:-90,behavior:'instant'}); }); await wait(900);
    await page.screenshot({path:O+n+'.png'});
  }
  // 관리자
  const pw = fs.readFileSync('D:/PJT 개발 산출물 백업/코어테크 KoreTech/관리자계정_비밀번호.txt','utf8').split('\n').filter(l=>l.includes('아이디: zoopiter')).pop().split('비밀번호: ')[1].trim();
  await page.goto(B+'/admin/login',{waitUntil:'networkidle2'}); await wait(500); await page.screenshot({path:O+'admin_login.png'});
  await page.type('#u','zoopiter'); await page.type('#p',pw);
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}), page.click('button[type=submit]')]); await wait(500);
  await page.screenshot({path:O+'admin_dash.png'});
  await page.goto(B+'/admin/notices/new',{waitUntil:'networkidle2'}); await wait(600); await page.screenshot({path:O+'admin_new.png',fullPage:true});
  // 모바일
  const m=await browser.newPage(); await m.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  m.on('pageerror',e=>errs.push('M '+e.message));
  await m.goto(B+'/',{waitUntil:'networkidle2'}); await wait(3200);
  const H2=await m.evaluate(()=>document.querySelector('[data-hero]').offsetHeight-innerHeight);
  for (const [f,n] of [[0.02,'mo_h1'],[0.57,'mo_h3'],[0.97,'mo_h5']]) { await m.evaluate(y=>scrollTo({top:y,behavior:'instant'}),Math.round(H2*f)); await wait(1600); await m.screenshot({path:O+n+'.png'}); }
  await m.goto(B+'/about/organization',{waitUntil:'networkidle2'}); await wait(800); await m.screenshot({path:O+'mo_org.png',fullPage:true});
  await m.goto(B+'/contact',{waitUntil:'networkidle2'}); await wait(800); await m.screenshot({path:O+'mo_contact.png',fullPage:true});
  console.log(errs.length?('ERR\n'+[...new Set(errs)].join('\n')):'NO ERRORS');
  await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
