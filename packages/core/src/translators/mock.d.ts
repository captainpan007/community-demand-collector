import { Translator } from './interface';
import { Post } from '../types';
export declare class MockTranslator implements Translator {
    translate(posts: Post[]): Promise<Post[]>;
}
//# sourceMappingURL=mock.d.ts.map