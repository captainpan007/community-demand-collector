import axios from 'axios';
import { Translator } from './interface';
import { Post } from '../types';

export class LLMTranslator implements Translator {
    private readonly apiKey: string;
    private readonly apiUrl: string;
    private readonly model: string;

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

    async translate(posts: Post[]): Promise<Post[]> {
        const translatedPosts: Post[] = [];

        console.log(`[LLMTranslator] 正在调用大模型翻译 ${posts.length} 条数据 (模型: ${this.model})...`);

        // 考虑到速率限制，通常这里只处理高热度的 topDemands (不超过10个)，所以并发是安全的
        const promises = posts.map(async (post) => {
            try {
                const result = await this.translateSinglePost(post);
                return {
                    ...post,
                    titleZh: result.titleZh,
                    summaryZh: result.summaryZh
                };
            } catch (error: any) {
                console.error(`[LLMTranslator] 翻译帖子 [${post.id}] 失败: ${error.message}`);
                return { ...post };
            }
        });

        return Promise.all(promises);
    }

    private async translateSinglePost(post: Post): Promise<{ titleZh: string; summaryZh: string }> {
        const prompt = `
你是资深出海商业分析师。分析海外极客社区帖子，输出 JSON（纯 JSON，无 markdown 包裹）。

帖子标题: ${post.title}
帖子内容: ${post.content || '(无内容)'}

输出 JSON:
{
  "titleZh": "<自然流畅的中文标题>",
  "summaryZh": "<核心商业痛点、用户需求、商业价值信号。含：1)技术/产品痛点 2)潜在市场规模或竞品提及 3)建议优先级(高/中/低)及理由。精炼要点，Markdown 无序列表，≤150字>"
}
    `.trim();

        const body: Record<string, unknown> = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }]
        };
        if (!this.apiUrl.includes('moonshot')) {
            body.response_format = { type: 'json_object' };
            body.temperature = 0.3;
        } else {
            // kimi-k2.5 不允许自定义 temperature/top_p 等，使用 API 默认即可
            if (this.model !== 'kimi-k2.5') {
                body.temperature = 0.3;
            }
        }

        const response = await axios.post(
            this.apiUrl,
            body,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60s
            }
        );

        let content = response.data.choices[0].message.content?.trim() || '';
        const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) content = codeBlock[1].trim();
        try {
            const parsed = JSON.parse(content);
            return {
                titleZh: parsed.titleZh || post.title,
                summaryZh: parsed.summaryZh || ''
            };
        } catch (e) {
            throw new Error(`LLM 返回了无效的 JSON: ${content}`);
        }
    }
}
