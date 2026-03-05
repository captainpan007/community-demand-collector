# 开发日志

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
