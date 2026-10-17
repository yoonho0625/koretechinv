/** 메인(및 시안) 페이지가 함께 쓰는 데이터 — 최근 공지·포트폴리오 */
import { envOf, type Notice, type Portfolio } from './server';

export type HomeNotice = Notice & { file_count: number };

export async function loadHome(locals: App.Locals, noticeLimit = 5, portfolioLimit = 6) {
  const env = envOf(locals);
  const notices =
    (
      await env.DB.prepare(
        `SELECT n.*, (SELECT COUNT(*) FROM files f WHERE f.owner = 'notice' AND f.owner_id = n.id) AS file_count
           FROM notices n WHERE n.published = 1
          ORDER BY n.pinned DESC, n.post_date DESC, n.id DESC LIMIT ?`
      )
        .bind(noticeLimit)
        .all<HomeNotice>()
    ).results ?? [];
  const portfolio =
    (await env.DB.prepare('SELECT * FROM portfolio WHERE published = 1 ORDER BY sort DESC, id DESC LIMIT ?').bind(portfolioLimit).all<Portfolio>())
      .results ?? [];
  return { notices, portfolio };
}

/** 투자 방식 세 가지 — 짧은 이름 */
export const METHODS = ['지분 투자', '융자', '경영·기술 지도'] as const;
