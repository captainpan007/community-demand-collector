import { Translator, TranslatorConfig } from './interface';
import { MockTranslator } from './mock';
import { LLMTranslator } from './llm';

export { Translator, TranslatorConfig } from './interface';
export { MockTranslator } from './mock';
export { LLMTranslator } from './llm';

export function createTranslator(config: TranslatorConfig): Translator {
    if (config.mock) {
        return new MockTranslator();
    }
    return new LLMTranslator();
}
