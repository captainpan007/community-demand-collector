# Community Demand Collector

CLI tool to collect community user demands from Reddit/X/Twitter, analyze keyword frequency, and generate Markdown reports.

## Features

- Multi-platform collection (Reddit, Twitter)
- Automatic keyword analysis and demand ranking
- Markdown report generation
- Flexible CLI configuration
- Batch multi-keyword comparison

## Install

```bash
npm install
npm run build
```

## Usage

### Basic

```bash
# Collect from Reddit
node dist/index.js collect --keyword "AI agent memory" --source reddit --limit 100 --subreddits "AI_Agents,LocalLLaMA" --output ./reports/report.md

# Batch multi-keyword comparison
node dist/index.js batch --keywords "AI agent,LLM memory,RAG" --source reddit --limit 50 --subreddits "AI_Agents,LocalLLaMA"
```

### CLI Options

- `-k, --keyword <keyword>`: Search keyword (default: "feature request")
- `-s, --source <source>`: Platform (reddit, twitter) (default: reddit)
- `-l, --limit <number>`: Max posts to collect (default: 50)
- `-o, --output <path>`: Output file path (default: ./reports/report.md)
- `--subreddits <list>`: Comma-separated subreddit list
- `--mock`: Use mock data (for development/testing)

## Configuration

Copy `.env.example` to `.env` and fill in your API credentials:

```bash
cp .env.example .env
```

- **Reddit**: Public API, no auth required (rate-limited)
- **Twitter**: Requires API key from [Twitter Developer Portal](https://developer.twitter.com/)

## Report Output

Generated reports include:

- Top 20 keyword frequency analysis
- Top 10 demand ranking (by upvotes + comments)
- Post details (title, author, score, comments, link)

## Tech Stack

- TypeScript (strict mode)
- Commander.js (CLI framework)
- Axios (HTTP client)

## Development

```bash
npm install
npx tsc          # compile
npx vitest run   # run tests
```

## License

MIT
