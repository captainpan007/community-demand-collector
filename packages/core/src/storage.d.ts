import type { ReportData, StoredReportData } from './types';
export declare function saveReportData(data: ReportData, filePath: string): Promise<void>;
export declare function loadReportData(filePath: string): Promise<ReportData>;
export declare function saveHistoryReport(data: ReportData, historyDir?: string): Promise<string>;
export declare function loadHistoryReports(historyDir?: string): Promise<StoredReportData[]>;
export declare function loadHistoryReportsSync(historyDir?: string): StoredReportData[];
//# sourceMappingURL=storage.d.ts.map