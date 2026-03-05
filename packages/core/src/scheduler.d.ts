import type { AppConfig } from './types';
export declare function startScheduler(override?: Partial<AppConfig>): Promise<void>;
export declare function stopScheduler(): Promise<void>;
export declare function runBatchOnce(tag: 'daily' | 'weekly', override?: Partial<AppConfig>): Promise<void>;
//# sourceMappingURL=scheduler.d.ts.map