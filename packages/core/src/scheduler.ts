import cron from 'node-cron';
import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  AppConfig,
  CollectorConfig,
  AnalysisResult,
  BatchKeywordResult,
  BatchReportData,
  ReportData,
} from './types';
import { getConfig } from './config';
import { RedditCollector } from './collectors/reddit';
import { HackerNewsCollector } from './collectors/hackernews';
import { TrustpilotCollector } from './collectors/trustpilot';
import { KeywordAnalyzer } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';
import { CsvReporter } from './reporters/csv';
import { BatchMarkdownReporter } from './reporters/batch-markdown';
import { saveHistoryReport, loadHistoryReports } from './storage';
import { buildWordCloudChart, buildTrendChart } from './charts/quickchart';
import { sendReportEmail } from './notifications/email';

const PID_FILE = path.join(process.cwd(), '.scheduler.pid');

function mergeAppConfig(base: AppConfig, override?: Partial<AppConfig>): AppConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    defaults: {
      ...base.defaults,
      ...(override.defaults ?? {}),
    },
    schedule: {
      ...base.schedule,
      ...(override.schedule ?? {}),
    },
    notifications: {
      ...base.notifications,
      ...(override.notifications ?? {}),
    },
    quickChart: {
      ...base.quickChart,
      ...(override.quickChart ?? {}),
    },
    storage: {
      ...base.storage,
      ...(override.storage ?? {}),
    },
  };
}

export async function startScheduler(override?: Partial<AppConfig>): Promise<void> {
  const base = getConfig();
  const config = mergeAppConfig(base, override);

  if (!config.schedule.enabled) {
    console.log('[schedule] Disabled in config.yaml (schedule.enabled = false)');
    return;
  }

  // 若已存在 PID 文件，提示但仍覆盖（防止僵尸进程占用）
  if (fsSync.existsSync(PID_FILE)) {
    try {
      const existing = fsSync.readFileSync(PID_FILE, 'utf-8');
      console.log(`[schedule] Existing scheduler pid file found: ${existing.trim()}`);
    } catch {
      // ignore
    }
  }

  await fs.writeFile(PID_FILE, String(process.pid), 'utf-8');

  const { cronDaily, cronWeekly } = config.schedule;

  if (cronDaily) {
    if (!cron.validate(cronDaily)) {
      console.error(`[schedule] Invalid cronDaily expression: ${cronDaily}`);
    } else {
      cron.schedule(cronDaily, () => {
        runBatchOnce('daily', config).catch((e) =>
          console.error('[schedule] daily task failed', e),
        );
      });
      console.log(`[schedule] Daily cron: ${cronDaily}`);
    }
  }

  if (cronWeekly) {
    if (!cron.validate(cronWeekly)) {
      console.error(`[schedule] Invalid cronWeekly expression: ${cronWeekly}`);
    } else {
      cron.schedule(cronWeekly, () => {
        runBatchOnce('weekly', config).catch((e) =>
          console.error('[schedule] weekly task failed', e),
        );
      });
      console.log(`[schedule] Weekly cron: ${cronWeekly}`);
    }
  }

  console.log('[schedule] Scheduler started. Press Ctrl+C to exit.');
}

export async function stopScheduler(): Promise<void> {
  if (!fsSync.existsSync(PID_FILE)) {
    console.log('[schedule] No scheduler pid file found.');
    return;
  }
  try {
    const raw = await fs.readFile(PID_FILE, 'utf-8');
    const pid = Number(raw.trim());
    if (!pid) {
      console.log('[schedule] Invalid pid in file.');
    } else {
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`[schedule] Stopped scheduler process ${pid}.`);
      } catch (e) {
        console.error(
          `[schedule] Failed to stop scheduler process ${pid}:`,
          (e as Error).message,
        );
      }
    }
  } catch (e) {
    console.error('[schedule] Failed to read pid file:', (e as Error).message);
  }

  try {
    await fs.unlink(PID_FILE);
  } catch {
    // ignore
  }
}

function buildCollector(config: CollectorConfig) {
  if (config.source === 'hackernews') return new HackerNewsCollector(config);
  if (config.source === 'trustpilot') return new TrustpilotCollector(config);
  return new RedditCollector(config);
}

export async function runBatchOnce(
  tag: 'daily' | 'weekly',
  override?: Partial<AppConfig>,
): Promise<void> {
  const base = getConfig();
  const appCfg = mergeAppConfig(base, override);

  const keywords =
    appCfg.defaults.keywords.length > 0 ? appCfg.defaults.keywords : ['AI'];
  const source = appCfg.defaults.source;
  const limit = appCfg.defaults.limit;

  console.log(`[schedule] Running ${tag} batch for keywords: ${keywords.join(', ')}`);

  const analyzer = new KeywordAnalyzer();
  const ranker = new DemandRanker();
  const results: BatchKeywordResult[] = [];

  for (const keyword of keywords) {
    const collectorConfig: CollectorConfig = {
      keyword,
      source,
      limit,
      subreddits: [],
    };
    const collector = buildCollector(collectorConfig);
    const posts = await collector.collect();

    const keywordsMap = analyzer.analyze(posts, 30);
    let topDemands = ranker.rank(posts, Math.min(10, posts.length));

    // 调度任务默认不做翻译，如需翻译可在未来增加配置
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

  const totalPosts = results.reduce(
    (sum, r) => sum + r.analysis.totalPosts,
    0,
  );
  const mergedKeywords =
    results.length > 0 ? results[0].analysis.keywords : new Map();
  const mergedTopDemands = results
    .flatMap((r) => r.analysis.topDemands)
    .slice(0, 10);

  const latest: ReportData = {
    config: {
      keyword: keywords.join(','),
      source,
      limit,
      subreddits: [],
    },
    analysis: {
      totalPosts,
      keywords: mergedKeywords,
      topDemands: mergedTopDemands,
      summary: `Scheduled ${tag} batch for keywords: ${keywords.join(', ')}`,
    },
    generatedAt: batchData.generatedAt,
  };

  const historyBefore = await loadHistoryReports();
  const wordCloudUrl = buildWordCloudChart(latest.analysis.keywords, appCfg);
  const trendUrl = buildTrendChart(historyBefore, appCfg);
  latest.charts = {
    wordCloudUrl: wordCloudUrl || undefined,
    trendUrl: trendUrl || undefined,
  };

  const historyPath = await saveHistoryReport(latest);

  const mdReporter = new MarkdownReporter();
  const csvReporter = new CsvReporter();
  const batchReporter = new BatchMarkdownReporter();

  const reportsDir = path.resolve('./reports');
  if (!fsSync.existsSync(reportsDir)) {
    await fs.mkdir(reportsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const baseName = `scheduled-${tag}-${dateStr}`;

  mdReporter.generate(latest, path.join(reportsDir, `${baseName}.md`));
  csvReporter.generate(latest, path.join(reportsDir, `${baseName}.csv`));
  batchReporter.generate(
    batchData,
    path.join(reportsDir, `${baseName}-batch.md`),
  );

  console.log(`[schedule] History saved to ${historyPath}`);

  await sendReportEmail(appCfg, {
    subject: `[Community Demand] ${tag} report generated`,
    text: `Scheduled ${tag} report generated for keywords: ${keywords.join(', ')}`,
  });
}

