import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    defaults: z.ZodDefault<z.ZodObject<{
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        source: z.ZodDefault<z.ZodEnum<["reddit", "hackernews", "trustpilot"]>>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        keywords: string[];
        source: "reddit" | "hackernews" | "trustpilot";
        limit: number;
    }, {
        keywords?: string[] | undefined;
        source?: "reddit" | "hackernews" | "trustpilot" | undefined;
        limit?: number | undefined;
    }>>;
    llm: z.ZodDefault<z.ZodObject<{
        apiKey: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
    }, {
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
    }>>;
    schedule: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        cronDaily: z.ZodDefault<z.ZodString>;
        cronWeekly: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        cronDaily: string;
        cronWeekly: string;
    }, {
        enabled?: boolean | undefined;
        cronDaily?: string | undefined;
        cronWeekly?: string | undefined;
    }>>;
    notifications: z.ZodDefault<z.ZodObject<{
        email: z.ZodDefault<z.ZodObject<{
            from: z.ZodOptional<z.ZodString>;
            to: z.ZodOptional<z.ZodString>;
            smtp: z.ZodOptional<z.ZodObject<{
                host: z.ZodOptional<z.ZodString>;
                port: z.ZodOptional<z.ZodNumber>;
                secure: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                user: z.ZodOptional<z.ZodString>;
                pass: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            }, {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            }>>;
            resendApiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        }, {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        email: {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        };
    }, {
        email?: {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        } | undefined;
    }>>;
    quickChart: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        baseUrl: z.ZodDefault<z.ZodString>;
        width: z.ZodDefault<z.ZodNumber>;
        height: z.ZodDefault<z.ZodNumber>;
        theme: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        enabled: boolean;
        width: number;
        height: number;
        theme: string;
    }, {
        baseUrl?: string | undefined;
        enabled?: boolean | undefined;
        width?: number | undefined;
        height?: number | undefined;
        theme?: string | undefined;
    }>>;
    storage: z.ZodDefault<z.ZodObject<{
        historyDir: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        historyDir: string;
    }, {
        historyDir?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    defaults: {
        keywords: string[];
        source: "reddit" | "hackernews" | "trustpilot";
        limit: number;
    };
    llm: {
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
    };
    schedule: {
        enabled: boolean;
        cronDaily: string;
        cronWeekly: string;
    };
    notifications: {
        email: {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        };
    };
    quickChart: {
        baseUrl: string;
        enabled: boolean;
        width: number;
        height: number;
        theme: string;
    };
    storage: {
        historyDir: string;
    };
}, {
    defaults?: {
        keywords?: string[] | undefined;
        source?: "reddit" | "hackernews" | "trustpilot" | undefined;
        limit?: number | undefined;
    } | undefined;
    llm?: {
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
    } | undefined;
    schedule?: {
        enabled?: boolean | undefined;
        cronDaily?: string | undefined;
        cronWeekly?: string | undefined;
    } | undefined;
    notifications?: {
        email?: {
            from?: string | undefined;
            to?: string | undefined;
            smtp?: {
                host?: string | undefined;
                port?: number | undefined;
                secure?: boolean | undefined;
                user?: string | undefined;
                pass?: string | undefined;
            } | undefined;
            resendApiKey?: string | undefined;
        } | undefined;
    } | undefined;
    quickChart?: {
        baseUrl?: string | undefined;
        enabled?: boolean | undefined;
        width?: number | undefined;
        height?: number | undefined;
        theme?: string | undefined;
    } | undefined;
    storage?: {
        historyDir?: string | undefined;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof ConfigSchema>;
export declare function loadConfig(explicitPath?: string): AppConfig;
export declare function getConfig(): AppConfig;
export {};
//# sourceMappingURL=config.d.ts.map