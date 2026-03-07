// ── 平台标识 ──────────────────────────────────────────────────────────

export type Platform = 'reddit' | 'hackernews' | 'trustpilot' | 'amazon' | 'tiktokshop' | 'shopee';

// ── 采集器配置 ────────────────────────────────────────────────────────

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

// ── 帖子数据结构 ──────────────────────────────────────────────────────

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

// ── 分析相关类型 ──────────────────────────────────────────────────────

export type KeywordMap = Map<string, number>;
export type KeywordRecord = Record<string, number>;
export type TFIDFResult = KeywordMap;

export interface AnalysisResult {
  totalPosts: number;
  keywords: KeywordMap;
  topDemands: Post[];
  summary: string;
}

// ── 报告数据 ──────────────────────────────────────────────────────────

export interface ReportData {
  config: CollectorConfig;
  analysis: AnalysisResult;
  generatedAt: Date;
  charts?: {
    wordCloudUrl?: string;
    trendUrl?: string;
  };
}

// ── 批量采集结果（单个关键词） ────────────────────────────────────────

export interface BatchKeywordResult {
  keyword: string;
  posts: Post[];
  analysis: AnalysisResult;
}

// ── 批量报告数据 ──────────────────────────────────────────────────────

export interface BatchReportData {
  keywords: string[];
  source: Platform;
  subreddits: string[];
  limit: number;
  results: BatchKeywordResult[];
  generatedAt: Date;
}

// ── 可持久化的报告数据（JSON 序列化用）────────────────────────────────

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

// ── 采集器错误类型 ────────────────────────────────────────────────────

export class CollectorError extends Error {
  constructor(
    message: string,
    public readonly platform: Platform,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CollectorError';
  }
}

// ── AppConfig 类型（来自 config 模块）────────────────────────────────

export type { AppConfig } from '../config';

