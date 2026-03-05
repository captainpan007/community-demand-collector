import { Command } from 'commander';
import * as path from 'path';
import {
  runCollect,
  runBatch,
  runReport,
  startScheduler,
  stopScheduler,
  saveReportData,
  loadHistoryReportsSync,
  MarkdownReporter,
  CsvReporter,
  BatchMarkdownReporter,
  loadConfig,
  type CollectorConfig,
  type AppConfig,
  buildWordCloudChart,
  buildTrendChart,
} from '@demand-collector/core';

const program = new Command();

program
  .name('demand-collector')
  .description('CLI tool to collect user demands from various communities')
  .version('1.0.0');

// ── collect 子命令 ────────────────────────────────────────────────────
program
  .command('collect')
  .description('Collect user demand posts from a community platform')
  .option('-k, --keyword <keyword>', 'Search keyword (e.g. "feature request")')
  .option('-s, --source <source>', 'Source: reddit | hackernews | trustpilot')
  .option('-l, --limit <number>', 'Max number of posts to collect')
  .option('-r, --subreddits <list>', 'Comma-separated subreddits (reddit only)')
  .option('-t, --translate', 'Enable LLM translation and summarization for top demands')
  .option('-m, --mock', 'Use mock translator (only works if --translate is also set)')
  .option('-o, --output <path>', 'Output report file path', './reports/report.md')
  .option('-f, --format <format>', 'Output format: md | csv', 'md')
  .option('-j, --json <path>', 'Also save raw data as JSON (for report -i)')
  .action(async (options) => {
    const appConfig: AppConfig = loadConfig();
    const keyword: string =
      options.keyword || appConfig.defaults.keywords[0] || 'AI';
    const source: string = options.source || appConfig.defaults.source;
    const limit: number = options.limit
      ? parseInt(options.limit, 10)
      : appConfig.defaults.limit;
    const subreddits: string[] = options.subreddits
      ? (options.subreddits as string)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const collectorConfig: CollectorConfig = {
      keyword,
      source,
      limit,
      subreddits,
      translate: !!options.translate,
      mock: !!options.mock,
      output: options.output,
      format: options.format,
      json: options.json,
    };

    console.log('');
    console.log(`Keyword    : "${collectorConfig.keyword}"`);
    console.log(`Source     : ${collectorConfig.source}`);
    console.log(`Limit      : ${collectorConfig.limit}`);
    console.log(
      `Subreddits : ${
        collectorConfig.subreddits?.length
          ? collectorConfig.subreddits.join(', ')
          : '(全站)'
      }`,
    );
    console.log(
      `Translate  : ${
        options.translate ? 'Yes' : 'No'
      }${options.translate && options.mock ? ' (Mock)' : ''}`,
    );
    console.log(`Output     : ${options.output}`);
    console.log('');

    try {
      const reportData = await runCollect(collectorConfig);

      if (options.json) {
        await saveReportData(reportData, path.resolve(options.json));
      }

      const history = loadHistoryReportsSync(appConfig.storage.historyDir);
      const wordCloudUrl = buildWordCloudChart(
        reportData.analysis.keywords,
        appConfig,
      );
      const trendUrl = buildTrendChart(history, appConfig);
      (reportData as any).charts = {
        wordCloudUrl: wordCloudUrl || undefined,
        trendUrl: trendUrl || undefined,
      };

      const outPath = path.resolve(options.output);
      if (options.format === 'csv') {
        new CsvReporter().generate(
          reportData,
          outPath.endsWith('.csv')
            ? outPath
            : outPath.replace(/\.md$/, '') + '.csv',
        );
      } else {
        new MarkdownReporter().generate(reportData, outPath);
      }
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
  .requiredOption(
    '-K, --keywords <keywords>',
    'Comma-separated keywords (e.g. "AI agent memory,LLM tools,AI automation")',
  )
  .option('-s, --source <source>', 'Source: reddit | hackernews | trustpilot')
  .option('-l, --limit <number>', 'Max posts per keyword')
  .option('-r, --subreddits <list>', 'Comma-separated subreddits (reddit only)')
  .option('-t, --translate', 'Enable LLM translation and summarization for top demands')
  .option('-m, --mock', 'Use mock translator (only works if --translate is also set)')
  .option('-o, --output <path>', 'Output report file path', './reports/batch-report.md')
  .action(async (options) => {
    const appConfig: AppConfig = loadConfig();
    const keywords = (options.keywords as string)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const source: string = options.source || appConfig.defaults.source;
    const limit: number = options.limit
      ? parseInt(options.limit, 10)
      : appConfig.defaults.limit;
    const subreddits: string[] = options.subreddits
      ? (options.subreddits as string)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    if (keywords.length === 0) {
      console.error('Error: --keywords must contain at least one keyword.');
      process.exit(1);
    }

    console.log('');
    console.log(`Keywords   : ${keywords.join(' | ')}`);
    console.log(`Source     : ${source}`);
    console.log(`Limit/kw   : ${limit}`);
    console.log(
      `Subreddits : ${subreddits.length ? subreddits.join(', ') : '(all)'}`,
    );
    console.log(
      `Translate  : ${
        options.translate ? 'Yes' : 'No'
      }${options.translate && options.mock ? ' (Mock)' : ''}`,
    );
    console.log(`Output     : ${options.output}`);
    console.log('');

    if (source !== 'reddit' && source !== 'hackernews') {
      console.error(
        `Unsupported source: "${source}". Use reddit or hackernews.`,
      );
      process.exit(1);
    }

    try {
      const batchData = await runBatch(keywords, {
        source,
        limit,
        subreddits,
      });

      console.log('\nGenerating batch comparison report...');
      const reporter = new BatchMarkdownReporter();
      const outputPath = path.resolve(options.output);
      reporter.generate(batchData, outputPath);

      console.log('Done!');
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── report 子命令 ────────────────────────────────────────────────────
program
  .command('report')
  .description('Generate report from JSON saved by collect --json')
  .requiredOption('-i, --input <path>', 'Input JSON file (from collect -j)')
  .option('-o, --output <path>', 'Output report path', './reports/report.md')
  .option('-f, --format <format>', 'Format: md | csv', 'md')
  .action(async (options) => {
    try {
      const inputPath = path.resolve(options.input);
      const outPath = options.output ? path.resolve(options.output) : undefined;
      await runReport(inputPath, outPath, options.format);
      console.log('Done!');
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── schedule 子命令 ─────────────────────────────────────────────────--
program
  .command('schedule')
  .description('Run scheduled batch reports based on config.yaml')
  .option('--stop', 'Stop running scheduler')
  .action(async (options) => {
    try {
      if (options.stop) {
        await stopScheduler();
      } else {
        await startScheduler();
      }
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

export { program };
