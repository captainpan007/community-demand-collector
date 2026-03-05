import { Translator } from './interface';
import { Post } from '../types';
export declare class LLMTranslator implements Translator {
    private readonly apiKey;
    private readonly apiUrl;
    private readonly model;
    constructor();
    translate(posts: Post[]): Promise<Post[]>;
    private translateSinglePost;
}
//# sourceMappingURL=llm.d.ts.map