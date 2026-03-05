"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordCounter = exports.KeywordAnalyzer = void 0;
exports.keywordsToObject = keywordsToObject;
const STOP_WORDS = new Set([
    // 冠词 / 连词 / 介词
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'into', 'through', 'about', 'above', 'after', 'before',
    'between', 'during', 'without', 'within', 'along', 'across', 'behind', 'beyond',
    // 代词
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    // 助动词 / 系动词
    'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
    'shall', 'must', 'ought',
    // 高频无意义词
    'just', 'more', 'also', 'very', 'really', 'so', 'too', 'even', 'still', 'already',
    'now', 'then', 'here', 'there', 'when', 'where', 'who', 'what', 'how', 'why',
    'all', 'any', 'both', 'each', 'few', 'many', 'much', 'most', 'other', 'some',
    'such', 'than', 'same', 'own', 'its', 'not', 'no', 'nor', 'only', 'same', 'than',
    'like', 'well', 'back', 'get', 'got', 'go', 'one', 'two', 'new', 'use', 'used',
    'make', 'made', 'know', 'think', 'want', 'need', 'see', 'look', 'come', 'keep',
    'way', 'thing', 'time', 'year', 'people', 'man', 'woman', 'day', 'good', 'long',
    'take', 'give', 'put', 'set', 'let', 'try', 'ask', 'say', 'tell', 'said',
    'right', 'left', 'old', 'big', 'little', 'great', 'high', 'low', 'next', 'last',
    // URL / Markdown 碎片
    'https', 'http', 'www', 'com', 'org', 'net', 'io', 'app', 'link', 'url',
    'amp', 'nbsp', 'redd', 'reddit', 'imgur', 'github', 'youtube', 'twitter',
    'watch', 'video', 'videos', 'preview', 'width', 'format', 'webp', 'auto',
    // Reddit 固定格式词
    'status', 'deleted', 'removed', 'edit', 'update', 'tldr', 'eli', 'tl',
    'post', 'comment', 'comments', 'thread', 'subreddit', 'upvote', 'downvote',
    // 缩写残留（don't / isn't 截断后的残留）
    'don', 'isn', 'doesn', 'didn', 'won', 'aren', 'wasn', 'weren', 'hadn',
    'shouldn', 'couldn', 'wouldn', 'haven', 'hasn', 'let',
]);
/**
 * 对单段文本做预清洗，去除 URL、Markdown 链接、HTML 实体、代码块等
 */
function cleanText(raw) {
    return raw
        // 去掉 Markdown 链接 [text](url) → text
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        // 去掉裸 URL（http/https 开头）
        .replace(/https?:\/\/\S+/g, '')
        // 去掉 HTML 实体（&amp; &#x200B; 等）
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        // 去掉 Markdown 代码块 ```...```
        .replace(/```[\s\S]*?```/g, ' ')
        // 去掉行内代码 `...`
        .replace(/`[^`]*`/g, ' ')
        // 去掉 Markdown 标题 # ## ###
        .replace(/^#+\s*/gm, '')
        // 去掉星号加粗/斜体
        .replace(/\*+([^*]*)\*+/g, '$1')
        // 多空白合并
        .replace(/\s+/g, ' ')
        .trim();
}
class KeywordAnalyzer {
    /**
     * 关键词分析：支持 unigram + bigram，TF-IDF 加权
     * @param posts 帖子列表
     * @param topN 返回前 N 个
     * @param minDf 最小文档频率
     */
    analyze(posts, topN = 30, minDf = 2) {
        const N = posts.length;
        const termFreq = new Map();
        const docFreq = new Map();
        for (const post of posts) {
            const raw = `${post.title} ${post.content}`;
            const text = cleanText(raw).toLowerCase();
            const words = text.match(/\b[a-z]{3,}\b/g) ?? [];
            const seenInPost = new Set();
            for (const word of words) {
                if (STOP_WORDS.has(word))
                    continue;
                termFreq.set(word, (termFreq.get(word) ?? 0) + 1);
                if (!seenInPost.has(word)) {
                    seenInPost.add(word);
                    docFreq.set(word, (docFreq.get(word) ?? 0) + 1);
                }
            }
            for (let i = 0; i < words.length - 1; i++) {
                const w1 = words[i], w2 = words[i + 1];
                if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2))
                    continue;
                const bigram = `${w1}_${w2}`;
                termFreq.set(bigram, (termFreq.get(bigram) ?? 0) + 1);
                if (!seenInPost.has(bigram)) {
                    seenInPost.add(bigram);
                    docFreq.set(bigram, (docFreq.get(bigram) ?? 0) + 1);
                }
            }
        }
        const scored = [...termFreq.entries()]
            .filter(([w]) => (docFreq.get(w) ?? 0) >= minDf)
            .map(([w, tf]) => {
            const df = docFreq.get(w) ?? 1;
            const idf = Math.log((N + 1) / (df + 1)) + 1;
            return [w, tf * idf];
        })
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN);
        return new Map(scored);
    }
    count(posts, topN = 30, minDf = 2) {
        return this.analyze(posts, topN, minDf);
    }
}
exports.KeywordAnalyzer = KeywordAnalyzer;
/** @deprecated 使用 KeywordAnalyzer */
exports.KeywordCounter = KeywordAnalyzer;
function keywordsToObject(map) {
    const obj = {};
    for (const [k, v] of map) {
        obj[k] = v;
    }
    return obj;
}
//# sourceMappingURL=keyword-counter.js.map