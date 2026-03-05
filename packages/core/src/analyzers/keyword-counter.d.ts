import { Post } from '../types';
export declare class KeywordAnalyzer {
    /**
     * 关键词分析：支持 unigram + bigram，TF-IDF 加权
     * @param posts 帖子列表
     * @param topN 返回前 N 个
     * @param minDf 最小文档频率
     */
    analyze(posts: Post[], topN?: number, minDf?: number): Map<string, number>;
    count(posts: Post[], topN?: number, minDf?: number): Map<string, number>;
}
/** @deprecated 使用 KeywordAnalyzer */
export declare const KeywordCounter: typeof KeywordAnalyzer;
export declare function keywordsToObject(map: Map<string, number>): Record<string, number>;
//# sourceMappingURL=keyword-counter.d.ts.map