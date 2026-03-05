"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWordCloudChart = buildWordCloudChart;
exports.buildTrendChart = buildTrendChart;
const config_1 = require("../config");
function resolveQuickChartConfig(override) {
    const base = (0, config_1.getConfig)();
    const mergedQuick = {
        ...base.quickChart,
        ...(override?.quickChart ?? {}),
    };
    return { app: base, quick: mergedQuick };
}
function buildWordCloudChart(keywords, configOverride) {
    const { quick } = resolveQuickChartConfig(configOverride);
    if (!quick.enabled)
        return '';
    const entries = keywords instanceof Map
        ? [...keywords.entries()]
        : Object.entries(keywords).map(([k, v]) => [k, Number(v)]);
    if (entries.length === 0)
        return '';
    // 按权重降序，取前 50 个
    const top = entries
        .filter(([, v]) => Number.isFinite(v))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
    if (top.length === 0)
        return '';
    // QuickChart wordcloud 接口：text=word1:10,word2:5,...
    const text = top
        .map(([word, value]) => `${word}:${Math.max(1, Math.round(value))}`)
        .join(',');
    // 若 baseUrl 指向 /chart，则自动切成 /wordcloud
    let baseUrl = quick.baseUrl;
    if (baseUrl.endsWith('/chart')) {
        baseUrl = baseUrl.replace(/\/chart$/, '/wordcloud');
    }
    else if (!baseUrl.endsWith('/wordcloud')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/wordcloud';
    }
    const params = new URLSearchParams();
    params.set('text', text);
    params.set('width', String(quick.width));
    params.set('height', String(quick.height));
    return `${baseUrl}?${params.toString()}`;
}
function buildTrendChart(historyReports, configOverride) {
    const { quick } = resolveQuickChartConfig(configOverride);
    if (!quick.enabled)
        return '';
    if (!historyReports.length)
        return '';
    // 按时间升序
    const sorted = [...historyReports].sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
    const labels = sorted.map((r) => r.generatedAt.slice(0, 10));
    const data = sorted.map((r) => r.analysis.totalPosts);
    const chartConfig = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total posts',
                    data,
                    fill: false,
                    borderColor: quick.theme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
                    tension: 0.1,
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    };
    const params = new URLSearchParams();
    params.set('c', JSON.stringify(chartConfig));
    params.set('w', String(quick.width));
    params.set('h', String(quick.height));
    const baseUrl = quick.baseUrl.endsWith('/chart')
        ? quick.baseUrl
        : quick.baseUrl.replace(/\/$/, '') + '/chart';
    return `${baseUrl}?${params.toString()}`;
}
//# sourceMappingURL=quickchart.js.map