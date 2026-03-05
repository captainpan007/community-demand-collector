import axios from 'axios';
import { BaseCollector } from './base';
import { Post, Platform, CollectorError } from '../types';

interface HNHit {
  objectID: string;
  title: string;
  url?: string;
  story_text?: string;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
}

export class HackerNewsCollector extends BaseCollector {
  readonly platform: Platform = 'hackernews';
  private readonly BASE = 'https://hn.algolia.com/api/v1';

  protected async fetchRaw(): Promise<HNHit[]> {
    const url = `${this.BASE}/search`;
    this.log(`GET ${url}?query=${encodeURIComponent(this.config.keyword)}&hitsPerPage=${this.config.limit}&tags=story`);
    const res = await axios.get<{ hits: HNHit[] }>(url, {
      params: { query: this.config.keyword, hitsPerPage: this.config.limit, tags: 'story' },
      timeout: 15000,
    }).catch((err) => {
      throw new CollectorError(`HN API error: ${err.message}`, this.platform, err);
    });
    return res.data?.hits ?? [];
  }

  protected parsePost(raw: unknown): Post {
    const h = raw as HNHit;
    return {
      id: h.objectID,
      title: h.title || '(no title)',
      content: h.story_text || '',
      author: h.author || 'unknown',
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: h.points ?? 0,
      commentCount: h.num_comments ?? 0,
      createdAt: new Date(h.created_at),
      platform: this.platform,
    };
  }
}
