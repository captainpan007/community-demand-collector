import { Post } from '../types';

export interface Translator {
    /**
     * 将给定的一批帖子翻译并提取摘要，返回带有 titleZh 和 summaryZh 的新帖子数组
     */
    translate(posts: Post[]): Promise<Post[]>;
}

export interface TranslatorConfig {
    /** 是否使用 mock 翻译器 */
    mock?: boolean;
}
