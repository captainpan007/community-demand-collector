"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
exports.stopScheduler = stopScheduler;
exports.runBatchOnce = runBatchOnce;
const node_cron_1 = __importDefault(require("node-cron"));
const fsSync = __importStar(require("fs"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./config");
const reddit_1 = require("./collectors/reddit");
const hackernews_1 = require("./collectors/hackernews");
const trustpilot_1 = require("./collectors/trustpilot");
const keyword_counter_1 = require("./analyzers/keyword-counter");
const demand_ranker_1 = require("./analyzers/demand-ranker");
const markdown_1 = require("./reporters/markdown");
const csv_1 = require("./reporters/csv");
const batch_markdown_1 = require("./reporters/batch-markdown");
const storage_1 = require("./storage");
const quickchart_1 = require("./charts/quickchart");
const email_1 = require("./notifications/email");
const PID_FILE = path.join(process.cwd(), '.scheduler.pid');
function mergeAppConfig(base, override) {
    if (!override)
        return base;
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
async function startScheduler(override) {
    const base = (0, config_1.getConfig)();
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
        }
        catch {
            // ignore
        }
    }
    await fs_1.promises.writeFile(PID_FILE, String(process.pid), 'utf-8');
    const { cronDaily, cronWeekly } = config.schedule;
    if (cronDaily) {
        if (!node_cron_1.default.validate(cronDaily)) {
            console.error(`[schedule] Invalid cronDaily expression: ${cronDaily}`);
        }
        else {
            node_cron_1.default.schedule(cronDaily, () => {
                runBatchOnce('daily', config).catch((e) => console.error('[schedule] daily task failed', e));
            });
            console.log(`[schedule] Daily cron: ${cronDaily}`);
        }
    }
    if (cronWeekly) {
        if (!node_cron_1.default.validate(cronWeekly)) {
            console.error(`[schedule] Invalid cronWeekly expression: ${cronWeekly}`);
        }
        else {
            node_cron_1.default.schedule(cronWeekly, () => {
                runBatchOnce('weekly', config).catch((e) => console.error('[schedule] weekly task failed', e));
            });
            console.log(`[schedule] Weekly cron: ${cronWeekly}`);
        }
    }
    console.log('[schedule] Scheduler started. Press Ctrl+C to exit.');
}
async function stopScheduler() {
    if (!fsSync.existsSync(PID_FILE)) {
        console.log('[schedule] No scheduler pid file found.');
        return;
    }
    try {
        const raw = await fs_1.promises.readFile(PID_FILE, 'utf-8');
        const pid = Number(raw.trim());
        if (!pid) {
            console.log('[schedule] Invalid pid in file.');
        }
        else {
            try {
                process.kill(pid, 'SIGTERM');
                console.log(`[schedule] Stopped scheduler process ${pid}.`);
            }
            catch (e) {
                console.error(`[schedule] Failed to stop scheduler process ${pid}:`, e.message);
            }
        }
    }
    catch (e) {
        console.error('[schedule] Failed to read pid file:', e.message);
    }
    try {
        await fs_1.promises.unlink(PID_FILE);
    }
    catch {
        // ignore
    }
}
function buildCollector(config) {
    if (config.source === 'hackernews')
        return new hackernews_1.HackerNewsCollector(config);
    if (config.source === 'trustpilot')
        return new trustpilot_1.TrustpilotCollector(config);
    return new reddit_1.RedditCollector(config);
}
async function runBatchOnce(tag, override) {
    const base = (0, config_1.getConfig)();
    const appCfg = mergeAppConfig(base, override);
    const keywords = appCfg.defaults.keywords.length > 0 ? appCfg.defaults.keywords : ['AI'];
    const source = appCfg.defaults.source;
    const limit = appCfg.defaults.limit;
    console.log(`[schedule] Running ${tag} batch for keywords: ${keywords.join(', ')}`);
    const analyzer = new keyword_counter_1.KeywordAnalyzer();
    const ranker = new demand_ranker_1.DemandRanker();
    const results = [];
    for (const keyword of keywords) {
        const collectorConfig = {
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
        const analysis = {
            totalPosts: posts.length,
            keywords: keywordsMap,
            topDemands,
            summary: `Collected ${posts.length} posts for "${keyword}" from ${source}.`,
        };
        results.push({ keyword, posts, analysis });
    }
    const batchData = {
        keywords,
        source,
        subreddits: [],
        limit,
        results,
        generatedAt: new Date(),
    };
    const totalPosts = results.reduce((sum, r) => sum + r.analysis.totalPosts, 0);
    const mergedKeywords = results.length > 0 ? results[0].analysis.keywords : new Map();
    const mergedTopDemands = results
        .flatMap((r) => r.analysis.topDemands)
        .slice(0, 10);
    const latest = {
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
    const historyBefore = await (0, storage_1.loadHistoryReports)();
    const wordCloudUrl = (0, quickchart_1.buildWordCloudChart)(latest.analysis.keywords, appCfg);
    const trendUrl = (0, quickchart_1.buildTrendChart)(historyBefore, appCfg);
    latest.charts = {
        wordCloudUrl: wordCloudUrl || undefined,
        trendUrl: trendUrl || undefined,
    };
    const historyPath = await (0, storage_1.saveHistoryReport)(latest);
    const mdReporter = new markdown_1.MarkdownReporter();
    const csvReporter = new csv_1.CsvReporter();
    const batchReporter = new batch_markdown_1.BatchMarkdownReporter();
    const reportsDir = path.resolve('./reports');
    if (!fsSync.existsSync(reportsDir)) {
        await fs_1.promises.mkdir(reportsDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseName = `scheduled-${tag}-${dateStr}`;
    mdReporter.generate(latest, path.join(reportsDir, `${baseName}.md`));
    csvReporter.generate(latest, path.join(reportsDir, `${baseName}.csv`));
    batchReporter.generate(batchData, path.join(reportsDir, `${baseName}-batch.md`));
    console.log(`[schedule] History saved to ${historyPath}`);
    await (0, email_1.sendReportEmail)(appCfg, {
        subject: `[Community Demand] ${tag} report generated`,
        text: `Scheduled ${tag} report generated for keywords: ${keywords.join(', ')}`,
    });
}
//# sourceMappingURL=scheduler.js.map