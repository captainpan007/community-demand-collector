# Community Demand Collector / DemandLens

## 项目定位
电商出海卖家的竞品情报工具，从 HackerNews、Reddit、Trustpilot 等平台抓取评论，用 TF-IDF 分析关键词，LLM 翻译并生成商业洞察报告。

## 技术栈
- CLI: Node.js + TypeScript，入口 `dist/index.js`
- Core 包: `packages/core/src/`（collectors/analyzers/reporters/translators）
- Web: `apps/web/`，Next.js 16 + Clerk 认证 + Prisma + Supabase + Lemon Squeezy
- 数据库: Supabase PostgreSQL，通过 Session Pooler 连接

## 当前完成状态
✅ CLI 完整可用：`node dist/index.js collect -k "关键词" -s hackernews -l 10 -t -o report.md`
✅ Web 端完整可用：localhost:3000，登录/采集/历史/订阅全流程跑通
✅ Lemon Squeezy 支付集成，Webhook 自动更新订阅状态
✅ UI 重设计完成，深色海军蓝风格
✅ Amazon 真实采集：Playwright + 一次性登录流程，auth state 保存至 `~/.demand-collector/amazon-auth.json`
✅ Web 端支持 Amazon ASIN 采集（mock: false，serverExternalPackages 排除 playwright）
✅ 报告详情页完整重设计：选品结论 / 痛点 Top3 / 词云 / 差评关键词 / 折叠评论列表
✅ Amazon URL 粘贴识别：输入框支持粘贴完整 Amazon URL，自动提取 ASIN 并显示绿色提示
✅ 报告显示商品名称：Amazon 采集时抓取 productTitle，报告页优先显示商品名，fallback 显示 ASIN
✅ Trustpilot 真实采集：Playwright 采集，过滤 1-2 星差评（?stars=1&stars=2），Web 端 mock:false

## 待完成
- G2 采集器（未开始）

## 关键文件
- `packages/core/src/collectors/amazon.js` - Amazon Playwright 采集器（含一次性登录流程）
- `packages/core/src/collectors/trustpilot.js` - Trustpilot Playwright 采集器（1-2星过滤）
- `packages/core/src/index.js` - runCollect 主流程，含 LLM 翻译逻辑
- `packages/core/src/reporters/markdown.js` - CLI 报告生成（含综合结论，分母已修复）
- `apps/web/app/api/collect/route.ts` - Web 采集 API（amazon/trustpilot mock:false，其余 mock:true）
- `apps/web/app/report/[id]/page.tsx` - 报告详情页（选品结论/痛点/词云/差评词）
- `apps/web/app/api/subscribe/route.ts` - Lemon Squeezy Checkout
- `apps/web/prisma/schema.prisma` - 数据库模型
- `apps/web/next.config.mjs` - serverExternalPackages: ['playwright']

## 环境变量位置
- CLI: 根目录 `.env`
- Web 本地: `apps/web/.env.local` 和 `apps/web/.env`
- Web 生产: `apps/web/.env.production`（已 git add -f，含 Clerk keys + DATABASE_URL）

## Railway 部署踩坑总结

### 1. Node.js 版本
- 问题：Nixpacks 默认 Node 18，Next.js 需要 >=20.9
- 修复：创建 `.node-version` 文件写 20，加 `nixpacks.toml` 指定 `nodejs_20`

### 2. Prisma 权限
- 问题：prisma generate 在 Nixpacks 里 permission denied
- 修复：改用 `npx prisma generate`

### 3. NEXT_PUBLIC_ 环境变量
- 问题：`NEXT_PUBLIC_` 前缀变量是 build time 注入，Railway 里设置后不会自动重新构建
- 修复：创建 `apps/web/.env.production` 文件直接写入，push 后触发完整构建

### 4. Clerk 配置
- 问题：ClerkProvider 读不到 publishableKey 和 secretKey
- 修复：publishableKey 和 secretKey 都写入 `.env.production`，确保 build time 和 runtime 都能读到

### 5. Supabase 数据库连接
- 问题：Railway（us-west2）连 Supabase（ap-south-1）跨区域，Circuit breaker open
- 当前配置：Session Pooler 端口 5432 + `connection_limit=1&connect_timeout=30&pool_timeout=30`
- `prisma.ts` 里显式传入 `datasources: { db: { url: process.env.DATABASE_URL } }`
- 格式：`postgresql://postgres.[project-id]:[password]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?connection_limit=1&connect_timeout=30&pool_timeout=30`
- ⚠️ 跨区域连接不稳定，如持续失败考虑：迁移 Supabase 到 us-west / 用 Railway 自带 PostgreSQL

### 6. 端口配置
- 问题：Railway Generate Domain 填错端口
- 修复：Next.js 在 Railway 上默认跑 8080，不是 3000

### 7. 构建方式
- 当前使用 Nixpacks（`railway.json` builder: NIXPACKS）
- buildCommand: `cd apps/web && npm ci && npx prisma generate && npx next build`
- startCommand: `cd apps/web && npm run start`
- Dockerfile 也保留在 `apps/web/Dockerfile`（node:20-slim 基础镜像），可切换

## 注意事项
- Reddit 在当前网络环境无法访问（需代理）
- Trustpilot 真实采集也需要代理
- Web 开发服务器：`cd apps/web && npm run dev`
- CLI 编译：根目录 `npm run build`

---

## 开发规则（原 CLAUDE.md）

### 环境限制
- 当前开发环境有网络限制，无法直接访问 Reddit/Twitter 等外部 API
- 所有 API 集成必须同时实现 mock 模式，用 `--mock` 参数或 `MOCK_MODE` 环境变量切换
- 使用适配器模式（Adapter Pattern），让 mock 和 live 实现可以互换

### 语言与代码风格
- TypeScript strict 模式（`strict: true`）
- 用 `interface` 而非 `type` 定义对象结构
- 用 zod 做外部数据的运行时校验（API 响应、CLI 输入）

### 测试要求
- 每个功能模块完成后必须写测试并运行通过
- 包含核心逻辑的单元测试 + 使用 mock 数据的集成测试
- 测试命令：`npx vitest run`

### 版本控制
- 边做边 commit，不要等全部完成再提交
- 里程碑节点必须 commit：项目初始化、核心模块完成、测试通过、功能闭环
- 使用 conventional commit 风格的提交信息

### 开发流程
- 严格分步开发，每步验收通过后再进入下一步
- 不允许跳步，不允许一次做多步
- 每步开始前先确认目标和验收标准

### 构建与运行
- 构建：`npx tsc`
- 运行示例：`node dist/index.js collect --keyword "xxx" --source reddit --limit 100 --subreddits "AI_Agents,LocalLLaMA" --output ./reports/report.md`
