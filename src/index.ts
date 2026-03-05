#!/usr/bin/env node
// 尽早加载 .env，供后续模块读取 OPENAI_API_KEY / OPENAI_BASE_URL 等
import 'dotenv/config';

// 科学上网代理下访问国内 API (如 Kimi api.moonshot.cn) 时避免 TLS 握手失败
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NO_PROXY = 'api.moonshot.cn';

import { program } from './cli';

program.parse(process.argv);
