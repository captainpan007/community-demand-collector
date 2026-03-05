import { Post } from '../types';

export class DemandRanker {
  /** 时间衰减系数，每天衰减 (1 - decay) */
  private readonly decay = 0.98;

  rank(posts: Post[], limit = 10): Post[] {
    return [...posts]
      .sort((a, b) => this.engagementScore(b) - this.engagementScore(a))
      .slice(0, limit);
  }

  engagementScore(post: Post): number {
    const base = post.score + post.commentCount * 2;
    const daysAgo = (Date.now() - post.createdAt.getTime()) / 864e5;
    return base * Math.pow(this.decay, daysAgo);
  }
}
