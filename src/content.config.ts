import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** 경영공시 — 여신전문금융업법에 따른 공시. 파일 첨부가 핵심. */
const disclosure = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/disclosure' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['통일경영공시', '수시공시', '주주총회', '기타']).default('통일경영공시'),
    files: z
      .array(z.object({ label: z.string(), file: z.string() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

/** 뉴스 — 자체 작성 본문 또는 외부 기사 링크. */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    source: z.string().optional(),
    link: z.string().optional(),
    thumbnail: z.string().optional(),
    files: z.array(z.object({ label: z.string(), file: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

/** 포트폴리오 — 투자 기업. */
const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/portfolio' }),
  schema: z.object({
    company: z.string(),
    sector: z.string(),
    year: z.number().optional(),
    stage: z.string().optional(),
    summary: z.string().optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { disclosure, news, portfolio };
