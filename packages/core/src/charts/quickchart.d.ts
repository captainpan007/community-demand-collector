import type { AppConfig, KeywordMap, StoredReportData } from '../types';
export declare function buildWordCloudChart(keywords: KeywordMap | Record<string, number>, configOverride?: Partial<AppConfig>): string;
export declare function buildTrendChart(historyReports: StoredReportData[], configOverride?: Partial<AppConfig>): string;
//# sourceMappingURL=quickchart.d.ts.map