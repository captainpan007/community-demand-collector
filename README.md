# Community Demand Collector

一个 Node.js CLI 工具，用于从各种社区平台（Reddit、Twitter 等）自动收集用户需求信息。

## 功能特性

- 🔍 支持多平台采集（Reddit、Twitter）
- 📊 自动分析关键词和热门需求
- 📝 生成 Markdown 格式报告
- ⚙️ 灵活的命令行参数配置

## 安装

```bash
npm install
npm run build
```

## 使用方法

### 基本用法

```bash
# 从 Reddit 收集数据
npm run dev -- --keyword "feature request" --source reddit --limit 50

# 从 Twitter 收集数据（需要 API key）
npm run dev -- --keyword "bug report" --source twitter --limit 30
```

### 命令行参数

- `-k, --keyword <keyword>`: 搜索关键词（默认: "feature request"）
- `-s, --source <source>`: 数据源平台 (reddit, twitter)（默认: reddit）
- `-l, --limit <number>`: 最大采集数量（默认: 50）
- `-o, --output <path>`: 输出文件路径（默认: ./reports/report.md）

### 示例

```bash
# 收集 Reddit 上关于 "API" 的讨论
npm run dev -- -k "API" -s reddit -l 100 -o ./reports/api-feedback.md

# 收集 Twitter 上的用户反馈
npm run dev -- -k "user feedback" -s twitter -l 50
```

## 配置

复制 `.env.example` 为 `.env` 并填入你的 API 凭证：

```bash
cp .env.example .env
```

### Twitter API

需要在 [Twitter Developer Portal](https://developer.twitter.com/) 申请 API 访问权限。

### Reddit API

Reddit 的公开 API 无需认证即可使用，但有速率限制。

## 输出报告

生成的报告包含：

- 关键词统计（Top 20）
- Top 10 热门需求
- 每条需求的详细信息（标题、作者、评分、评论数、链接）

## 技术栈

- TypeScript (strict mode)
- Commander.js (CLI 框架)
- Axios (HTTP 请求)
- Cheerio (HTML 解析)

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev -- --keyword "test"

# 编译
npm run build

# 运行编译后的版本
npm start -- --keyword "test"
```

## 测试

项目包含多个测试脚本，使用示例数据验证功能：

```bash
# 基础测试（模拟数据）
npm test

# 测试 Reddit 数据处理
npm run test:reddit

# 测试 Twitter 数据处理
npm run test:twitter

# 综合测试（Reddit + Twitter）
npm run test:all
```

所有测试都会生成报告到 `./reports/` 目录。

## License

MIT
