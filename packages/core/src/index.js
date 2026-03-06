"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTranslator = exports.BatchMarkdownReporter = exports.CsvReporter = exports.MarkdownReporter = exports.saveHistoryReport = exports.loadHistoryReportsSync = exports.loadReportData = exports.saveReportData = exports.getConfig = exports.loadConfig = void 0;
exports.runCollect = runCollect;
exports.runBatch = runBatch;
exports.runReport = runReport;
exports.startScheduler = startScheduler;
exports.stopScheduler = stopScheduler;
exports.buildWordCloudChart = buildWordCloudChart;
exports.buildTrendChart = buildTrendChart;
exports.loadHistoryReports = loadHistoryReports;
const config_1 = require("./config");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_1.loadConfig; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return config_1.getConfig; } });
const reddit_1 = require("./collectors/reddit");
const hackernews_1 = require("./collectors/hackernews");
const trustpilot_1 = require("./collectors/trustpilot");
const amazon_1 = require("./collectors/amazon");
const tiktokshop_1 = require("./collectors/tiktokshop");
const shopee_1 = require("./collectors/shopee");
const keyword_counter_1 = require("./analyzers/keyword-counter");
const demand_ranker_1 = require("./analyzers/demand-ranker");
const markdown_1 = require("./reporters/markdown");
Object.defineProperty(exports, "MarkdownReporter", { enumerable: true, get: function () { return markdown_1.MarkdownReporter; } });
const batch_markdown_1 = require("./reporters/batch-markdown");
Object.defineProperty(exports, "BatchMarkdownReporter", { enumerable: true, get: function () { return batch_markdown_1.BatchMarkdownReporter; } });
const csv_1 = require("./reporters/csv");
Object.defineProperty(exports, "CsvReporter", { enumerable: true, get: function () { return csv_1.CsvReporter; } });
const translators_1 = require("./translators");
Object.defineProperty(exports, "createTranslator", { enumerable: true, get: function () { return translators_1.createTranslator; } });
const storage_1 = require("./storage");
Object.defineProperty(exports, "saveReportData", { enumerable: true, get: function () { return storage_1.saveReportData; } });
Object.defineProperty(exports, "loadReportData", { enumerable: true, get: function () { return storage_1.loadReportData; } });
Object.defineProperty(exports, "loadHistoryReportsSync", { enumerable: true, get: function () { return storage_1.loadHistoryReports; } });
Object.defineProperty(exports, "saveHistoryReport", { enumerable: true, get: function () { return storage_1.saveHistoryReport; } });
const quickchart_1 = require("./charts/quickchart");
const scheduler_1 = require("./scheduler");
function buildCollector(config) {
    if (config.source === 'hackernews') {
        return new hackernews_1.HackerNewsCollector(config);
    }
    if (config.source === 'trustpilot') {
        return new trustpilot_1.TrustpilotCollector(config);
    }
    if (config.source === 'amazon') {
        return new amazon_1.AmazonCollector(config);
    }
    if (config.source === 'tiktokshop') {
        return new tiktokshop_1.TikTokShopCollector(config);
    }
    if (config.source === 'shopee') {
        return new shopee_1.ShopeeCollector(config);
    }
    return new reddit_1.RedditCollector(config);
}
function mergeCollectorConfig(base, override) {
    if (!override)
        return base;
    return {
        keyword: override.keyword ?? base.keyword,
        source: override.source ?? base.source,
        limit: override.limit ?? base.limit,
        subreddits: override.subreddits ?? base.subreddits,
    };
}
async function runCollect(override) {
    const appCfg = (0, config_1.getConfig)();
    const baseConfig = {
        keyword: override?.keyword ?? appCfg.defaults.keywords[0] ?? 'AI',
        source: override?.source ?? appCfg.defaults.source,
        limit: override?.limit ?? appCfg.defaults.limit,
        subreddits: override?.subreddits ?? [],
        mock: override?.mock ?? false,
    };
    const collector = buildCollector(baseConfig);
    const posts = await collector.collect();
    const analyzer = new keyword_counter_1.KeywordAnalyzer();
    const ranker = new demand_ranker_1.DemandRanker();
    const keywords = analyzer.analyze(posts, 30);
    let topDemands = ranker.rank(posts, posts.length);
    if (override?.translate) {
        const translator = (0, translators_1.createTranslator)({ mock: override?.mock ?? false });
        topDemands = await translator.translate(topDemands);
    }
    const analysis = {
        totalPosts: posts.length,
        keywords,
        topDemands,
        summary: `Collected ${posts.length} posts for "${baseConfig.keyword}" from ${baseConfig.source}.`,
    };
    const report = {
        config: baseConfig,
        analysis,
        generatedAt: new Date(),
    };
    return report;
}
async function runBatch(keywords, override) {
    const appCfg = (0, config_1.getConfig)();
    const source = override?.source ?? appCfg.defaults.source;
    const limit = override?.limit ?? appCfg.defaults.limit;
    const subreddits = override?.subreddits ?? [];
    const analyzer = new keyword_counter_1.KeywordAnalyzer();
    const ranker = new demand_ranker_1.DemandRanker();
    const results = [];
    for (const keyword of keywords) {
        const config = { keyword, source, limit, subreddits };
        const collector = buildCollector(config);
        const posts = await collector.collect();
        const keywordsMap = analyzer.analyze(posts, 30);
        let topDemands = ranker.rank(posts, Math.min(10, posts.length));
        // runBatch 默认不做翻译，由调用方决定是否使用 Translator
        const analysis = {
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
async function runReport(inputJsonPath, outputPath, format = 'md') {
    const appCfg = (0, config_1.getConfig)();
    const data = (0, storage_1.loadReportData)(inputJsonPath);
    const history = (0, storage_1.loadHistoryReports)(appCfg.storage.historyDir);
    const wordCloudUrl = await (0, quickchart_1.buildWordCloudChart)(data.analysis.keywords, appCfg);
    const trendUrl = await (0, quickchart_1.buildTrendChart)(history, appCfg);
    data.charts = {
        wordCloudUrl: wordCloudUrl ?? undefined,
        trendUrl: trendUrl ?? undefined,
    };
    if (outputPath) {
        if (format === 'csv') {
            const reporter = new csv_1.CsvReporter();
            reporter.generate(data, outputPath.endsWith('.csv') ? outputPath : outputPath.replace(/\.md$/, '') + '.csv');
        }
        else {
            const reporter = new markdown_1.MarkdownReporter();
            reporter.generate(data, outputPath);
        }
    }
    return data;
}
function startScheduler(override) {
    const base = (0, config_1.loadConfig)();
    const merged = {
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
    (0, scheduler_1.startScheduler)(merged);
}
function stopScheduler() {
    return (0, scheduler_1.stopScheduler)();
}
function buildWordCloudChart(keywords, config) {
    const appCfg = config ?? (0, config_1.getConfig)();
    const map = keywords instanceof Map ? keywords : new Map(Object.entries(keywords));
    return (0, quickchart_1.buildWordCloudChart)(map, appCfg);
}
function buildTrendChart(historyReports, config) {
    const appCfg = config ?? (0, config_1.getConfig)();
    return (0, quickchart_1.buildTrendChart)(historyReports, appCfg);
}
async function loadHistoryReports(historyDir) {
    return (0, storage_1.loadHistoryReports)(historyDir);
}
//# sourceMappingURL=index.js.map