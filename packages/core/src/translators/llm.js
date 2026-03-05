"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMTranslator = void 0;
const axios_1 = __importDefault(require("axios"));
class LLMTranslator {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
        const baseUrl = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '');
        this.apiUrl =
            process.env.OPENAI_API_URL ||
                (baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions');
        this.model = process.env.OPENAI_MODEL || 'kimi-k2.5';
        if (!this.apiKey) {
            console.warn('警告: 未设置 OPENAI_API_KEY 环境变量，LLM 翻译可能会失败。');
        }
    }
    async translate(posts) {
        const translatedPosts = [];
        console.log(`[LLMTranslator] 正在调用大模型翻译 ${posts.length} 条数据 (模型: ${this.model})...`);
        // 考虑到速率限制，通常这里只处理高热度的 topDemands (不超过10个)，所以并发是安全的
        const promises = posts.map(async (post) => {
            try {
                const result = await this.translateSinglePost(post);
                return {
                    ...post,
                    titleZh: result.titleZh,
                    sentiment: result.sentiment,
                    sentimentScore: result.sentimentScore,
                    painPoints: result.painPoints,
                    opportunities: result.opportunities,
                    priority: result.priority,
                    summaryZh: result.summaryZh
                };
            }
            catch (error) {
                console.error(`[LLMTranslator] 翻译帖子 [${post.id}] 失败: ${error.message}`);
                return { ...post, sentiment: 'neutral', sentimentScore: 0, painPoints: [], opportunities: [], priority: 'medium' };
            }
        });
        return Promise.all(promises);
    }
    async translateSinglePost(post) {
        const prompt = `
你是资深出海商业分析师。根据以下帖子信息进行分析，输出纯 JSON（无任何 markdown 包裹或额外文字）。

平台: ${post.platform}
帖子标题: ${post.title}
帖子内容: ${post.content || '(无内容)'}
互动数据: 点赞/热度 ${post.score}，评论数 ${post.commentCount}

严格按以下结构输出 JSON，所有字段必须存在：
{
  "titleZh": "<自然流畅的中文标题>",
  "sentiment": "<positive 或 negative 或 neutral，根据内容情感判断>",
  "sentimentScore": <-1.0 到 1.0 之间的浮点数，负数表示负面>,
  "painPoints": ["<具体痛点1>", "<具体痛点2>"],
  "opportunities": ["<对应产品或商业机会1>", "<对应产品或商业机会2>"],
  "priority": "<high 或 medium 或 low，根据痛点强度和市场规模判断>",
  "summaryZh": "<综合商业价值分析，含痛点强度、市场规模信号、竞品提及，Markdown 无序列表，≤120字>"
}
    `.trim();
        const body = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }]
        };
        if (!this.apiUrl.includes('moonshot')) {
            body.response_format = { type: 'json_object' };
            body.temperature = 0.3;
        }
        else {
            if (this.model !== 'kimi-k2.5') {
                body.temperature = 0.3;
            }
        }
        const response = await axios_1.default.post(this.apiUrl, body, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        let content = response.data.choices[0].message.content?.trim() || '';
        const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock)
            content = codeBlock[1].trim();
        try {
            const parsed = JSON.parse(content);
            return {
                titleZh: parsed.titleZh || post.title,
                sentiment: parsed.sentiment || 'neutral',
                sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
                painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
                opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
                priority: parsed.priority || 'medium',
                summaryZh: parsed.summaryZh || ''
            };
        }
        catch (e) {
            throw new Error(`LLM 返回了无效的 JSON: ${content}`);
        }
    }
}
exports.LLMTranslator = LLMTranslator;
//# sourceMappingURL=llm.js.map