# Community Demand Collector

CLI 工具：从 Reddit / Hacker News 采集社区需求，分析关键词，生成 Markdown / CSV 报告。

## Features

- **采集**：Reddit、Hacker News
- **分析**：TF-IDF + bigram 关键词，时间衰减热度排序
- **翻译**：Kimi / OpenAI 兼容接口，商业价值与优先级洞察
- **报告**：Markdown、CSV；支持 JSON 导出与 report 子命令

## Install

```bash
npm install
npm run build
```

## Usage

### collect — 单关键词采集

```bash
# Reddit
node dist/index.js collect -k "AI agent memory" -s reddit -l 100 -r "AI_Agents,LocalLLaMA" -o ./reports/report.md

# Hacker News
node dist/index.js collect -k "AI" -s hackernews -l 20 -f csv -o ./reports/hn.csv

# 带翻译 + JSON 导出
node dist/index.js collect -k "feature request" -t -j ./data/collect.json -o ./reports/report.md
```

### batch — 多关键词批量

```bash
node dist/index.js batch -K "AI agent,LLM memory,RAG" -s reddit -l 50
```

### report — 从 JSON 生成报告

```bash
node dist/index.js report -i ./data/collect.json -o ./reports/report.md
node dist/index.js report -i ./data/collect.json -f csv -o ./reports/report.csv
```

### CLI Options

| 命令 | 选项 | 说明 |
|------|------|------|
| collect | `-k, --keyword` | 搜索关键词（必填） |
| | `-s, --source` | reddit \| hackernews |
| | `-l, --limit` | 采集条数 |

| | `-r, --subreddits` | 子版块（reddit） |
| | `-t, --translate` | 启用 LLM 翻译 |
| | `-m, --mock` | Mock 翻译 |
| | `-o, --output` | 输出路径 |
| | `-f, --format` | md \| csv |
| | `-j, --json` | 导出 JSON |
| report | `-i, --input` | JSON 输入（必填） |
| | `-o, --output` | 输出路径 |
| | `-f, --format` | md \| csv |

## Configuration

```bash
cp .env.example .env
```

- **Reddit / Hacker News**：无鉴权，公开 API
- **LLM 翻译**：`OPENAI_API_KEY`、`OPENAI_BASE_URL`（如 `https://api.moonshot.cn/v1`）、`OPENAI_MODEL`（如 `kimi-k2.5`）

## Report Output

- 封面、执行摘要
- 高频关键词 Top 20（TF-IDF 加权）
- 高热度帖子 Top 10（含时间衰减）
- 中译标题、深度摘要（商业价值、优先级）

## Tech Stack

- TypeScript (strict mode)
- Commander.js (CLI framework)
- Axios (HTTP client)

## 文档

- [功能图](docs/功能图.md)：模块输入/输出、数据流
- [商业数据分析完善建议](docs/商业数据分析完善建议.md)：待完善项与优先级

## Development

```bash
npm install
npx tsc
npx ts-node src/test.ts
```

## License

MIT
