import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { ReportData, StoredReportData, AppConfig } from './types';
import { getConfig } from './config';

export async function saveReportData(data: ReportData, filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fsSync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  const stored: StoredReportData = {
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

  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');
}

export async function loadReportData(filePath: string): Promise<ReportData> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const stored: StoredReportData = JSON.parse(raw);

  const topDemands = stored.analysis.topDemands.map((p) => ({
    ...p,
    createdAt: new Date((p as any).createdAt ?? stored.generatedAt),
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

export async function saveHistoryReport(
  data: ReportData,
  historyDir?: string,
): Promise<string> {
  const cfg: AppConfig = getConfig();
  const dir = historyDir ?? cfg.storage.historyDir;
  const resolvedDir = path.resolve(dir);
  if (!fsSync.existsSync(resolvedDir)) {
    await fs.mkdir(resolvedDir, { recursive: true });
  }
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fullPath = path.join(resolvedDir, filename);
  await saveReportData(data, fullPath);
  return fullPath;
}

export async function loadHistoryReports(
  historyDir?: string,
): Promise<StoredReportData[]> {
  const cfg: AppConfig = getConfig();
  const dir = historyDir ?? cfg.storage.historyDir;
  const resolvedDir = path.resolve(dir);
  if (!fsSync.existsSync(resolvedDir)) return [];

  const files = (await fs.readdir(resolvedDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(resolvedDir, f));

  const all: StoredReportData[] = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(raw) as StoredReportData;
      all.push(parsed);
    } catch {
      // ignore broken file
    }
  }

  all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return all;
}

export function loadHistoryReportsSync(historyDir?: string): StoredReportData[] {
  const cfg: AppConfig = getConfig();
  const dir = historyDir ?? cfg.storage.historyDir;
  const resolvedDir = path.resolve(dir);
  if (!fsSync.existsSync(resolvedDir)) return [];

  const files = fsSync
    .readdirSync(resolvedDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(resolvedDir, f));

  const all: StoredReportData[] = [];
  for (const file of files) {
    try {
      const raw = fsSync.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as StoredReportData;
      all.push(parsed);
    } catch {
      // ignore broken file
    }
  }

  all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return all;
}

