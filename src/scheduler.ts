import * as fs from 'fs';
import * as path from 'path';
import cron from 'node-cron';
import { AppConfig } from './config';
import { KeywordAnalyzer } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';
import { BatchMarkdownReporter } from './reporters/batch-markdown';
import { CsvReporter } from './reporters/csv';
import { createTranslator } from './translators';
import { saveReportData, loadReportData, loadHistoryReports, saveHistoryReport } from './storage';
import { buildWordCloudChart, buildTrendChart } from './charts/quickchart';
import { sendReportEmail } from './notifications/email';
import { CollectorConfig, AnalysisResult, BatchReportData } from './types';
import { RedditCollector } from './collectors/reddit';
import { HackerNewsCollector } from './collectors/hackernews';

const PID_FILE = path.resolve('.scheduler.pid');

export function startScheduler(config: AppConfig): void {
  if (!config.schedule.enabled) {
    console.log('[schedule] Disabled in config.yaml (schedule.enabled = false)');
    return;
  }

  fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

  if (config.schedule.cronDaily) {
    cron.schedule(config.schedule.cronDaily, () => {
      runBatchOnce(config, 'daily').catch((e) => console.error('[schedule] daily task failed', e));
    });
    console.log(`[schedule] Daily cron: ${config.schedule.cronDaily}`);
  }

  if (config.schedule.cronWeekly) {
    cron.schedule(config.schedule.cronWeekly, () => {
      runBatchOnce(config, 'weekly').catch((e) => console.error('[schedule] weekly task failed', e));
    });
    console.log(`[schedule] Weekly cron: ${config.schedule.cronWeekly}`);
  }

  console.log('[schedule] Scheduler started. Press Ctrl+C to exit.');
}

export async function stopScheduler(): Promise<void> {
  if (!fs.existsSync(PID_FILE)) {
    console.log('[schedule] No scheduler pid file found.');
    return;
  }
  const pid = Number(fs.readFileSync(PID_FILE, 'utf-8'));
  if (!pid) {
    console.log('[schedule] Invalid pid in file.');
    return;
  }
  try {
    process.kill(pid);
    fs.unlinkSync(PID_FILE);
    console.log(`[schedule] Stopped scheduler process ${pid}.`);
  } catch (e) {
    console.error('[schedule] Failed to stop scheduler:', (e as Error).message);
  }
}

async function runBatchOnce(config: AppConfig, tag: 'daily' | 'weekly'): Promise<void> {
  const keywords = config.defaults.keywords.length ? config.defaults.keywords : ['AI'];
  const source = config.defaults.source ?? 'hackernews';
  const limit = config.defaults.limit ?? 50;

  console.log(`[schedule] Running ${tag} batch for keywords: ${keywords.join(', ')}`);

  const analyzer = new KeywordAnalyzer();
  const ranker = new DemandRanker();
  const results: BatchReportData['results'] = [];

  for (const keyword of keywords) {
    const collectorConfig: CollectorConfig = {
      keyword,
      source,
      limit,
      subreddits: [],
    };
    const collector =
      source === 'hackernews'
        ? new HackerNewsCollector(collectorConfig)
        : new RedditCollector(collectorConfig);

    const posts = await collector.collect();
    const keywordsMap = analyzer.analyze(posts, 30);
    let topDemands = ranker.rank(posts, Math.min(10, posts.length));

    const shouldTranslate = false;
    if (shouldTranslate) {
      topDemands = await createTranslator({ mock: false }).translate(topDemands);
    }

    const analysis: AnalysisResult = {
      totalPosts: posts.length,
      keywords: keywordsMap,
      topDemands,
      summary: `Collected ${posts.length} posts for "${keyword}" from ${source}.`,
    };

    results.push({ keyword, posts, analysis });
  }

  const batchData: BatchReportData = {
    keywords,
    source,
    subreddits: [],
    limit,
    results,
    generatedAt: new Date(),
  };

  const historyDir = config.storage.historyDir;
  const historyReportPath = path.resolve(
    historyDir,
    `${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.json`,
  );
  saveReportData(
    {
      config: {
        keyword: keywords.join(','),
        source,
        limit,
        subreddits: [],
      },
      analysis: {
        totalPosts: results.reduce((sum, r) => sum + r.analysis.totalPosts, 0),
        keywords: results[0]?.analysis.keywords ?? new Map(),
        topDemands: results.flatMap((r) => r.analysis.topDemands).slice(0, 10),
        summary: `Scheduled ${tag} batch for keywords: ${keywords.join(', ')}`,
      },
      generatedAt: batchData.generatedAt,
    },
    historyReportPath,
  );

  const storedHistory = loadHistoryReports(historyDir);
  const latest = loadReportData(historyReportPath);
  const wordCloudUrl = await buildWordCloudChart(latest.analysis.keywords, config);
  const trendUrl = await buildTrendChart(storedHistory, config);

  (latest as any).charts = {
    wordCloudUrl: wordCloudUrl ?? undefined,
    trendUrl: trendUrl ?? undefined,
  };
  saveHistoryReport(latest, historyReportPath);

  const mdReporter = new MarkdownReporter();
  const csvReporter = new CsvReporter();
  const batchReporter = new BatchMarkdownReporter();

  const reportsDir = path.resolve('./reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const baseName = `scheduled-${tag}-${new Date().toISOString().slice(0, 10)}`;
  mdReporter.generate(latest, path.join(reportsDir, `${baseName}.md`));
  csvReporter.generate(latest, path.join(reportsDir, `${baseName}.csv`));
  batchReporter.generate(batchData, path.join(reportsDir, `${baseName}-batch.md`));

  await sendReportEmail(config, {
    subject: `[Community Demand] ${tag} report generated`,
    text: `Scheduled ${tag} report generated for keywords: ${keywords.join(', ')}`,
  });
}

