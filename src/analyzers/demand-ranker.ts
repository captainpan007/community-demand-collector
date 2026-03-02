import { Post } from '../types';

export class DemandRanker {
  /**
   * 综合热度得分 = score（点赞）+ commentCount × 2（评论权重更高，说明讨论激烈）
   * 取前 limit 条
   */
  rank(posts: Post[], limit = 10): Post[] {
    return [...posts]
      .sort((a, b) => this.engagementScore(b) - this.engagementScore(a))
      .slice(0, limit);
  }

  engagementScore(post: Post): number {
    return post.score + post.commentCount * 2;
  }
}
