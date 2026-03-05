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
exports.MarkdownReporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const demand_ranker_1 = require("../analyzers/demand-ranker");
class MarkdownReporter {
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
        const { config, analysis, generatedAt } = data;
        const lines = [];
        // ── 封面 ──────────────────────────────────────────────────────────
        lines.push(`# Community Demand Report`);
        lines.push('');
        lines.push(`| 字段 | 值 |`);
        lines.push(`|------|----|`);
        lines.push(`| 关键词 | \`${config.keyword}\` |`);
        lines.push(`| 平台 | ${config.source} |`);
        lines.push(`| 采集帖子数 | ${analysis.totalPosts} |`);
        lines.push(`| 生成时间 | ${generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC |`);
        lines.push('');
        // ── 可视化 ────────────────────────────────────────────────────────
        if (data.charts?.wordCloudUrl || data.charts?.trendUrl) {
            lines.push('## 可视化图表');
            lines.push('');
            if (data.charts?.wordCloudUrl) {
                lines.push(`![Keyword Cloud](${data.charts.wordCloudUrl})`);
                lines.push('');
            }
            if (data.charts?.trendUrl) {
                lines.push(`![Trend](${data.charts.trendUrl})`);
                lines.push('');
            }
        }
        // ── 执行摘要 ──────────────────────────────────────────────────────
        lines.push(`## 执行摘要`);
        lines.push('');
        lines.push(analysis.summary);
        lines.push('');
        // ── 高频关键词 ────────────────────────────────────────────────────
        lines.push(`## 高频关键词 Top 20`);
        lines.push('');
        lines.push('| 排名 | 关键词 | 出现次数 |');
        lines.push('|------|--------|----------|');
        let rank = 1;
        for (const [word, count] of analysis.keywords) {
            if (rank > 20)
                break;
            lines.push(`| ${rank++} | ${word} | ${count} |`);
        }
        lines.push('');
        // ── 热度 Top 帖子 ─────────────────────────────────────────────────
        lines.push(`## 高热度帖子 Top ${analysis.topDemands.length}`);
        lines.push('');
        lines.push('> 热度得分 = 点赞数 + 评论数 × 2');
        lines.push('');
        analysis.topDemands.forEach((post, i) => {
            const engScore = this.ranker.engagementScore(post);
            const priorityBadge = post.priority === 'high' ? '🔴 高' : post.priority === 'medium' ? '🟡 中' : post.priority === 'low' ? '🟢 低' : '';
            const sentimentBadge = post.sentiment === 'negative' ? '😠 负面' : post.sentiment === 'positive' ? '😊 正面' : post.sentiment === 'neutral' ? '😐 中性' : '';
            const titleDisplay = post.titleZh ? `${post.titleZh}` : post.title;
            lines.push(`### ${i + 1}. ${titleDisplay}`);
            if (post.titleZh) {
                lines.push('');
                lines.push(`> *原文：${post.title}*`);
            }
            lines.push('');
            lines.push(`| 字段 | 值 |`);
            lines.push(`|------|----|`);
            lines.push(`| 作者 | u/${post.author} |`);
            lines.push(`| 点赞 | ${post.score} |`);
            lines.push(`| 评论 | ${post.commentCount} |`);
            lines.push(`| 热度得分 | **${engScore}** |`);
            if (priorityBadge) lines.push(`| 优先级 | ${priorityBadge} |`);
            if (sentimentBadge) {
                const scoreStr = post.sentimentScore !== undefined ? ` (${post.sentimentScore >= 0 ? '+' : ''}${post.sentimentScore.toFixed(2)})` : '';
                lines.push(`| 情感 | ${sentimentBadge}${scoreStr} |`);
            }
            lines.push(`| 发布日期 | ${post.createdAt.toISOString().slice(0, 10)} |`);
            lines.push(`| 链接 | [查看原帖](${post.url}) |`);
            lines.push('');
            if (post.painPoints && post.painPoints.length > 0) {
                lines.push(`**🔥 核心痛点**`);
                lines.push('');
                post.painPoints.forEach(p => lines.push(`- ${p}`));
                lines.push('');
            }
            if (post.opportunities && post.opportunities.length > 0) {
                lines.push(`**💡 产品机会**`);
                lines.push('');
                post.opportunities.forEach(o => lines.push(`- ${o}`));
                lines.push('');
            }
            if (post.summaryZh) {
                lines.push(`**📊 商业分析**`);
                lines.push('');
                post.summaryZh.split('\n').forEach(line => lines.push(line));
                lines.push('');
            }
            else if (post.content.trim()) {
                const preview = post.content.replace(/\n+/g, ' ').trim().slice(0, 300);
                lines.push(`**内容摘要：**`);
                lines.push('');
                lines.push(`> ${preview}${post.content.length > 300 ? '…' : ''}`);
                lines.push('');
            }
            lines.push('---');
            lines.push('');
        });
        // ── 完整帖子列表 ──────────────────────────────────────────────────
        lines.push(`## 全部采集帖子`);
        lines.push('');
        lines.push('| # | 标题 | 作者 | 点赞 | 评论 | 日期 | 链接 |');
        lines.push('|---|------|------|------|------|------|------|');
        data.analysis.topDemands.forEach((post, i) => {
            const date = post.createdAt.toISOString().slice(0, 10);
            const title = post.title.length > 50 ? post.title.slice(0, 47) + '…' : post.title;
            lines.push(`| ${i + 1} | ${title} | u/${post.author} | ${post.score} | ${post.commentCount} | ${date} | [链接](${post.url}) |`);
        });
        lines.push('');
        // ── 综合结论 ──────────────────────────────────────────────────────
        const conclusionLines = this.buildConclusion(data);
        if (conclusionLines.length > 0) {
            lines.push(...conclusionLines);
        }
        lines.push('---');
        lines.push('');
        lines.push(`*Generated by community-demand-collector*`);
        return lines.join('\n');
    }
    buildConclusion(data) {
        const posts = data.analysis.topDemands;
        const translated = posts.filter(p => p.painPoints && p.painPoints.length > 0);
        if (translated.length === 0) return [];
        const total = data.analysis.totalPosts;
        // 主题归类规则（匹配中文痛点字符串）
        const THEMES = [
            { label: '过热 / 安全隐患',   re: /过热|散热|安全|温度|发烫/ },
            { label: '充电速度虚标',       re: /速度|功率|快充|虚标|宣传/ },
            { label: '耐用性差 / 短期失效', re: /耐久|停止工作|失效|损坏/ },
            { label: '充电稳定性差',       re: /中断|稳定|断开|随机/ },
            { label: '线圈对齐难',         re: /线圈|对齐|位置苛刻/ },
            { label: '穿透力不足',         re: /穿透|手机壳|裸机/ },
            { label: '异响 / 嗡鸣',        re: /异响|嗡鸣|噪音/ },
            { label: '指示灯过亮',         re: /指示灯|亮度|睡眠/ },
            { label: '售后服务差',         re: /售后|退换|客服/ },
            { label: '参数虚假宣传',       re: /虚假|标称|差距大/ },
        ];
        // 每个主题：出现在几条帖子里（按帖子计，不重复）
        const themeCounts = THEMES.map(theme => {
            const count = translated.filter(p =>
                p.painPoints.some(pp => theme.re.test(pp))
            ).length;
            return { label: theme.label, count };
        }).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
        if (themeCounts.length === 0) return [];
        // 汇总产品机会（去重取前3）
        const allOpps = [];
        for (const p of translated) {
            if (p.opportunities) allOpps.push(...p.opportunities);
        }
        const uniqueOpps = [...new Set(allOpps)].slice(0, 3);
        // 选品建议
        const highCount = translated.filter(p => p.priority === 'high').length;
        const negCount = translated.filter(p => p.sentiment === 'negative').length;
        const recommend = highCount >= Math.ceil(total * 0.5) ? '✅ 值得测品' : '⚠️ 谨慎评估';
        const topTheme = themeCounts[0]?.label ?? '';
        const direction = topTheme.replace(/ \/ .+/, '').replace(/差$/, '').replace(/难$/, '').trim();
        const lines = [];
        lines.push('## 📋 选品综合结论');
        lines.push('');
        lines.push(`**买家核心痛点（跨所有评论汇总）：**`);
        lines.push('');
        themeCounts.slice(0, 5).forEach((t, i) => {
            lines.push(`${i + 1}. ${t.label}（${t.count}/${total} 条提及）`);
        });
        lines.push('');
        if (uniqueOpps.length > 0) {
            lines.push(`**市场机会：** ${uniqueOpps.join('；')}`);
            lines.push('');
        }
        lines.push(`**选品建议：** ${recommend}，切入方向：${direction}`);
        lines.push('');
        return lines;
    }
}
exports.MarkdownReporter = MarkdownReporter;
//# sourceMappingURL=markdown.js.map