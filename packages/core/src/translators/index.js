"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMTranslator = exports.MockTranslator = void 0;
exports.createTranslator = createTranslator;
const mock_1 = require("./mock");
const llm_1 = require("./llm");
var mock_2 = require("./mock");
Object.defineProperty(exports, "MockTranslator", { enumerable: true, get: function () { return mock_2.MockTranslator; } });
var llm_2 = require("./llm");
Object.defineProperty(exports, "LLMTranslator", { enumerable: true, get: function () { return llm_2.LLMTranslator; } });
function createTranslator(config) {
    if (config.mock) {
        return new mock_1.MockTranslator();
    }
    return new llm_1.LLMTranslator();
}
//# sourceMappingURL=index.js.map