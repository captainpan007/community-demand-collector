import { BaseCollector } from './base';
import { Post, Platform } from '../types';
/**
 * TwitterCollector — 占位，待第五步实现。
 * 此文件保留是为了让 TypeScript 编译通过，不含任何真实业务逻辑。
 */
export declare class TwitterCollector extends BaseCollector {
    readonly platform: Platform;
    protected fetchRaw(): Promise<unknown[]>;
    protected parsePost(_raw: unknown): Post;
}
//# sourceMappingURL=twitter.d.ts.map