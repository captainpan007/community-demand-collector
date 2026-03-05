"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCollector = void 0;
const types_1 = require("../types");
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
class BaseCollector {
    constructor(config) {
        /** 请求失败时最大重试次数 */
        this.maxRetries = 3;
        /** 每次重试前的基础等待时间(ms)，采用指数退避 */
        this.retryDelayMs = 1000;
        this.config = config;
    }
    // ── 公开入口：collect() ────────────────────────────────────────────
    /**
     * 执行采集。子类通常不需要重写此方法。
     * 流程：validateConfig → fetchRaw (含重试) → parsePost (逐条) → 返回
     */
    async collect() {
        this.validateConfig();
        this.log(`Starting collection | keyword="${this.config.keyword}" limit=${this.config.limit}`);
        const rawItems = await this.withRetry(() => this.fetchRaw());
        const posts = [];
        for (const raw of rawItems) {
            try {
                posts.push(this.parsePost(raw));
            }
            catch (err) {
                this.log(`Warning: failed to parse one item, skipping. (${err})`);
            }
        }
        this.log(`Done. Collected ${posts.length} posts.`);
        return posts;
    }
    // ── 通用工具方法（供子类使用）─────────────────────────────────────
    validateConfig() {
        if (!this.config.keyword?.trim()) {
            throw new types_1.CollectorError('Keyword is required', this.platform);
        }
        if (this.config.limit <= 0) {
            throw new types_1.CollectorError('Limit must be greater than 0', this.platform);
        }
    }
    log(message) {
        console.log(`[${this.platform}] ${message}`);
    }
    /** 带指数退避的重试包装器 */
    async withRetry(fn) {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                lastError = err;
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
                    this.log(`Attempt ${attempt} failed, retrying in ${delay}ms…`);
                    await this.sleep(delay);
                }
            }
        }
        throw new types_1.CollectorError(`All ${this.maxRetries} attempts failed`, this.platform, lastError);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BaseCollector = BaseCollector;
//# sourceMappingURL=base.js.map