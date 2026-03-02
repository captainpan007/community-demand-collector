# CLAUDE.md — community-demand-collector 项目规则

## 环境限制
- 当前开发环境有网络限制，无法直接访问 Reddit/Twitter 等外部 API
- 所有 API 集成必须同时实现 mock 模式，用 `--mock` 参数或 `MOCK_MODE` 环境变量切换
- 使用适配器模式（Adapter Pattern），让 mock 和 live 实现可以互换

## 语言与代码风格
- TypeScript strict 模式（`strict: true`）
- 用 `interface` 而非 `type` 定义对象结构
- 用 zod 做外部数据的运行时校验（API 响应、CLI 输入）

## 测试要求
- 每个功能模块完成后必须写测试并运行通过
- 包含核心逻辑的单元测试 + 使用 mock 数据的集成测试
- 测试命令：`npx vitest run`

## 版本控制
- 边做边 commit，不要等全部完成再提交
- 里程碑节点必须 commit：项目初始化、核心模块完成、测试通过、功能闭环
- 使用 conventional commit 风格的提交信息

## 开发流程
- 严格分步开发，每步验收通过后再进入下一步
- 不允许跳步，不允许一次做多步
- 每步开始前先确认目标和验收标准

## 构建与运行
- 构建：`npx tsc`
- 运行示例：`node dist/index.js collect --keyword "xxx" --source reddit --limit 100 --subreddits "AI_Agents,LocalLLaMA" --output ./reports/report.md`
