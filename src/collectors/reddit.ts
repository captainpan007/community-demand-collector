import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base';
import { Post, Platform, CollectorError } from '../types';

/** Reddit /search.json 返回的单条帖子原始结构（只列出我们关心的字段） */
interface RedditChild {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    url: string;
  };
}

export class RedditCollector extends BaseCollector {
  readonly platform: Platform = 'reddit';

  private readonly BASE_URL = 'https://www.reddit.com';

  private readonly client: AxiosInstance = axios.create({
    baseURL: this.BASE_URL,
    timeout: 15000,
    headers: {
      // 使用标准浏览器 UA，避免被 Reddit 拦截返回 403/429
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  // ── fetchRaw：调用 Reddit 免鉴权 JSON API ─────────────────────────

  protected async fetchRaw(): Promise<RedditChild[]> {
    const subreddits = this.config.subreddits ?? [];

    if (subreddits.length === 0) {
      // 全站搜索
      return this.searchGlobal(this.config.keyword, this.config.limit);
    }

    // 每个 subreddit 单独请求，再合并去重、按 score 排序后截取 limit
    this.log(`Subreddit filter: ${subreddits.join(', ')}`);
    const perLimit = Math.ceil(this.config.limit / subreddits.length) + 10;

    const allResults = await Promise.all(
      subreddits.map(sr => this.searchInSubreddit(sr, this.config.keyword, perLimit))
    );

    const merged = allResults.flat();
    // 去重（同一帖子可能被多个 subreddit 查询返回）
    const seen = new Set<string>();
    const deduped = merged.filter(child => {
      if (seen.has(child.data.id)) return false;
      seen.add(child.data.id);
      return true;
    });

    // 按 score 降序，取前 limit 条
    deduped.sort((a, b) => b.data.score - a.data.score);
    return deduped.slice(0, this.config.limit);
  }

  private async searchGlobal(keyword: string, limit: number): Promise<RedditChild[]> {
    this.log(`GET /search.json?q=${encodeURIComponent(keyword)}&limit=${limit}`);
    return this.doSearch('/search.json', keyword, limit);
  }

  private async searchInSubreddit(subreddit: string, keyword: string, limit: number): Promise<RedditChild[]> {
    const path = `/r/${subreddit}/search.json`;
    this.log(`GET ${path}?q=${encodeURIComponent(keyword)}&limit=${limit}`);
    return this.doSearch(path, keyword, limit, true);
  }

  private async doSearch(path: string, keyword: string, limit: number, restrictSr = false): Promise<RedditChild[]> {
    const response = await this.client.get<{ data: { children: RedditChild[] } }>(
      path,
      {
        params: {
          q: keyword,
          limit,
          sort: 'relevance',
          t: 'all',
          type: 'link',
          ...(restrictSr ? { restrict_sr: 'true' } : {}),
        },
      },
    ).catch((err) => {
      const status = err.response?.status;
      const text = err.response?.statusText ?? 'unknown';
      if (status) {
        throw new CollectorError(`Reddit API returned ${status} ${text}`, this.platform, err);
      }
      throw new CollectorError(`Network error: ${err.message}`, this.platform, err);
    });

    return response.data?.data?.children ?? [];
  }

  // ── parsePost：将原始条目映射为统一 Post ──────────────────────────

  protected parsePost(raw: unknown): Post {
    const child = raw as RedditChild;
    const d = child.data;

    return {
      id: d.id,
      title: d.title,
      content: d.selftext ?? '',
      author: d.author,
      url: `${this.BASE_URL}${d.permalink}`,
      score: d.score,
      commentCount: d.num_comments,
      createdAt: new Date(d.created_utc * 1000),
      platform: this.platform,
      raw: d as unknown as Record<string, unknown>,
    };
  }
}
