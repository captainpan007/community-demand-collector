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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReportData = saveReportData;
exports.loadReportData = loadReportData;
exports.saveHistoryReport = saveHistoryReport;
exports.loadHistoryReports = loadHistoryReports;
exports.loadHistoryReportsSync = loadHistoryReportsSync;
const fsSync = __importStar(require("fs"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./config");
async function saveReportData(data, filePath) {
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
        await fs_1.promises.mkdir(dir, { recursive: true });
    }
    const stored = {
        config: data.config,
        analysis: {
            totalPosts: data.analysis.totalPosts,
            keywords: [...data.analysis.keywords.entries()],
            topDemands: data.analysis.topDemands,
            summary: data.analysis.summary,
        },
        generatedAt: data.generatedAt.toISOString(),
        charts: data.charts ? { ...data.charts } : undefined,
    };
    await fs_1.promises.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');
}
async function loadReportData(filePath) {
    const raw = await fs_1.promises.readFile(filePath, 'utf-8');
    const stored = JSON.parse(raw);
    const topDemands = stored.analysis.topDemands.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt ?? stored.generatedAt),
    }));
    return {
        config: stored.config,
        analysis: {
            totalPosts: stored.analysis.totalPosts,
            keywords: new Map(stored.analysis.keywords),
            topDemands,
            summary: stored.analysis.summary,
        },
        generatedAt: new Date(stored.generatedAt),
        charts: stored.charts ? { ...stored.charts } : undefined,
    };
}
async function saveHistoryReport(data, historyDir) {
    const cfg = (0, config_1.getConfig)();
    const dir = historyDir ?? cfg.storage.historyDir;
    const resolvedDir = path.resolve(dir);
    if (!fsSync.existsSync(resolvedDir)) {
        await fs_1.promises.mkdir(resolvedDir, { recursive: true });
    }
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fullPath = path.join(resolvedDir, filename);
    await saveReportData(data, fullPath);
    return fullPath;
}
async function loadHistoryReports(historyDir) {
    const cfg = (0, config_1.getConfig)();
    const dir = historyDir ?? cfg.storage.historyDir;
    const resolvedDir = path.resolve(dir);
    if (!fsSync.existsSync(resolvedDir))
        return [];
    const files = (await fs_1.promises.readdir(resolvedDir))
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(resolvedDir, f));
    const all = [];
    for (const file of files) {
        try {
            const raw = await fs_1.promises.readFile(file, 'utf-8');
            const parsed = JSON.parse(raw);
            all.push(parsed);
        }
        catch {
            // ignore broken file
        }
    }
    all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return all;
}
function loadHistoryReportsSync(historyDir) {
    const cfg = (0, config_1.getConfig)();
    const dir = historyDir ?? cfg.storage.historyDir;
    const resolvedDir = path.resolve(dir);
    if (!fsSync.existsSync(resolvedDir))
        return [];
    const files = fsSync
        .readdirSync(resolvedDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(resolvedDir, f));
    const all = [];
    for (const file of files) {
        try {
            const raw = fsSync.readFileSync(file, 'utf-8');
            const parsed = JSON.parse(raw);
            all.push(parsed);
        }
        catch {
            // ignore broken file
        }
    }
    all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return all;
}
//# sourceMappingURL=storage.js.map