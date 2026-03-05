import { Translator } from './interface';
import { Post } from '../types';

export class MockTranslator implements Translator {
    async translate(posts: Post[]): Promise<Post[]> {
        console.log(`[MockTranslator] 正在处理 ${posts.length} 条翻译请求...`);

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        return posts.map(post => ({
            ...post,
            titleZh: `[Mock 翻译] ${post.title}`,
            summaryZh: `[Mock 分析 | 核心痛点]\n- 这名用户在探讨关于 ${post.title.substring(0, 10)}... 的技术方案。\n- 缺乏完善的工具链和生态支持。\n- 对现有产品的性能和易用性表示不满。\n- 期待有开箱即用、并兼容主流框架的解决方案。`
        }));
    }
}
