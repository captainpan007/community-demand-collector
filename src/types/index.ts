// ── 平台标识（字符串枚举，便于后续新增平台）────────────────────────────
export type Platform = 'reddit' | 'twitter' | 'xiaohongshu' | string;

// ── 采集器配置 ────────────────────────────────────────────────────────
export interface CollectorConfig {
  keyword: string;
  limit: number;
  source: Platform;
  /** 仅搜索指定 subreddit 列表（Reddit 专用，为空则全站搜索） */
  subreddits?: string[];
}

// ── 统一的帖子数据结构 ─────────────────────────────────────────────────
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
}

// ── 分析结果 ──────────────────────────────────────────────────────────
export interface AnalysisResult {
  totalPosts: number;
  keywords: Map<string, number>;
  topDemands: Post[];
  summary: string;
}

// ── 报告数据 ──────────────────────────────────────────────────────────
export interface ReportData {
  config: CollectorConfig;
  analysis: AnalysisResult;
  generatedAt: Date;
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
