import { Post } from '../types';
export declare class DemandRanker {
    /** 时间衰减系数，每天衰减 (1 - decay) */
    private readonly decay;
    rank(posts: Post[], limit?: number): Post[];
    engagementScore(post: Post): number;
}
//# sourceMappingURL=demand-ranker.d.ts.map