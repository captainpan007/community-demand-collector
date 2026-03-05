"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterCollector = void 0;
const base_1 = require("./base");
/**
 * TwitterCollector — 占位，待第五步实现。
 * 此文件保留是为了让 TypeScript 编译通过，不含任何真实业务逻辑。
 */
class TwitterCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = 'twitter';
    }
    async fetchRaw() {
        throw new Error('TwitterCollector not yet implemented.');
    }
    parsePost(_raw) {
        throw new Error('TwitterCollector not yet implemented.');
    }
}
exports.TwitterCollector = TwitterCollector;
//# sourceMappingURL=twitter.js.map