"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
const EmailSmtpSchema = zod_1.z
    .object({
    host: zod_1.z.string().min(1),
    port: zod_1.z.number().int().positive(),
    secure: zod_1.z.boolean().optional().default(false),
    user: zod_1.z.string().min(1),
    pass: zod_1.z.string().min(1),
})
    .partial()
    .optional();
const ConfigSchema = zod_1.z.object({
    defaults: zod_1.z
        .object({
        keywords: zod_1.z.array(zod_1.z.string()).default([]),
        source: zod_1.z.enum(['reddit', 'hackernews', 'trustpilot']).default('reddit'),
        limit: zod_1.z.number().int().positive().default(50),
    })
        .default({ keywords: [], source: 'reddit', limit: 50 }),
    llm: zod_1.z
        .object({
        apiKey: zod_1.z.string().optional(),
        baseUrl: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
    })
        .default({}),
    schedule: zod_1.z
        .object({
        enabled: zod_1.z.boolean().default(false),
        cronDaily: zod_1.z.string().default('0 9 * * *'),
        cronWeekly: zod_1.z.string().default('0 10 * * 1'),
    })
        .default({ enabled: false, cronDaily: '0 9 * * *', cronWeekly: '0 10 * * 1' }),
    notifications: zod_1.z
        .object({
        email: zod_1.z
            .object({
            from: zod_1.z.string().optional(),
            to: zod_1.z.string().optional(),
            smtp: EmailSmtpSchema,
            resendApiKey: zod_1.z.string().optional(),
        })
            .default({}),
    })
        .default({ email: {} }),
    quickChart: zod_1.z
        .object({
        enabled: zod_1.z.boolean().default(true),
        baseUrl: zod_1.z.string().default('https://quickchart.io/chart'),
        width: zod_1.z.number().int().positive().default(800),
        height: zod_1.z.number().int().positive().default(400),
        theme: zod_1.z.string().default('light'),
    })
        .default({
        enabled: true,
        baseUrl: 'https://quickchart.io/chart',
        width: 800,
        height: 400,
        theme: 'light',
    }),
    storage: zod_1.z
        .object({
        historyDir: zod_1.z.string().default('./data/history'),
    })
        .default({ historyDir: './data/history' }),
});
let cachedConfig = null;
function loadConfig(explicitPath) {
    if (cachedConfig)
        return cachedConfig;
    const configPath = explicitPath ??
        path.resolve(process.cwd(), 'config.yaml');
    let loaded = {};
    if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        loaded = js_yaml_1.default.load(raw) ?? {};
    }
    const parsed = ConfigSchema.safeParse(loaded);
    if (!parsed.success) {
        console.error('Invalid config.yaml, using defaults.');
        console.error(parsed.error.format());
        cachedConfig = ConfigSchema.parse({});
    }
    else {
        cachedConfig = parsed.data;
    }
    // 环境变量覆盖 LLM 配置
    cachedConfig.llm.apiKey = process.env.OPENAI_API_KEY || cachedConfig.llm.apiKey;
    cachedConfig.llm.baseUrl = process.env.OPENAI_BASE_URL || cachedConfig.llm.baseUrl;
    cachedConfig.llm.model = process.env.OPENAI_MODEL || cachedConfig.llm.model;
    return cachedConfig;
}
function getConfig() {
    return cachedConfig ?? loadConfig();
}
//# sourceMappingURL=config.js.map