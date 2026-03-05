#!/usr/bin/env node
/**
 * 在无法访问 Reddit 时，用 mock 帖子跑通「分析 → Kimi 翻译 → 报告」整条链路，用于验证 Kimi API。
 * 使用方式：设置 OPENAI_API_KEY 和 OPENAI_BASE_URL 后执行
 *   npx ts-node src/run-with-mock-and-kimi.ts
 */
import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NO_PROXY = 'api.moonshot.cn';

import * as path from 'path';
import { Post, AnalysisResult, ReportData, CollectorConfig } from './types';
import { KeywordAnalyzer } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';
import { LLMTranslator } from './translators/llm';

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Feature request: Add dark mode support',
    content: 'It would be great to have dark mode support in the application. Many users prefer dark themes.',
    author: 'user1',
    url: 'https://example.com/post1',
    score: 150,
    commentCount: 45,
    createdAt: new Date('2026-02-28'),
    platform: 'reddit',
  },
  {
    id: '2',
    title: 'Bug: Application crashes on startup',
    content: 'The application crashes immediately after startup. This is a critical issue that needs to be fixed.',
    author: 'user2',
    url: 'https://example.com/post2',
    score: 200,
    commentCount: 80,
    createdAt: new Date('2026-02-27'),
    platform: 'reddit',
  },
];

const config: CollectorConfig = {
  keyword: 'feature request',
  source: 'reddit',
  limit: 5,
};

async function main() {
  console.log('Keyword    : "' + config.keyword + '"');
  console.log('Source     : reddit (mock data)');
  console.log('Translate  : Yes (Kimi)\n');

  const analyzer = new KeywordAnalyzer();
  const ranker = new DemandRanker();
  const keywords = analyzer.analyze(mockPosts, 30);
  let topDemands = ranker.rank(mockPosts, Math.min(10, mockPosts.length));

  console.log('Translating top demands with Kimi...');
  const translator = new LLMTranslator();
  topDemands = await translator.translate(topDemands);

  const analysis: AnalysisResult = {
    totalPosts: mockPosts.length,
    keywords,
    topDemands,
    summary: `Mock 数据共 ${mockPosts.length} 条，已用 Kimi 翻译。`,
  };

  const reportData: ReportData = { config, analysis, generatedAt: new Date() };
  const outputPath = path.resolve('./reports/report.md');
  const reporter = new MarkdownReporter();
  reporter.generate(reportData, outputPath);

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
