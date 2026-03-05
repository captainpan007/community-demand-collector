import { BaseCollector } from './base';
import { Post, Platform } from '../types';

export declare class TrustpilotCollector extends BaseCollector {
    readonly platform: Platform;
    protected fetchRaw(): Promise<unknown[]>;
    protected parsePost(raw: unknown): Post;
}
