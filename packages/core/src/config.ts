import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const EmailSmtpSchema = z
  .object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    secure: z.boolean().optional().default(false),
    user: z.string().min(1),
    pass: z.string().min(1),
  })
  .partial()
  .optional();

const ConfigSchema = z.object({
  defaults: z
    .object({
      keywords: z.array(z.string()).default([]),
      source: z.enum(['reddit', 'hackernews', 'trustpilot']).default('reddit'),
      limit: z.number().int().positive().default(50),
    })
    .default({ keywords: [], source: 'reddit', limit: 50 }),
  llm: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      model: z.string().optional(),
    })
    .default({}),
  schedule: z
    .object({
      enabled: z.boolean().default(false),
      cronDaily: z.string().default('0 9 * * *'),
      cronWeekly: z.string().default('0 10 * * 1'),
    })
    .default({ enabled: false, cronDaily: '0 9 * * *', cronWeekly: '0 10 * * 1' }),
  notifications: z
    .object({
      email: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          smtp: EmailSmtpSchema,
          resendApiKey: z.string().optional(),
        })
        .default({}),
    })
    .default({ email: {} }),
  quickChart: z
    .object({
      enabled: z.boolean().default(true),
      baseUrl: z.string().default('https://quickchart.io/chart'),
      width: z.number().int().positive().default(800),
      height: z.number().int().positive().default(400),
      theme: z.string().default('light'),
    })
    .default({
      enabled: true,
      baseUrl: 'https://quickchart.io/chart',
      width: 800,
      height: 400,
      theme: 'light',
    }),
  storage: z
    .object({
      historyDir: z.string().default('./data/history'),
    })
    .default({ historyDir: './data/history' }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(explicitPath?: string): AppConfig {
  if (cachedConfig) return cachedConfig;

  const configPath =
    explicitPath ??
    path.resolve(process.cwd(), 'config.yaml');

  let loaded: unknown = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    loaded = yaml.load(raw) ?? {};
  }

  const parsed = ConfigSchema.safeParse(loaded);
  if (!parsed.success) {
    console.error('Invalid config.yaml, using defaults.');
    console.error(parsed.error.format());
    cachedConfig = ConfigSchema.parse({});
  } else {
    cachedConfig = parsed.data;
  }

  // 环境变量覆盖 LLM 配置
  cachedConfig.llm.apiKey = process.env.OPENAI_API_KEY || cachedConfig.llm.apiKey;
  cachedConfig.llm.baseUrl = process.env.OPENAI_BASE_URL || cachedConfig.llm.baseUrl;
  cachedConfig.llm.model = process.env.OPENAI_MODEL || cachedConfig.llm.model;

  return cachedConfig;
}

export function getConfig(): AppConfig {
  return cachedConfig ?? loadConfig();
}

