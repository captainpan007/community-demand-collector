import { Post, CollectorConfig, Platform } from '../types';
/**
 * BaseCollector — 所有平台采集器的抽象基类
 *
 * 扩展新平台时，只需：
 *   1. 继承此类
 *   2. 实现 `fetchRaw()` — 调用平台 API，返回原始数据数组
 *   3. 实现 `parsePost()` — 将单条原始数据映射为统一的 Post 结构
 *
 * 通用能力（重试、延迟、日志）由基类统一处理，子类无需重复实现。
 */
export declare abstract class BaseCollector {
    protected readonly config: CollectorConfig;
    /** 请求失败时最大重试次数 */
    protected readonly maxRetries: number;
    /** 每次重试前的基础等待时间(ms)，采用指数退避 */
    protected readonly retryDelayMs: number;
    constructor(config: CollectorConfig);
    /** 调用平台接口，返回原始数据列表（具体类型由子类定义） */
    protected abstract fetchRaw(): Promise<unknown[]>;
    /** 将平台原始单条数据转换为统一的 Post 结构 */
    protected abstract parsePost(raw: unknown): Post;
    /** 当前采集器对应的平台标识 */
    protected abstract readonly platform: Platform;
    /**
     * 执行采集。子类通常不需要重写此方法。
     * 流程：validateConfig → fetchRaw (含重试) → parsePost (逐条) → 返回
     */
    collect(): Promise<Post[]>;
    protected validateConfig(): void;
    protected log(message: string): void;
    /** 带指数退避的重试包装器 */
    protected withRetry<T>(fn: () => Promise<T>): Promise<T>;
    protected sleep(ms: number): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map