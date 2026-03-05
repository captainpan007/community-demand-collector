"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HackerNewsCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const base_1 = require("./base");
const types_1 = require("../types");
class HackerNewsCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = 'hackernews';
        this.BASE = 'https://hn.algolia.com/api/v1';
    }
    async fetchRaw() {
        const url = `${this.BASE}/search`;
        this.log(`GET ${url}?query=${encodeURIComponent(this.config.keyword)}&hitsPerPage=${this.config.limit}&tags=story`);
        const res = await axios_1.default.get(url, {
            params: { query: this.config.keyword, hitsPerPage: this.config.limit, tags: 'story' },
            timeout: 15000,
        }).catch((err) => {
            throw new types_1.CollectorError(`HN API error: ${err.message}`, this.platform, err);
        });
        return res.data?.hits ?? [];
    }
    parsePost(raw) {
        const h = raw;
        return {
            id: h.objectID,
            title: h.title || '(no title)',
            content: h.story_text || '',
            author: h.author || 'unknown',
            url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
            score: h.points ?? 0,
            commentCount: h.num_comments ?? 0,
            createdAt: new Date(h.created_at),
            platform: this.platform,
        };
    }
}
exports.HackerNewsCollector = HackerNewsCollector;
//# sourceMappingURL=hackernews.js.map