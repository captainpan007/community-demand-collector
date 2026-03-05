import * as fs from 'fs';
import * as path from 'path';
import { ReportData, StoredReportData, Post } from './types';

export function saveReportData(data: ReportData, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stored: StoredReportData = {
    config: data.config,
    analysis: {
      totalPosts: data.analysis.totalPosts,
      keywords: [...data.analysis.keywords.entries()],
      topDemands: data.analysis.topDemands,
      summary: data.analysis.summary,
    },
    generatedAt: data.generatedAt.toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(stored, null, 2), 'utf-8');
}

export function loadReportData(filePath: string): ReportData {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const stored: StoredReportData = JSON.parse(raw);
  const topDemands: Post[] = stored.analysis.topDemands.map((p) => ({
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
  };
}

export function loadHistoryReports(historyDir: string): StoredReportData[] {
  if (!fs.existsSync(historyDir)) return [];
  const files = fs
    .readdirSync(historyDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(historyDir, f));
  const all: StoredReportData[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as StoredReportData;
      all.push(parsed);
    } catch {
      // ignore broken file
    }
  }
  all.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
  return all;
}

export function saveHistoryReport(data: ReportData, filePath: string): void {
  saveReportData(data, filePath);
}

