# 开发日志

## 2026-03-05
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
