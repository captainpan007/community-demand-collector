import { BaseCollector } from './base';
import { Post, Platform } from '../types';
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
export declare class HackerNewsCollector extends BaseCollector {
    readonly platform: Platform;
    private readonly BASE;
    protected fetchRaw(): Promise<HNHit[]>;
    protected parsePost(raw: unknown): Post;
}
export {};
//# sourceMappingURL=hackernews.d.ts.map