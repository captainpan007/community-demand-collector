import * as fs from 'fs';
import * as path from 'path';
import { ReportData } from '../types';
import { DemandRanker } from '../analyzers/demand-ranker';

function escapeCsv(s: string): string {
  if (!/[\n",]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export class CsvReporter {
  private readonly ranker = new DemandRanker();

  generate(data: ReportData, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const extended = data as ReportData & {
      charts?: { wordCloudUrl?: string; trendUrl?: string };
    };
    const lines: string[] = [];

    if (extended.charts?.wordCloudUrl) {
      lines.push(`__wordcloud_url__,${escapeCsv(extended.charts.wordCloudUrl)}`);
    }
    if (extended.charts?.trendUrl) {
      lines.push(`__trend_url__,${escapeCsv(extended.charts.trendUrl)}`);
    }
    lines.push('rank,title,titleZh,author,score,comments,engagement,date,url,summaryZh');

    extended.analysis.topDemands.forEach((post, i) => {
      const eng = this.ranker.engagementScore(post);
      lines.push(
        [
          i + 1,
          escapeCsv(post.title),
          escapeCsv(post.titleZh || ''),
          escapeCsv(post.author),
          post.score,
          post.commentCount,
          eng,
          post.createdAt.toISOString().slice(0, 10),
          escapeCsv(post.url),
          escapeCsv((post.summaryZh || '').replace(/\n/g, ' ')),
        ].join(','),
      );
    });
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(`\nCSV saved → ${outputPath}`);
  }
}

