# 开发日志

## 2026-03-09（续）

### Amazon 采集架构升级
- ✅ 新增 ScraperAPI HTTP 采集方法（`fetchWithScraperAPI()`），替代 Playwright 作为首选
- ✅ 三层 fallback：ScraperAPI → Playwright（本地 auth）→ Mock（demoMode）
- ✅ Web API route 简化：移除 amazon-auth.json 检查，collector 内部处理 fallback
- ❌ ScraperAPI 免费版无法访问 Amazon（返回 404 Page Not Found，Amazon 封锁免费代理 IP）
- 💡 架构已就位，日后接入付费版或其他服务只需设置 `SCRAPERAPI_KEY`

### 新增评论字段
- ✅ Post 类型新增：starRating / verifiedPurchase / helpfulCount / hasImages / productTitle
- ✅ parseReviewsHtml 增加 hasImages 检测
- ✅ parsePost 输出新增字段

### 报告页增强
- ✅ 星级分布柱状图（1-5 星，绿/黄/红配色）
- ✅ 痛点卡片：Verified Purchase 标签 + "X 人觉得有用"
- ✅ 评论列表：已验证 / helpful 数 / 含图片 标识

### 数据库迁移
- ✅ 从 Supabase（ap-south-1）迁移到 Railway 自带 PostgreSQL
- 原因：跨区域（Railway us-west2 ↔ Supabase ap-south-1）Circuit breaker 持续打开
- Internal URL: `postgres.railway.internal:5432/railway`
- Schema 同步：本地 `DATABASE_URL="公网URL" npx prisma db push`

## 2026-03-09

### Railway 部署修复
- ✅ 排查 500 错误根因：环境变量在 Railway runtime 读不到
- ✅ 创建 `apps/web/.env.production`，写入 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`、`DATABASE_URL`
- ✅ 文件被 `.gitignore` 的 `.env.*` 规则忽略，用 `git add -f` 强制跟踪
- ✅ 修复 `middleware.ts` matcher 正则：`\\\\.` 双转义改为 `\\.`
- ✅ 新增 `/api/health` 诊断端点，返回环境变量 + 数据库连接状态（不暴露值）
- ✅ `railway.json` 改回 Nixpacks，buildCommand 改为 `cd apps/web && npm ci && npx prisma generate && npx next build`
- ✅ Health check 确认：Clerk keys ✅、DATABASE_URL ✅
- ✅ 首页已能正常加载（导航栏、Hero 区域、按钮）

### 数据库连接修复（进行中）
- ❌ 登录后访问 `/dashboard` 报 500：`Circuit breaker open: Unable to establish connection to upstream database`
- 原因：Railway（us-west2 美国西部）连接 Supabase（ap-south-1 亚洲南部），跨区域延迟/连接不稳定
- 尝试过的端口：
  - 6543（Session Pooler + pgbouncer=true）→ Circuit breaker open
  - 5432（Direct/Session Pooler）→ Circuit breaker open
- 最新修复（commit `28d9b6f`，待验证）：
  - `apps/web/.env.production` DATABASE_URL 改为端口 5432 + `connection_limit=1&connect_timeout=30&pool_timeout=30`
  - `apps/web/lib/prisma.ts` 加 `datasources: { db: { url: process.env.DATABASE_URL } }` 显式传入
- ⏳ **待回来检查**：访问 `/api/health` 看 `db.connected` 是否为 true
- 💡 如果仍然连不上，可能需要：
  1. 将 Supabase 项目迁移到 us-west 区域（与 Railway 同区）
  2. 或在 Railway 上改用其他数据库（如 Railway 自带的 PostgreSQL）
  3. 或在 Supabase Dashboard → Database → Network 里检查是否有 IP 限制

### 踩坑记录
- Playwright Docker 镜像（`mcr.microsoft.com/playwright:v1.52.0-jammy`）标签不存在，可用标签为 `jammy`/`noble`/`latest`
- Nixpacks 只在根目录执行 `npm install`，子目录 `apps/web` 依赖需要在 buildCommand 里显式 `npm ci`
- `NEXT_PUBLIC_` 变量必须 build time 存在，仅设 Railway 环境变量不够（runtime 才注入）
- Supabase Session Pooler 的 Circuit breaker 会在连接失败后短路，需要等待重置

---

## 2026-03-06

### 新增 TikTok Shop 采集器
- ✅ `packages/core/src/collectors/tiktokshop.js`：Playwright 实现
- 先访问 `tiktok.com/view/product/{keyword}`，无结果自动 fallback 到搜索页
- 提取：title / content / author / rating / date，结构与 Amazon 一致
- mock 数据 10 条，情感分布：差评 70% / 中性 10% / 好评 20%
- Web 端默认 `mock:true`（TikTok 访问需代理）

### 新增 Shopee 采集器
- ✅ `packages/core/src/collectors/shopee.js`：优先调用 Shopee 公开 API
- 流程：`/api/v4/search/search_items` 搜索商品 → `/api/v2/item/get_ratings` 拉差评（≤2星）
- mock 数据 10 条，情感分布：差评 70% / 中性 10% / 好评 20%
- Web 端默认 `mock:true`

### 前端新增来源按钮
- ✅ `app/new/page.tsx` 新增 TikTok Shop（TT）和 Shopee 东南亚（SP）按钮
- source 类型联合扩展，grid 支持最多 7 列

### 报告标题生成优化
- ✅ `route.ts` 新增 `platformLabel` 映射表（amazon/tiktokshop/shopee/trustpilot/reddit/hackernews）
- 标题格式统一为 `{keyword/productTitle} - {平台名称}`，去掉冗余日期和 source ID
- 例：`手机充电器 - TikTok Shop`，`B08F7PTF53 - Amazon`

### 免费额度上限调整
- ✅ `lib/auth.ts`：免费用户月配额上限从 5 次改为 9999 次，方便测试阶段使用

---

## 2026-03-05（续）

### Amazon Playwright 真实采集
- ✅ 用 Playwright + Chromium 替代 axios，绕过 Amazon 服务端 Bot 检测
- ✅ 一次性登录流程：`headless:false` 浏览器开启，检测 nav 问候语变化确认登录，保存 auth state 至 `~/.demand-collector/amazon-auth.json`
- ✅ 后续采集全部 `headless:true`，auth state 自动续期
- ✅ 差评 URL：`filterByStar=one_star&filterByStar=two_star&sortBy=recent`（无重定向，已验证）
- ✅ 测试 ASIN B0D2BJQ911，解析 8 条真实差评，LLM 翻译 + 报告生成完整

### 综合结论分母 Bug 修复
- ✅ `markdown.js` 选品综合结论分母从 `translated.length` 改为 `totalPosts`
- 例：8 条采集 / 5 条含痛点 → 痛点频次显示 "X/8" 而非 "X/5"

### Web 端 Amazon 支持
- ✅ `apps/web/next.config.mjs` 加 `serverExternalPackages: ['playwright']`，防止 webpack 打包原生二进制
- ✅ `/api/collect` route：amazon 用 `mock: false`，其他来源保持 `mock: true`（网络限制）
- ✅ `app/new/page.tsx`：选 Amazon 时 placeholder 改为 ASIN 示例，输入框下加提示文字

### 报告详情页重设计
- ✅ 替换原始 JSON 展示，改为可读选品报告
- 顶部：关键词 + 平台徽章 + 采集时间 + 总条数
- 选品结论卡片：差评占比 ≥30% → "🎯 存在市场机会"；<30% → "✅ 市场成熟，竞争激烈"
- 买家痛点 Top3：按 score 降序，含标题/摘要/痛点标签/原文链接
- 高频词云：保留原有 chart URL 渲染
- 差评关键词：score>40 评论的 title，tag 形式展示（红色系）
- 全部评论：`<details>` 折叠，差评/一般/好评三色标注

---

## 2026-03-05（早）
- ✅ Amazon 采集器 mock 模式测试通过
- ✅ Trustpilot 采集器代码完成，待真实网络测试
- ✅ UI 重设计完成，深色海军蓝风格
- ✅ Lemon Squeezy 支付集成跑通
- ✅ Mock 翻译器重构：由固定模板改为基于评论标题+正文的内容感知痛点提取
- ✅ 报告末尾新增"📋 选品综合结论"模块，跨评论汇总痛点频率、市场机会、选品建议
- ✅ 验证命令：`node dist/index.js collect -k "wireless charger" -s amazon -l 5 -t -m -o ./reports/amazon-mock.md`
  - 结论输出：过热/安全隐患 3/5 条提及（最高频），✅ 值得测品，切入方向：过热
- ❌ Amazon 真实采集受阻：服务端无 Cookie 请求被 Amazon 重定向到登录页（HTTP 200 但内容为 Sign-In HTML）
  - 根本原因：Amazon 对服务端抓取全面封锁，需要浏览器 Cookie 或住宅代理才能访问评论页
  - 已尝试：多种 Header 组合（Accept-Encoding/Referer/Cookie）、美国/英国域名，均无效
  - 结论：Amazon 采集目前仅支持 `--mock` 模式；真实采集需 Playwright/Puppeteer 或 Amazon PA API
