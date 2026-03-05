import { BaseCollector } from './base';
import { Post, Platform } from '../types';
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
export declare class RedditCollector extends BaseCollector {
    readonly platform: Platform;
    private readonly BASE_URL;
    private readonly client;
    protected fetchRaw(): Promise<RedditChild[]>;
    private searchGlobal;
    private searchInSubreddit;
    private doSearch;
    protected parsePost(raw: unknown): Post;
}
export {};
//# sourceMappingURL=reddit.d.ts.map