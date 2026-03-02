import { Post, AnalysisResult, ReportData, CollectorConfig } from './types';
import { KeywordCounter } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';

// 模拟测试数据
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
  {
    id: '3',
    title: 'Suggestion: Improve performance',
    content: 'The application is slow when loading large datasets. Performance optimization would be appreciated.',
    author: 'user3',
    url: 'https://example.com/post3',
    score: 120,
    commentCount: 30,
    createdAt: new Date('2026-02-26'),
    platform: 'reddit',
  },
  {
    id: '4',
    title: 'Request: Add export to CSV feature',
    content: 'Please add the ability to export data to CSV format. This would be very useful for data analysis.',
    author: 'user4',
    url: 'https://example.com/post4',
    score: 90,
    commentCount: 25,
    createdAt: new Date('2026-02-25'),
    platform: 'reddit',
  },
  {
    id: '5',
    title: 'Enhancement: Better error messages',
    content: 'Error messages are not clear enough. More descriptive error messages would help users troubleshoot issues.',
    author: 'user5',
    url: 'https://example.com/post5',
    score: 75,
    commentCount: 20,
    createdAt: new Date('2026-02-24'),
    platform: 'reddit',
  },
];

console.log('🧪 Testing Community Demand Collector\n');
console.log('Step 1: Analyzing mock data...');

const keywordCounter = new KeywordCounter();
const demandRanker = new DemandRanker();

const keywords = keywordCounter.count(mockPosts);
const topDemands = demandRanker.rank(mockPosts, 10);

console.log(`✓ Found ${keywords.size} unique keywords`);
console.log(`✓ Ranked ${topDemands.length} demands\n`);

console.log('Step 2: Generating report...');

const config: CollectorConfig = {
  keyword: 'test',
  source: 'reddit',
  limit: 5,
};

const analysis: AnalysisResult = {
  totalPosts: mockPosts.length,
  keywords,
  topDemands,
  summary: `Test run with ${mockPosts.length} mock posts`,
};

const reportData: ReportData = {
  config,
  analysis,
  generatedAt: new Date(),
};

const reporter = new MarkdownReporter();
reporter.generate(reportData, './reports/test-report.md');

console.log('\n✅ Test completed successfully!');
console.log('📄 Report generated at: ./reports/test-report.md');
