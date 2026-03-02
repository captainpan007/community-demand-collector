import * as fs from 'fs';
import * as path from 'path';
import { Post, AnalysisResult, ReportData, CollectorConfig } from './types';
import { KeywordCounter } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';

console.log('🚀 Comprehensive Test: Reddit + Twitter\n');

// 读取 Reddit 数据
const redditDataPath = path.join(__dirname, '../sample-reddit-data.json');
const redditResponse = JSON.parse(fs.readFileSync(redditDataPath, 'utf-8'));

const redditPosts: Post[] = redditResponse.data.children.map((child: any) => ({
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

console.log(`✓ Loaded ${redditPosts.length} posts from Reddit`);

// 读取 Twitter 数据
const twitterDataPath = path.join(__dirname, '../sample-twitter-data.json');
const twitterResponse = JSON.parse(fs.readFileSync(twitterDataPath, 'utf-8'));

const twitterPosts: Post[] = twitterResponse.data.map((tweet: any) => ({
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

console.log(`✓ Loaded ${twitterPosts.length} tweets from Twitter\n`);

// 合并所有数据
const allPosts = [...redditPosts, ...twitterPosts];

console.log('Analyzing combined data...');

const keywordCounter = new KeywordCounter();
const demandRanker = new DemandRanker();

const keywords = keywordCounter.count(allPosts);
const topDemands = demandRanker.rank(allPosts, 10);

console.log(`✓ Total posts: ${allPosts.length}`);
console.log(`✓ Unique keywords: ${keywords.size}`);
console.log(`✓ Top demands: ${topDemands.length}\n`);

console.log('Platform distribution:');
const redditCount = allPosts.filter(p => p.platform === 'reddit').length;
const twitterCount = allPosts.filter(p => p.platform === 'twitter').length;
console.log(`  - Reddit: ${redditCount}`);
console.log(`  - Twitter: ${twitterCount}\n`);

console.log('Top 5 demands across all platforms:');
topDemands.slice(0, 5).forEach((post, index) => {
  const engagement = post.score + post.commentCount * 2;
  console.log(`  ${index + 1}. [${post.platform.toUpperCase()}] ${post.title.substring(0, 50)}... (engagement: ${engagement})`);
});

console.log('\nGenerating comprehensive report...');

const config: CollectorConfig = {
  keyword: 'user feedback',
  source: 'reddit',
  limit: 10,
};

const analysis: AnalysisResult = {
  totalPosts: allPosts.length,
  keywords,
  topDemands,
  summary: `Collected ${allPosts.length} posts from Reddit and Twitter`,
};

const reportData: ReportData = {
  config,
  analysis,
  generatedAt: new Date(),
};

const reporter = new MarkdownReporter();
reporter.generate(reportData, './reports/comprehensive-report.md');

console.log('\n✅ Comprehensive test completed!');
console.log('📄 Report: ./reports/comprehensive-report.md');
