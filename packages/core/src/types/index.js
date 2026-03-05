"use strict";
// ── 平台标识 ──────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectorError = void 0;
// ── 采集器错误类型 ────────────────────────────────────────────────────
class CollectorError extends Error {
    constructor(message, platform, cause) {
        super(message);
        this.platform = platform;
        this.cause = cause;
        this.name = 'CollectorError';
    }
}
exports.CollectorError = CollectorError;
//# sourceMappingURL=index.js.map