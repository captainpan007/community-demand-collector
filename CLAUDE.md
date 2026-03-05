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

## 待完成
- Trustpilot 采集器（代码已写，mock 模式待测试，真实网络待验证）
- G2 采集器（未开始）
- 报告详情页美化（现在显示原始 JSON）

## 关键文件
- `packages/core/src/collectors/trustpilot.js` - Trustpilot 采集器
- `packages/core/src/index.js` - runCollect 主流程，含 LLM 翻译逻辑
- `apps/web/app/api/collect/route.ts` - Web 采集 API
- `apps/web/app/api/subscribe/route.ts` - Lemon Squeezy Checkout
- `apps/web/prisma/schema.prisma` - 数据库模型

## 环境变量位置
- CLI: 根目录 `.env`
- Web: `apps/web/.env.local` 和 `apps/web/.env`

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
