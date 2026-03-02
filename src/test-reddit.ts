import * as fs from 'fs';
import * as path from 'path';
import { Post, AnalysisResult, ReportData, CollectorConfig } from './types';
import { KeywordCounter } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';

console.log('🧪 Testing with sample Reddit data\n');

// 读取示例 Reddit 数据
const sampleDataPath = path.join(__dirname, '../sample-reddit-data.json');
const redditResponse = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));

console.log('Step 1: Parsing Reddit API response...');

const posts: Post[] = redditResponse.data.children.map((child: any) => ({
  id: child.data.id,
  title: child.data.title,
  content: child.data.selftext || '',
  author: child.data.author,
  url: `https://www.reddit.com${child.data.permalink}`,
  score: child.data.score,
  commentCount: child.data.num_comments,
  createdAt: new Date(child.data.created_utc * 1000),
  platform: 'reddit',
}));

console.log(`✓ Parsed ${posts.length} posts from Reddit\n`);

console.log('Step 2: Analyzing data...');

const keywordCounter = new KeywordCounter();
const demandRanker = new DemandRanker();

const keywords = keywordCounter.count(posts);
const topDemands = demandRanker.rank(posts, 10);

console.log(`✓ Found ${keywords.size} unique keywords`);
console.log(`✓ Ranked ${topDemands.length} demands\n`);

console.log('Top 5 keywords:');
Array.from(keywords.entries()).slice(0, 5).forEach(([word, count]) => {
  console.log(`  - ${word}: ${count}`);
});

console.log('\nTop 3 demands:');
topDemands.slice(0, 3).forEach((post, index) => {
  console.log(`  ${index + 1}. ${post.title} (score: ${post.score}, comments: ${post.commentCount})`);
});

console.log('\nStep 3: Generating report...');

const config: CollectorConfig = {
  keyword: 'javascript',
  source: 'reddit',
  limit: 5,
};

const analysis: AnalysisResult = {
  totalPosts: posts.length,
  keywords,
  topDemands,
  summary: `Collected ${posts.length} posts from Reddit`,
};

const reportData: ReportData = {
  config,
  analysis,
  generatedAt: new Date(),
};

const reporter = new MarkdownReporter();
reporter.generate(reportData, './reports/reddit-sample-report.md');

console.log('\n✅ Test completed successfully!');
console.log('📄 Report generated at: ./reports/reddit-sample-report.md');
