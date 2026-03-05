import axios from 'axios';
import { AppConfig } from '../config';
import { StoredReportData } from '../types';

export async function buildWordCloudChart(
  keywords: Map<string, number>,
  config: AppConfig,
): Promise<string | null> {
  if (!config.quickChart.enabled || keywords.size === 0) return null;

  const labels: string[] = [];
  const data: number[] = [];
  let count = 0;
  for (const [word, value] of keywords) {
    labels.push(word);
    data.push(value);
    if (++count >= 50) break;
  }

  const chartConfig = {
    type: 'wordcloud',
    data: {
      labels,
      datasets: [
        {
          data,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: 'Keyword Cloud',
      },
    },
  };

  const url = `${config.quickChart.baseUrl}?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=${
    config.quickChart.width
  }&h=${config.quickChart.height}`;
  return url;
}

export async function buildTrendChart(
  history: StoredReportData[],
  config: AppConfig,
): Promise<string | null> {
  if (!config.quickChart.enabled || history.length < 2) return null;

  const labels = history.map((h) => h.generatedAt.slice(0, 10));
  const data = history.map((h) => h.analysis.totalPosts);

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total posts',
          data,
          fill: false,
          borderColor: 'rgb(75,192,192)',
          tension: 0.1,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: 'Demand Trend',
      },
    },
  };

  const url = `${config.quickChart.baseUrl}?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=${
    config.quickChart.width
  }&h=${config.quickChart.height}`;
  return url;
}

