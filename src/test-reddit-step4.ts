/**
 * 第四步验收测试脚本
 * 运行: node dist/test-reddit-step4.js
 */
import { RedditCollector } from './collectors/reddit';

async function main() {
  const keyword = 'AI memory';
  const limit = 5;

  console.log('='.repeat(60));
  console.log(' Reddit Collector — 第四步验收测试');
  console.log('='.repeat(60));
  console.log(`关键词: "${keyword}"  抓取上限: ${limit} 条\n`);

  const collector = new RedditCollector({ keyword, limit, source: 'reddit' });

  try {
    const posts = await collector.collect();

    console.log(`\n${'─'.repeat(60)}`);
    console.log(` 抓取成功，共 ${posts.length} 条帖子`);
    console.log(`${'─'.repeat(60)}\n`);

    posts.forEach((post, i) => {
      console.log(`[${i + 1}] ${post.title}`);
      console.log(`    作者    : u/${post.author}`);
      console.log(`    分数    : ${post.score}  评论: ${post.commentCount}`);
      console.log(`    发布时间: ${post.createdAt.toISOString().slice(0, 10)}`);
      console.log(`    链接    : ${post.url}`);
      if (post.content) {
        console.log(`    摘要    : ${post.content.slice(0, 80).replace(/\n/g, ' ')}…`);
      }
      console.log();
    });
  } catch (err) {
    console.error('抓取失败:', err);
    process.exit(1);
  }
}

main();
