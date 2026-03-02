import { Command } from 'commander';
import * as path from 'path';
import { RedditCollector } from './collectors/reddit';
import { KeywordAnalyzer } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';
import { BatchMarkdownReporter } from './reporters/batch-markdown';
import { CollectorConfig, AnalysisResult, ReportData, BatchKeywordResult, BatchReportData } from './types';

const program = new Command();

program
  .name('demand-collector')
  .description('CLI tool to collect user demands from various communities')
  .version('1.0.0');

// ── collect 子命令 ────────────────────────────────────────────────────
program
  .command('collect')
  .description('Collect user demand posts from a community platform')
  .requiredOption('-k, --keyword <keyword>', 'Search keyword (e.g. "feature request")')
  .option('-s, --source <source>', 'Source platform: reddit', 'reddit')
  .option('-l, --limit <number>', 'Max number of posts to collect', '50')
  .option('-r, --subreddits <list>', 'Comma-separated subreddits to search within (e.g. "AI_Agents,LocalLLaMA")')
  .option('-o, --output <path>', 'Output report file path', './reports/report.md')
  .action(async (options) => {
    const config: CollectorConfig = {
      keyword: options.keyword,
      source: options.source,
      limit: parseInt(options.limit, 10),
      subreddits: options.subreddits
        ? (options.subreddits as string).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };

    console.log('');
    console.log(`Keyword    : "${config.keyword}"`);
    console.log(`Source     : ${config.source}`);
    console.log(`Limit      : ${config.limit}`);
    console.log(`Subreddits : ${config.subreddits?.length ? config.subreddits.join(', ') : '(全站)'}`);
    console.log(`Output     : ${options.output}`);
    console.log('');

    try {
      // 1. 采集
      let collector;
      if (config.source === 'reddit') {
        collector = new RedditCollector(config);
      } else {
        console.error(`Unsupported source: "${config.source}". Currently supported: reddit`);
        process.exit(1);
      }

      const posts = await collector.collect();

      if (posts.length === 0) {
        console.log('No posts found. Try a different keyword or increase --limit.');
        return;
      }

      // 2. 分析
      console.log('Analyzing...');
      const analyzer = new KeywordAnalyzer();
      const ranker = new DemandRanker();

      const keywords = analyzer.analyze(posts, 30);
      const topDemands = ranker.rank(posts, Math.min(10, posts.length));

      const analysis: AnalysisResult = {
        totalPosts: posts.length,
        keywords,
        topDemands,
        summary: `共采集 ${posts.length} 条帖子，来自 ${config.source} 平台，关键词「${config.keyword}」。热度最高的帖子得分为 ${ranker.engagementScore(topDemands[0])}。`,
      };

      // 3. 生成报告
      console.log('Generating report...');
      const reportData: ReportData = {
        config,
        analysis,
        generatedAt: new Date(),
      };

      const reporter = new MarkdownReporter();
      const outputPath = path.resolve(options.output);
      reporter.generate(reportData, outputPath);

      console.log('Done!');
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── batch 子命令 ─────────────────────────────────────────────────────
program
  .command('batch')
  .description('Collect and compare demands for multiple keywords in one report')
  .requiredOption('-K, --keywords <keywords>', 'Comma-separated keywords (e.g. "AI agent memory,LLM tools,AI automation")')
  .option('-s, --source <source>', 'Source platform: reddit', 'reddit')
  .option('-l, --limit <number>', 'Max posts per keyword', '50')
  .option('-r, --subreddits <list>', 'Comma-separated subreddits (e.g. "AI_Agents,LocalLLaMA")')
  .option('-o, --output <path>', 'Output report file path', './reports/batch-report.md')
  .action(async (options) => {
    const keywords = (options.keywords as string).split(',').map((s: string) => s.trim()).filter(Boolean);
    const source = options.source as string;
    const limit = parseInt(options.limit, 10);
    const subreddits = options.subreddits
      ? (options.subreddits as string).split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (keywords.length === 0) {
      console.error('Error: --keywords must contain at least one keyword.');
      process.exit(1);
    }

    console.log('');
    console.log(`Keywords   : ${keywords.join(' | ')}`);
    console.log(`Source     : ${source}`);
    console.log(`Limit/kw   : ${limit}`);
    console.log(`Subreddits : ${subreddits.length ? subreddits.join(', ') : '(all)'}`);
    console.log(`Output     : ${options.output}`);
    console.log('');

    if (source !== 'reddit') {
      console.error(`Unsupported source: "${source}". Currently supported: reddit`);
      process.exit(1);
    }

    try {
      const analyzer = new KeywordAnalyzer();
      const ranker = new DemandRanker();
      const results: BatchKeywordResult[] = [];

      for (const keyword of keywords) {
        console.log(`\n── Collecting: "${keyword}" ──`);

        const config: CollectorConfig = { keyword, source, limit, subreddits };
        const collector = new RedditCollector(config);
        const posts = await collector.collect();

        console.log(`Analyzing "${keyword}"...`);
        const keywordsMap = analyzer.analyze(posts, 30);
        const topDemands = ranker.rank(posts, Math.min(10, posts.length));

        const analysis: AnalysisResult = {
          totalPosts: posts.length,
          keywords: keywordsMap,
          topDemands,
          summary: `Collected ${posts.length} posts for "${keyword}" from ${source}.`,
        };

        results.push({ keyword, posts, analysis });
      }

      // 生成批量对比报告
      console.log('\nGenerating batch comparison report...');
      const reportData: BatchReportData = {
        keywords,
        source,
        subreddits,
        limit,
        results,
        generatedAt: new Date(),
      };

      const reporter = new BatchMarkdownReporter();
      const outputPath = path.resolve(options.output);
      reporter.generate(reportData, outputPath);

      console.log('Done!');
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── report 子命令（占位，待后续实现）────────────────────────────────
program
  .command('report')
  .description('Generate a report from previously collected data')
  .option('-i, --input <path>', 'Input data file path')
  .option('-o, --output <path>', 'Output report file path', './reports/report.md')
  .action((options) => {
    console.log('[report] Not yet implemented.');
    console.log(`  input  : ${options.input ?? '(none)'}`);
    console.log(`  output : ${options.output}`);
  });

export { program };
