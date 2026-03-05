"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemandRanker = void 0;
class DemandRanker {
    constructor() {
        /** 时间衰减系数，每天衰减 (1 - decay) */
        this.decay = 0.98;
    }
    rank(posts, limit = 10) {
        return [...posts]
            .sort((a, b) => this.engagementScore(b) - this.engagementScore(a))
            .slice(0, limit);
    }
    engagementScore(post) {
        const base = post.score + post.commentCount * 2;
        const daysAgo = (Date.now() - post.createdAt.getTime()) / 864e5;
        return base * Math.pow(this.decay, daysAgo);
    }
}
exports.DemandRanker = DemandRanker;
//# sourceMappingURL=demand-ranker.js.map