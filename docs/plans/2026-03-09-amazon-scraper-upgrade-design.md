# Amazon 采集升级设计：ScraperAPI 方案

## 背景

当前 Amazon 采集依赖 Playwright + 本地登录态（`~/.demand-collector/amazon-auth.json`），生产环境（Railway）无法使用真实采集。需要一个无需登录、可在生产环境运行的方案。

## 方案

用 ScraperAPI 替代 Playwright 作为请求层，解析逻辑复用现有代码。

## 架构

```
当前：Playwright → Amazon HTML → 解析
改后：ScraperAPI HTTP → Amazon HTML → 解析（复用）
```

### 请求流程

1. 构造 Amazon 评论页 URL（`filterByStar=one_star&two_star&sortBy=recent`）
2. 通过 ScraperAPI 代理：`GET https://api.scraperapi.com?api_key=XXX&url=AMAZON_URL&render=false`
3. 拿到 HTML，用现有解析逻辑提取评论
4. 翻页：解析 "Next page" 链接，继续请求直到达到 limit

### Fallback 策略

```
ScraperAPI 有余额且 AMAZON_SCRAPER_ENABLED=true → ScraperAPI 真实采集
  ↓ 失败
本地有 amazon-auth.json → Playwright 采集（兼容现有逻辑）
  ↓ 失败
Mock 数据 + demoMode 标记
```

## 数据模型升级

新增字段（向后兼容，均为可选）：

| 字段 | 说明 |
|------|------|
| starRating | 1-5 星原始评分 |
| verifiedPurchase | 是否 Verified Purchase |
| reviewDate | 精确评论日期 |
| helpfulCount | "X 人觉得有用" |
| hasImages | 是否带图 |

## 报告页升级

- 星级分布柱状图（1-5 星各多少条）
- Verified Purchase 标签标注
- 按 helpfulCount 排序展示最有影响力的差评

## 环境变量

```
SCRAPERAPI_KEY=xxx            # ScraperAPI API Key
AMAZON_SCRAPER_ENABLED=true   # 开关，关闭则走旧 Playwright 逻辑
```

## 成本

- ScraperAPI 免费 5000 次/月
- 每次采集约 2-5 页请求，支持 1000-2500 次采集/月
- 超出自动 fallback

## 改动范围

1. `packages/core/src/collectors/amazon.js` — 新增 ScraperAPI 请求层 + fallback + 新字段解析
2. `apps/web/app/api/collect/route.ts` — Amazon mock 逻辑简化（ScraperAPI 可用时直接真实采集）
3. `apps/web/app/report/[id]/page.tsx` — 新增星级分布图 + verified 标签 + helpfulCount 排序
4. 环境变量：`.env` / `.env.local` / `.env.production` 加 `SCRAPERAPI_KEY`
