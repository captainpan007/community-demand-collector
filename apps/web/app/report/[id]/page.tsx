import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  url: string;
  score: number;
  commentCount: number;
  createdAt: string;
  platform: string;
  titleZh?: string;
  summaryZh?: string;
  painPoints?: string[];
  sentiment?: string;
}

interface ReportData {
  config: { keyword: string; source: string };
  analysis: {
    totalPosts: number;
    topDemands: Post[];
    summary?: string;
  };
}

function extractTopWords(posts: Post[]): string[] {
  const text = posts
    .slice(0, 5)
    .map((p) => p.titleZh ?? p.title)
    .join(' ')
    .toLowerCase();
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'was', 'are', 'i', 'my', 'it', 'this', 'that',
    'not', 'no', 'just', 'very', 'so', 'after', 'its',
  ]);
  const freq: Record<string, number> = {};
  for (const w of text.split(/[\s\W]+/)) {
    if (w.length < 3 || stopwords.has(w)) continue;
    freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const report = await prisma.report.findFirst({
    where: { id, userId: user.id },
  });
  if (!report) notFound();

  let reportData: ReportData | null = null;
  let charts: string[] = [];
  try {
    if (report.reportData) reportData = JSON.parse(report.reportData) as ReportData;
    if (report.charts) charts = JSON.parse(report.charts) as string[];
  } catch {
    // ignore
  }

  const posts: Post[] = reportData?.analysis?.topDemands ?? [];
  const config = reportData?.config;
  const total = reportData?.analysis?.totalPosts ?? posts.length;

  // 负面评论：score > 40 (对应 1-2 星)
  const negCount = posts.filter((p) => p.score > 40).length;
  const negRatio = total > 0 ? negCount / total : 0;
  const verdict = negRatio >= 0.4 ? '✅ 建议测品' : '⚠️ 谨慎入场';
  const verdictColor = negRatio >= 0.4 ? 'text-green-400' : 'text-yellow-400';
  const verdictBg = negRatio >= 0.4 ? 'bg-green-400/10 border-green-400/30' : 'bg-yellow-400/10 border-yellow-400/30';

  const topWords = extractTopWords(posts);

  // Top3 痛点：按 score 降序取前3
  const top3 = [...posts].sort((a, b) => b.score - a.score).slice(0, 3);

  const platformLabel: Record<string, string> = {
    amazon: 'Amazon',
    reddit: 'Reddit',
    hackernews: 'Hacker News',
    trustpilot: 'Trustpilot',
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/history" className="text-sm text-white/60 transition hover:text-[#00C2FF]">
          ← 历史报告
        </Link>

        {/* 顶部信息 */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">
            {config?.keyword ?? report.title}
          </h1>
          {config?.source && (
            <span className="rounded-full bg-[#00C2FF]/20 px-3 py-0.5 text-xs font-medium text-[#00C2FF]">
              {platformLabel[config.source] ?? config.source}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/50">
          {new Date(report.createdAt).toLocaleString('zh-CN')} · 共采集 {total} 条评论
        </p>

        {/* 选品结论卡片 */}
        {posts.length > 0 && (
          <div className={`mt-6 rounded-xl border p-5 ${verdictBg}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/50">选品结论</p>
                <p className={`mt-1 text-2xl font-bold ${verdictColor}`}>{verdict}</p>
                <p className="mt-2 text-sm text-white/70">
                  {total} 条评论中 <span className="font-semibold text-white">{negCount} 条</span>为差评
                  （{Math.round(negRatio * 100)}%）
                  {negRatio >= 0.4
                    ? '，买家痛点集中，存在改良切入机会。'
                    : '，差评占比较低，竞争格局相对成熟，需谨慎评估。'}
                </p>
                {topWords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topWords.map((w) => (
                      <span
                        key={w}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80"
                      >
                        #{w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-4xl">{negRatio >= 0.4 ? '🎯' : '⚖️'}</span>
            </div>
          </div>
        )}

        {/* 买家痛点 Top3 */}
        {top3.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-white">买家痛点 Top {top3.length}</h2>
            <div className="mt-3 space-y-3">
              {top3.map((post, i) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/8"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00C2FF]/20 text-sm font-bold text-[#00C2FF]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white leading-snug">
                        {post.titleZh ?? post.title}
                      </p>
                      {post.titleZh && (
                        <p className="mt-0.5 text-xs text-white/40">{post.title}</p>
                      )}
                      {post.content && (
                        <p className="mt-2 text-sm text-white/60 leading-relaxed">
                          {post.content.slice(0, 120)}{post.content.length > 120 ? '…' : ''}
                        </p>
                      )}
                      {post.painPoints && post.painPoints.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {post.painPoints.map((p, j) => (
                            <li key={j} className="text-xs text-red-400/90 before:mr-1 before:content-['·']">
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs text-white/40">
                          热度 {post.score} · {post.author}
                        </span>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00C2FF] hover:underline"
                        >
                          查看原评论 →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 词云 */}
        {charts.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-white">高频词云</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <img src={charts[0]} alt="词云" className="w-full" />
            </div>
          </div>
        )}

        {/* 全部评论（折叠） */}
        {posts.length > 0 && (
          <div className="mt-8">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8">
                <h2 className="font-display text-lg font-semibold text-white">
                  全部评论（{posts.length} 条）
                </h2>
                <span className="text-sm text-white/50 transition group-open:hidden">展开 ▾</span>
                <span className="hidden text-sm text-white/50 group-open:inline">收起 ▴</span>
              </summary>
              <div className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
                {posts.map((post) => (
                  <div key={post.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white/90">
                        {post.titleZh ?? post.title}
                      </p>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                        post.score > 60 ? 'bg-red-500/20 text-red-400' :
                        post.score > 40 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {post.score > 60 ? '差评' : post.score > 40 ? '一般' : '好评'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      {post.author} · {new Date(post.createdAt).toLocaleDateString('zh-CN')} ·{' '}
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[#00C2FF]/70 hover:text-[#00C2FF]">
                        原文
                      </a>
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
