"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTranslator = void 0;

// ── 痛点检测规则（匹配英文内容 → 输出中文描述） ────────────────────────
const PAIN_RULES = [
    { re: /\b(hot|heat|overheat|burning|temperature|fire|thermal)\b/, pain: '充电时机身严重过热，存在安全隐患' },
    { re: /\b(slow|slower|7\.5w|10w|15w|watt|fast.charg|speed)\b/,   pain: '实际充电速度远低于宣传功率，存在虚标' },
    { re: /\b(stop.work|stopped|dead|fail|broke|broken|no longer|quit|died)\b/, pain: '产品耐久性差，短期内失效停止工作' },
    { re: /\b(noise|buzzing|hum|beep|sound|click|whine)\b/,           pain: '充电过程持续异响/嗡鸣，严重影响使用' },
    { re: /\b(align|coil|position|spot|1cm|exact|small.area|offset)\b/, pain: '线圈对齐容差极小，放置位置苛刻' },
    { re: /\b(light|led|bright|glow|illuminate|blind)\b/,             pain: '指示灯亮度过强，夜间严重影响睡眠' },
    { re: /\b(case|cover|sleeve|protect|thick|3mm|5mm|shell)\b/,      pain: '穿透手机壳能力不足，需裸机才能充电' },
    { re: /\b(disconnect|random|interrupt|inconsistent|unstable|stop.+charg)\b/, pain: '充电过程随机断开重连，稳定性差' },
    { re: /\b(advertis|claim|mislead|false|lie|promis|spec)\b/,       pain: '产品参数涉嫌虚假宣传，实测与标称差距大' },
    { re: /\b(return|refund|seller|customer.service|support|response|warranty)\b/, pain: '售后服务响应慢，退换货流程繁琐' },
];

// ── 痛点 → 产品机会映射 ───────────────────────────────────────────────
const OPP_MAP = [
    { keyword: '过热',   opp: '开发具备智能控温与石墨烯散热的安全充电器' },
    { keyword: '速度',   opp: '推出经第三方实测认证的真实快充产品' },
    { keyword: '耐久',   opp: '以 18 个月质保 + 免费换新为差异化卖点' },
    { keyword: '异响',   opp: '针对卧室场景优化的静音无线充电器' },
    { keyword: '线圈',   opp: '宽容差大面积线圈设计，配合磁吸精准定位' },
    { keyword: '指示灯', opp: '提供亮度可调或无灯版本，改善卧室体验' },
    { keyword: '穿透',   opp: '推出支持 5mm+ 厚壳的高穿透力无线充电器' },
    { keyword: '稳定',   opp: '磁吸固定设计，彻底解决充电中断问题' },
    { keyword: '宣传',   opp: '主打"实测数据公开"建立差异化信任' },
    { keyword: '售后',   opp: '推出 90 天无理由换货品质承诺，降低购买顾虑' },
];

function extractInsights(post) {
    const text = (post.title + ' ' + post.content).toLowerCase();

    const matched = PAIN_RULES.filter(r => r.re.test(text));
    const painPoints = matched.length > 0
        ? matched.slice(0, 3).map(r => r.pain)
        : [`用户反映"${post.title.slice(0, 25)}"相关使用问题`];

    const opportunities = [];
    for (const { keyword, opp } of OPP_MAP) {
        if (painPoints.some(p => p.includes(keyword))) {
            opportunities.push(opp);
            if (opportunities.length >= 2) break;
        }
    }
    if (opportunities.length === 0) opportunities.push('针对该痛点优化产品设计与用户体验');

    // 用原始 score 倒推星级（Trustpilot/Amazon: score=(5-stars)*20，越高越负面）
    const sentimentScore = post.score >= 80 ? -0.85 : post.score >= 60 ? -0.55 : post.score >= 40 ? -0.2 : 0.4;
    const sentiment = sentimentScore <= -0.3 ? 'negative' : sentimentScore >= 0.2 ? 'positive' : 'neutral';
    const priority = post.score >= 60 ? 'high' : 'medium';

    const priorityLabel = priority === 'high' ? '高' : '中';
    const summaryZh = [
        `- **痛点强度**：${sentiment === 'negative' ? '强烈不满' : sentiment === 'neutral' ? '轻微抱怨' : '正面反馈'}（情感分 ${sentimentScore.toFixed(1)}）`,
        `- **核心问题**：${painPoints[0]}`,
        `- **市场信号**：该类诉求在同类产品评论中高频出现，具备规模化改善空间`,
        `- **建议优先级**：${priorityLabel}——${priority === 'high' ? '直接影响复购率和评分，应优先解决' : '影响体验但非致命，可排期优化'}`,
    ].join('\n');

    return { sentiment, sentimentScore, priority, painPoints, opportunities, summaryZh };
}

class MockTranslator {
    async translate(posts) {
        console.log(`[MockTranslator] 正在处理 ${posts.length} 条分析请求（基于内容提取痛点）...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        return posts.map(post => {
            const insights = extractInsights(post);
            return {
                ...post,
                titleZh: `[Mock] ${post.title}`,
                ...insights,
            };
        });
    }
}
exports.MockTranslator = MockTranslator;
//# sourceMappingURL=mock.js.map