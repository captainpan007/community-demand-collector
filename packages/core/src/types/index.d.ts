export type Platform = 'reddit' | 'hackernews' | 'trustpilot' | 'amazon';
export interface CollectorConfig {
    keyword: string;
    source: Platform;
    limit: number;
    /** 仅搜索指定 subreddit 列表（Reddit 专用，为空则全站搜索） */
    subreddits?: string[];
    /** 是否启用翻译（CLI 额外使用，可选） */
    translate?: boolean;
    /** 是否使用 Mock 翻译器（CLI 额外使用，可选） */
    mock?: boolean;
    /** 输出路径（CLI 额外使用，可选） */
    output?: string;
    /** 输出格式（md | csv，CLI 额外使用，可选） */
    format?: 'md' | 'csv';
    /** JSON 导出路径（CLI 额外使用，可选） */
    json?: string;
}
export interface Post {
    id: string;
    title: string;
    content: string;
    author: string;
    url: string;
    score: number;
    commentCount: number;
    createdAt: Date;
    platform: Platform;
    /** 平台原始数据，可选保留用于调试或扩展 */
    raw?: Record<string, unknown>;
    /** 中文翻译标题 */
    titleZh?: string;
    /** 深度摘要(中文) */
    summaryZh?: string;
    /** 情感倾向 */
    sentiment?: 'positive' | 'negative' | 'neutral';
    /** 情感得分 -1.0 ~ 1.0 */
    sentimentScore?: number;
    /** 核心痛点列表 */
    painPoints?: string[];
    /** 产品/商业机会列表 */
    opportunities?: string[];
    /** 商业优先级 */
    priority?: 'high' | 'medium' | 'low';
}
export type KeywordMap = Map<string, number>;
export type KeywordRecord = Record<string, number>;
export type TFIDFResult = KeywordMap;
export interface AnalysisResult {
    totalPosts: number;
    keywords: KeywordMap;
    topDemands: Post[];
    summary: string;
}
export interface ReportData {
    config: CollectorConfig;
    analysis: AnalysisResult;
    generatedAt: Date;
    charts?: {
        wordCloudUrl?: string;
        trendUrl?: string;
    };
}
export interface BatchKeywordResult {
    keyword: string;
    posts: Post[];
    analysis: AnalysisResult;
}
export interface BatchReportData {
    keywords: string[];
    source: Platform;
    subreddits: string[];
    limit: number;
    results: BatchKeywordResult[];
    generatedAt: Date;
}
export interface StoredReportData {
    config: CollectorConfig;
    analysis: {
        totalPosts: number;
        keywords: [string, number][];
        topDemands: Post[];
        summary: string;
    };
    generatedAt: string;
    charts?: {
        wordCloudUrl?: string;
        trendUrl?: string;
    };
}
export declare class CollectorError extends Error {
    readonly platform: Platform;
    readonly cause?: unknown | undefined;
    constructor(message: string, platform: Platform, cause?: unknown | undefined);
}
export type { AppConfig } from '../config';
//# sourceMappingURL=index.d.ts.map