import { Post, CollectorConfig, CollectorError, Platform } from '../types';

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
export abstract class BaseCollector {
  protected readonly config: CollectorConfig;

  /** 请求失败时最大重试次数 */
  protected readonly maxRetries: number = 3;

  /** 每次重试前的基础等待时间(ms)，采用指数退避 */
  protected readonly retryDelayMs: number = 1000;

  constructor(config: CollectorConfig) {
    this.config = config;
  }

  // ── 子类必须实现的两个方法 ─────────────────────────────────────────

  /** 调用平台接口，返回原始数据列表（具体类型由子类定义） */
  protected abstract fetchRaw(): Promise<unknown[]>;

  /** 将平台原始单条数据转换为统一的 Post 结构 */
  protected abstract parsePost(raw: unknown): Post;

  /** 当前采集器对应的平台标识 */
  protected abstract readonly platform: Platform;

  // ── 公开入口：collect() ────────────────────────────────────────────

  /**
   * 执行采集。子类通常不需要重写此方法。
   * 流程：validateConfig → fetchRaw (含重试) → parsePost (逐条) → 返回
   */
  async collect(): Promise<Post[]> {
    this.validateConfig();
    this.log(`Starting collection | keyword="${this.config.keyword}" limit=${this.config.limit}`);

    const rawItems = await this.withRetry(() => this.fetchRaw());

    const posts: Post[] = [];
    for (const raw of rawItems) {
      try {
        posts.push(this.parsePost(raw));
      } catch (err) {
        this.log(`Warning: failed to parse one item, skipping. (${err})`);
      }
    }

    this.log(`Done. Collected ${posts.length} posts.`);
    return posts;
  }

  // ── 通用工具方法（供子类使用）─────────────────────────────────────

  protected validateConfig(): void {
    if (!this.config.keyword?.trim()) {
      throw new CollectorError('Keyword is required', this.platform);
    }
    if (this.config.limit <= 0) {
      throw new CollectorError('Limit must be greater than 0', this.platform);
    }
  }

  protected log(message: string): void {
    console.log(`[${this.platform}] ${message}`);
  }

  /** 带指数退避的重试包装器 */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          this.log(`Attempt ${attempt} failed, retrying in ${delay}ms…`);
          await this.sleep(delay);
        }
      }
    }
    throw new CollectorError(
      `All ${this.maxRetries} attempts failed`,
      this.platform,
      lastError,
    );
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
