"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchMarkdownReporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const demand_ranker_1 = require("../analyzers/demand-ranker");
class BatchMarkdownReporter {
    constructor() {
        this.ranker = new demand_ranker_1.DemandRanker();
    }
    generate(data, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, this.build(data), 'utf-8');
        console.log(`\nReport saved → ${outputPath}`);
    }
    build(data) {
        const { keywords, source, subreddits, results, generatedAt } = data;
        const lines = [];
        // ── 标题 ──────────────────────────────────────────────────────────
        lines.push(`# Batch Demand Comparison Report`);
        lines.push('');
        lines.push(`| Field | Value |`);
        lines.push(`|-------|-------|`);
        lines.push(`| Keywords | ${keywords.map(k => `\`${k}\``).join(', ')} |`);
        lines.push(`| Platform | ${source} |`);
        lines.push(`| Subreddits | ${subreddits.length ? subreddits.join(', ') : '(all)'} |`);
        lines.push(`| Limit per keyword | ${data.limit} |`);
        lines.push(`| Generated at | ${generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC |`);
        lines.push('');
        // ── 对比总表 ──────────────────────────────────────────────────────
        lines.push(`## Comparison Overview`);
        lines.push('');
        lines.push('| Keyword | Posts | Top Keywords (3) | Hottest Post | Avg Engagement |');
        lines.push('|---------|-------|------------------|--------------|----------------|');
        for (const result of results) {
            const postCount = result.analysis.totalPosts;
            const topKw = this.topKeywords(result, 3);
            const hottest = this.hottestPostTitle(result);
            const avgEng = this.avgEngagement(result);
            lines.push(`| \`${result.keyword}\` | ${postCount} | ${topKw} | ${hottest} | ${avgEng} |`);
        }
        lines.push('');
        // ── 各关键词详情 ──────────────────────────────────────────────────
        for (const result of results) {
            lines.push(`## ${result.keyword}`);
            lines.push('');
            // 词频 Top 10
            lines.push(`### Keyword Frequency Top 10`);
            lines.push('');
            lines.push('| Rank | Keyword | Count |');
            lines.push('|------|---------|-------|');
            let rank = 1;
            for (const [word, count] of result.analysis.keywords) {
                if (rank > 10)
                    break;
                lines.push(`| ${rank++} | ${word} | ${count} |`);
            }
            lines.push('');
            // 热帖 Top 5
            const topPosts = result.analysis.topDemands.slice(0, 5);
            lines.push(`### Hot Posts Top ${topPosts.length}`);
            lines.push('');
            lines.push('> Engagement = upvotes + comments × 2');
            lines.push('');
            topPosts.forEach((post, i) => {
                const score = this.ranker.engagementScore(post);
                lines.push(`**${i + 1}. ${post.title}**`);
                lines.push('');
                lines.push(`| Field | Value |`);
                lines.push(`|-------|-------|`);
                lines.push(`| Author | u/${post.author} |`);
                lines.push(`| Upvotes | ${post.score} |`);
                lines.push(`| Comments | ${post.commentCount} |`);
                lines.push(`| Engagement | **${score}** |`);
                lines.push(`| Date | ${post.createdAt.toISOString().slice(0, 10)} |`);
                lines.push(`| Link | [View post](${post.url}) |`);
                lines.push('');
                if (post.titleZh) {
                    lines.push(`**💡 中译标题：${post.titleZh}**`);
                    lines.push('');
                }
                if (post.summaryZh) {
                    lines.push(`> **深度摘要 (商务视角)**`);
                    post.summaryZh.split('\n').forEach(line => {
                        lines.push(`> ${line}`);
                    });
                    lines.push('');
                }
                else if (post.content.trim()) {
                    const preview = post.content.replace(/\n+/g, ' ').trim().slice(0, 300);
                    lines.push(`**内容摘要：**`);
                    lines.push('');
                    lines.push(`> ${preview}${post.content.length > 300 ? '…' : ''}`);
                    lines.push('');
                }
            });
            lines.push('---');
            lines.push('');
        }
        lines.push(`*Generated by community-demand-collector (batch mode)*`);
        return lines.join('\n');
    }
    topKeywords(result, n) {
        const entries = [...result.analysis.keywords.entries()].slice(0, n);
        if (entries.length === 0)
            return '-';
        return entries.map(([w, c]) => `${w}(${c})`).join(', ');
    }
    hottestPostTitle(result) {
        if (result.analysis.topDemands.length === 0)
            return '-';
        const post = result.analysis.topDemands[0];
        const title = post.title.length > 40 ? post.title.slice(0, 37) + '…' : post.title;
        return title;
    }
    avgEngagement(result) {
        if (result.posts.length === 0)
            return '0';
        const total = result.posts.reduce((sum, p) => sum + this.ranker.engagementScore(p), 0);
        return (total / result.posts.length).toFixed(1);
    }
}
exports.BatchMarkdownReporter = BatchMarkdownReporter;
//# sourceMappingURL=batch-markdown.js.map