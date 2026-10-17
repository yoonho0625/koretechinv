import { readFileSync } from 'node:fs';
const B = 'https://koretechinv.yoonho-3fa.workers.dev';
const line = readFileSync('D:/PJT 개발 산출물 백업/코어테크 KoreTech/관리자계정_비밀번호.txt','utf8').split('\n').filter(l=>l.includes('아이디: zoopiter')).pop();
const pw = line.split('비밀번호: ')[1].trim();
const H = { Origin: B };
const out = [];
const t0 = Date.now();
// 1) 틀린 비번
let r = await fetch(B+'/admin/login', { method:'POST', headers:H, body:new URLSearchParams({username:'zoopiter',password:'wrong-pass-1'}), redirect:'manual' });
out.push(['틀린 비번 → 200 + 오류문구', r.status, (await r.text()).includes('맞지 않습니다')]);
// 2) 로그인
const t1 = Date.now();
r = await fetch(B+'/admin/login', { method:'POST', headers:H, body:new URLSearchParams({username:'zoopiter',password:pw}), redirect:'manual' });
const cookie = (r.headers.get('set-cookie')||'').split(';')[0];
out.push(['로그인 → 302 + 쿠키', r.status, !!cookie, `${Date.now()-t1}ms`]);
const C = { Origin:B, Cookie: cookie };
// 3) 비로그인 관리자 접근 차단
r = await fetch(B+'/admin/notices', { redirect:'manual' });
out.push(['비로그인 /admin/notices → 로그인으로', r.status, r.headers.get('location')]);
// 4) 공지 등록 (파일 2개)
const fd = new FormData();
fd.set('title','[검증] 첨부파일 테스트 공지'); fd.set('category','경영공시'); fd.set('post_date','2026-10-17');
fd.set('published','1'); fd.set('body','**굵게** 테스트\n\n- 목록 하나\n- 목록 둘\n\n<script>alert(1)</script>'); fd.set('intent','save');
fd.append('files', new Blob([readFileSync(new URL('./fixtures/test_disclosure.pdf', import.meta.url))],{type:'application/pdf'}), 'test_disclosure.pdf');
fd.append('files', new Blob([readFileSync(new URL('./fixtures/sample.hwp', import.meta.url))]), '2026년_통일경영공시.hwp');
r = await fetch(B+'/admin/notices/new', { method:'POST', headers:C, body:fd, redirect:'manual' });
const loc = r.headers.get('location')||''; const id = (loc.match(/notices\/(\d+)/)||[])[1];
out.push(['공지 등록 → 303', r.status, loc]);
// 5) 공개 상세
r = await fetch(B+'/notice/'+id); let html = await r.text();
const links = [...html.matchAll(/href="(\/files\/\d+\/[^"]+)"/g)].map(m=>m[1]);
out.push(['공개 상세 200 · 첨부 2개 · 스크립트 무력화', r.status, links.length, !html.includes('<script>alert(1)'), html.includes('<strong>굵게</strong>')]);
// 6) 다운로드
for (const l of links) { const d = await fetch(B+l); out.push(['다운로드', d.status, d.headers.get('content-type'), decodeURIComponent((d.headers.get('content-disposition')||'').split("UTF-8''")[1]||'')]); }
// 7) 목록·메인 노출
r = await fetch(B+'/notice'); out.push(['목록에 노출', (await r.text()).includes('[검증] 첨부파일 테스트 공지')]);
r = await fetch(B+'/'); out.push(['메인에 노출', (await r.text()).includes('[검증] 첨부파일 테스트 공지')]);
// 8) 작성중 전환 → 공개에서 숨김
const fd2 = new FormData(); fd2.set('title','[검증] 첨부파일 테스트 공지'); fd2.set('category','경영공시'); fd2.set('post_date','2026-10-17'); fd2.set('published','0'); fd2.set('body',''); fd2.set('intent','save');
r = await fetch(B+'/admin/notices/'+id, { method:'POST', headers:C, body:fd2, redirect:'manual' });
const hid = await fetch(B+'/notice/'+id); out.push(['작성중 → 공개 상세 404', hid.status]);
const fileHidden = await fetch(B+links[0]); out.push(['작성중 첨부 → 비로그인 404', fileHidden.status]);
// 9) 삭제
const fd3 = new FormData(); fd3.set('intent','delete');
r = await fetch(B+'/admin/notices/'+id, { method:'POST', headers:C, body:fd3, redirect:'manual' });
out.push(['삭제 → 303', r.status, r.headers.get('location')]);
const gone = await fetch(B+links[0], { headers: { Cookie: cookie } }); out.push(['삭제 후 파일 404', gone.status]);
// 10) CSRF: 다른 Origin 거부
r = await fetch(B+'/admin/notices/new', { method:'POST', headers:{ Cookie: cookie, Origin:'https://evil.example' }, body:new URLSearchParams({title:'x'}), redirect:'manual' });
out.push(['다른 출처 POST 거부', r.status]);
for (const o of out) console.log(o.map(String).join(' | '));
console.log('총', Date.now()-t0, 'ms');
