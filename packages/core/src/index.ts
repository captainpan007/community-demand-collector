import { loadConfig, getConfig, AppConfig } from './config';
import {
  CollectorConfig,
  AnalysisResult,
  ReportData,
  BatchReportData,
  BatchKeywordResult,
  StoredReportData,
  Post,
  Platform,
} from './types';
import { RedditCollector } from './collectors/reddit';
import { HackerNewsCollector } from './collectors/hackernews';
import { TrustpilotCollector } from './collectors/trustpilot';
import { AmazonCollector } from './collectors/amazon';
import { KeywordAnalyzer } from './analyzers/keyword-counter';
import { DemandRanker } from './analyzers/demand-ranker';
import { MarkdownReporter } from './reporters/markdown';
import { BatchMarkdownReporter } from './reporters/batch-markdown';
import { CsvReporter } from './reporters/csv';
import { createTranslator } from './translators';
import {
  saveReportData,
  loadReportData,
  loadHistoryReports as loadHistoryReportsSync,
  saveHistoryReport,
} from './storage';
import {
  buildWordCloudChart as buildWordCloudChartInternal,
  buildTrendChart as buildTrendChartInternal,
} from './charts/quickchart';
import {
  startScheduler as startSchedulerInternal,
  stopScheduler as stopSchedulerInternal,
} from './scheduler';

function buildCollector(config: CollectorConfig) {
  if (config.source === 'hackernews') {
    return new HackerNewsCollector(config);
  }
  if (config.source === 'trustpilot') {
    return new TrustpilotCollector(config);
  }
  if (config.source === 'amazon') {
    return new AmazonCollector(config);
  }
  return new RedditCollector(config);
}

function mergeCollectorConfig(
  base: CollectorConfig,
  override?: Partial<CollectorConfig>,
): CollectorConfig {
  if (!override) return base;
  return {
    keyword: override.keyword ?? base.keyword,
    source: override.source ?? base.source,
    limit: override.limit ?? base.limit,
    subreddits: override.subreddits ?? base.subreddits,
  };
}

export async function runCollect(
  override?: Partial<CollectorConfig>,
): Promise<ReportData> {
  const appCfg = getConfig();
  const baseConfig: CollectorConfig = {
    keyword: override?.keyword ?? appCfg.defaults.keywords[0] ?? 'AI',
    source: override?.source ?? appCfg.defaults.source,
    limit: override?.limit ?? appCfg.defaults.limit,
    subreddits: override?.subreddits ?? [],
    mock: override?.mock ?? false,
  };

  const collector = buildCollector(baseConfig);
  const posts = await collector.collect();

  const analyzer = new KeywordAnalyzer();
  const ranker = new DemandRanker();

  const keywords = analyzer.analyze(posts, 30);
  let topDemands = ranker.rank(posts, posts.length);

  if (override?.translate) {
    const translator = createTranslator({ mock: override?.mock ?? false });
    topDemands = await translator.translate(topDemands);
  }

  const analysis: AnalysisResult = {
    totalPosts: posts.length,
    keywords,
    topDemands,
    summary: `Collected ${posts.length} posts for "${baseConfig.keyword}" from ${baseConfig.source}.`,
  };

  const report: ReportData = {
    config: baseConfig,
    analysis,
    generatedAt: new Date(),
  };

  return report;
}

export async function runBatch(
  keywords: string[],
  override?: Partial<CollectorConfig>,
): Promise<BatchReportData> {
  const appCfg = getConfig();
  const source = override?.source ?? appCfg.defaults.source;
  const limit = override?.limit ?? appCfg.defaults.limit;
  const subreddits = override?.subreddits ?? [];

  const analyzer = new KeywordAnalyzer();
  const ranker = new DemandRanker();
  const results: BatchKeywordResult[] = [];

  for (const keyword of keywords) {
    const config: CollectorConfig = { keyword, source, limit, subreddits };
    const collector = buildCollector(config);
    const posts = await collector.collect();

    const keywordsMap = analyzer.analyze(posts, 30);
    let topDemands = ranker.rank(posts, Math.min(10, posts.length));

    // runBatch 默认不做翻译，由调用方决定是否使用 Translator
    const analysis: AnalysisResult = {
      totalPosts: posts.length,
      keywords: keywordsMap,
      topDemands,
      summary: `Collected ${posts.length} posts for "${keyword}" from ${source}.`,
    };

    results.push({ keyword, posts, analysis });
  }

  return {
    keywords,
    source,
    subreddits,
    limit,
    results,
    generatedAt: new Date(),
  };
}

export async function runReport(
  inputJsonPath: string,
  outputPath?: string,
  format: 'md' | 'csv' = 'md',
): Promise<ReportData> {
  const appCfg = getConfig();
  const data = await loadReportData(inputJsonPath);
  const history = await loadHistoryReportsSync(appCfg.storage.historyDir);

  const wordCloudUrl = await buildWordCloudChartInternal(data.analysis.keywords, appCfg);
  const trendUrl = await buildTrendChartInternal(history, appCfg);
  (data as any).charts = {
    wordCloudUrl: wordCloudUrl ?? undefined,
    trendUrl: trendUrl ?? undefined,
  };

  if (outputPath) {
    if (format === 'csv') {
      const reporter = new CsvReporter();
      reporter.generate(
        data,
        outputPath.endsWith('.csv') ? outputPath : outputPath.replace(/\.md$/, '') + '.csv',
      );
    } else {
      const reporter = new MarkdownReporter();
      reporter.generate(data, outputPath);
    }
  }

  return data;
}

export function startScheduler(
  override?: Partial<AppConfig>,
): void {
  const base = loadConfig();
  const merged: AppConfig = {
    ...base,
    ...override,
    defaults: {
      ...base.defaults,
      ...(override?.defaults ?? {}),
    },
    schedule: {
      ...base.schedule,
      ...(override?.schedule ?? {}),
    },
    notifications: {
      ...base.notifications,
      ...(override?.notifications ?? {}),
    },
    quickChart: {
      ...base.quickChart,
      ...(override?.quickChart ?? {}),
    },
    storage: {
      ...base.storage,
      ...(override?.storage ?? {}),
    },
  };
  startSchedulerInternal(merged);
}

export function stopScheduler(): Promise<void> {
  return stopSchedulerInternal();
}

export function buildWordCloudChart(
  keywords: Map<string, number> | Record<string, number>,
  config?: AppConfig,
): string | null {
  const appCfg = config ?? getConfig();
  const map =
    keywords instanceof Map ? keywords : new Map(Object.entries(keywords));
  return buildWordCloudChartInternal(map, appCfg) || null;
}

export function buildTrendChart(
  historyReports: StoredReportData[],
  config?: AppConfig,
): string | null {
  const appCfg = config ?? getConfig();
  return buildTrendChartInternal(historyReports, appCfg) || null;
}

export async function loadHistoryReports(
  historyDir: string,
): Promise<StoredReportData[]> {
  return loadHistoryReportsSync(historyDir);
}

// re-export config helpers & types
export { loadConfig, getConfig };
export type {
  AppConfig,
  CollectorConfig,
  AnalysisResult,
  ReportData,
  BatchReportData,
  BatchKeywordResult,
  StoredReportData,
  Post,
  Platform,
};

// re-export storage helpers
export {
  saveReportData,
  loadReportData,
  loadHistoryReportsSync,
  saveHistoryReport,
};

// re-export reporters & translator factory for advanced callers
export {
  MarkdownReporter,
  CsvReporter,
  BatchMarkdownReporter,
  createTranslator,
};

