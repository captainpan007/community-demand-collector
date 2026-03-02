import * as fs from 'fs';
import * as path from 'path';
import { Post, AnalysisResult, ReportData, CollectorConfig } from './types';
import { KeywordCounter } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';

console.log('🐦 Testing with sample Twitter data\n');

// 读取示例 Twitter 数据
const sampleDataPath = path.join(__dirname, '../sample-twitter-data.json');
const twitterResponse = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));

console.log('Step 1: Parsing Twitter API response...');

const posts: Post[] = twitterResponse.data.map((tweet: any) => ({
  id: tweet.id,
  title: tweet.text.substring(0, 100),
  content: tweet.text,
  author: tweet.author_id,
  url: `https://twitter.com/i/web/status/${tweet.id}`,
  score: tweet.public_metrics.like_count,
  commentCount: tweet.public_metrics.reply_count,
  createdAt: new Date(tweet.created_at),
  platform: 'twitter',
}));

console.log(`✓ Parsed ${posts.length} tweets from Twitter\n`);

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

console.log('\nTop 3 tweets by engagement:');
topDemands.slice(0, 3).forEach((post, index) => {
  const engagement = post.score + post.commentCount * 2;
  console.log(`  ${index + 1}. ${post.title.substring(0, 60)}... (likes: ${post.score}, replies: ${post.commentCount}, engagement: ${engagement})`);
});

console.log('\nStep 3: Generating report...');

const config: CollectorConfig = {
  keyword: 'feature request',
  source: 'twitter',
  limit: 5,
};

const analysis: AnalysisResult = {
  totalPosts: posts.length,
  keywords,
  topDemands,
  summary: `Collected ${posts.length} tweets from Twitter`,
};

const reportData: ReportData = {
  config,
  analysis,
  generatedAt: new Date(),
};

const reporter = new MarkdownReporter();
reporter.generate(reportData, './reports/twitter-sample-report.md');

console.log('\n✅ Test completed successfully!');
console.log('📄 Report generated at: ./reports/twitter-sample-report.md');
