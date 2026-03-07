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
  demoMode?: boolean;
  suggestions?: string[];
  productTitle?: string;
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
  try {
    if (report.reportData) reportData = JSON.parse(report.reportData) as ReportData;
  } catch {
    // ignore
  }

  const posts: Post[] = reportData?.analysis?.topDemands ?? [];
  const config = reportData?.config;
  const total = reportData?.analysis?.totalPosts ?? posts.length;

  // 负面评论：score > 40 (对应 1-2 星)
  const negPosts = posts.filter((p) => p.score > 40);
  const negCount = negPosts.length;
  const negRatio = total > 0 ? negCount / total : 0;
  const hasOpportunity = negRatio >= 0.3;
  const verdict = hasOpportunity ? '🎯 存在市场机会' : '✅ 市场成熟，竞争激烈';
  const verdictDesc = hasOpportunity
    ? '买家痛点明显，现有竞品未能解决，有差异化切入空间'
    : '现有产品用户满意度高，入场需要明确差异化优势';
  const verdictColor = hasOpportunity ? 'text-green-400' : 'text-blue-400';
  const verdictBg = hasOpportunity ? 'bg-green-400/10 border-green-400/30' : 'bg-blue-400/10 border-blue-400/30';

  const topWords = extractTopWords(posts);

  // 痛点列表：差评数 < 3 只显示实际差评数，否则 Top5
  const painLimit = negCount < 3 ? negCount : 5;
  const top5 = [...negPosts].sort((a, b) => b.score - a.score).slice(0, painLimit);

  // 情感分布
  const posPosts = posts.filter((p) => p.score <= 20);
  const neuPosts = posts.filter((p) => p.score > 20 && p.score <= 40);
  const posPct = total > 0 ? Math.round((posPosts.length / total) * 100) : 0;
  const neuPct = total > 0 ? Math.round((neuPosts.length / total) * 100) : 0;
  const negPct = total > 0 ? Math.round((negPosts.length / total) * 100) : 0;

  // 改进建议：优先使用采集时 AI 生成的内容，无则不展示
  const suggestions: string[] = reportData?.suggestions ?? [];

  // 一句话行动结论
  const top1Label = top5[0]?.titleZh ?? top5[0]?.title ?? '核心痛点';
  const actionConclusion =
    negRatio > 0.5
      ? `✅ 值得入场 —— 建议切入点：解决「${top1Label}」问题`
      : negRatio >= 0.3
        ? '⚠️ 谨慎入场 —— 市场竞争激烈，需明确差异化优势'
        : '❌ 暂缓入场 —— 现有产品用户满意度高，入场需更强差异化';
  const actionBg =
    negRatio > 0.5
      ? 'bg-green-400/10 border-green-400/30 text-green-300'
      : negRatio >= 0.3
        ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300'
        : 'bg-red-400/10 border-red-400/30 text-red-300';

  function safeTitle(raw: string | undefined | null): string {
    if (!raw) return 'Amazon 商品';
    if (raw.startsWith('http')) {
      const m = raw.match(/(?:\/dp\/|\/gp\/product\/|\/product\/)([A-Z0-9]{10})/i);
      return m ? m[1].toUpperCase() : 'Amazon 商品';
    }
    return raw;
  }

  const isAsin = (s: string) => /^[A-Z0-9]{10}$/.test(s);
  const displayTitle =
    reportData?.productTitle ||
    (config?.keyword && isAsin(config.keyword) ? config.keyword : null) ||
    safeTitle(report.title) ||
    'Amazon 商品';

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
            {displayTitle}
          </h1>
          {config?.source && (
            <span className="rounded-full bg-[#00C2FF]/20 px-3 py-0.5 text-xs font-medium text-[#00C2FF]">
              {platformLabel[config.source] ?? config.source}
            </span>
          )}
        </div>
        {reportData?.productTitle && config?.keyword && (
          <p className="mt-0.5 text-xs text-white/40">ASIN: {config.keyword}</p>
        )}
        <p className="mt-1 text-sm text-white/50">
          {new Date(report.createdAt).toLocaleString('zh-CN')} · 共采集 {total} 条评论
        </p>

        {/* 演示数据提示 */}
        {reportData?.demoMode && (
          <div className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-300">
            ⚠️ 当前为演示数据，真实数据需要服务器完成 Amazon 登录授权。
          </div>
        )}

        {/* 选品结论卡片 */}
        {posts.length > 0 && (
          <div className={`mt-6 rounded-xl border p-5 ${verdictBg}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/50">选品结论</p>
                <p className={`mt-1 text-2xl font-bold ${verdictColor}`}>{verdict}</p>
                <p className="mt-2 text-sm text-white/70">
                  {total} 条评论中 <span className="font-semibold text-white">{negCount} 条</span>为差评
                  （{Math.round(negRatio * 100)}%）—— {verdictDesc}
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
              <span className="text-4xl">{hasOpportunity ? '🎯' : '⚖️'}</span>
            </div>
          </div>
        )}

        {/* 行动结论 */}
        {posts.length > 0 && (
          <div className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${actionBg}`}>
            {actionConclusion}
          </div>
        )}

        {/* 情感分布 */}
        {posts.length > 0 && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-white/50">整体情感分布</p>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
              {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-green-400" title={`好评 ${posPct}%`} />}
              {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-yellow-400" title={`中性 ${neuPct}%`} />}
              {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-400" title={`差评 ${negPct}%`} />}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-white/60">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400" />好评 {posPct}%（{posPosts.length} 条）</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-yellow-400" />中性 {neuPct}%（{neuPosts.length} 条）</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />差评 {negPct}%（{negPosts.length} 条）</span>
            </div>
          </div>
        )}

        {/* 买家痛点 Top5 */}
        {top5.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-white">买家痛点 Top {top5.length}</h2>
            <div className="mt-3 space-y-3">
              {top5.map((post, i) => {
                const attentionLabel = negCount >= 5
                  ? `${Math.round((1 / negCount) * 100)}% 关注`
                  : `仅 ${negCount} 条提及`;
                return (
                <div
                  key={post.id}
                  id={`pain-${i}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/8"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00C2FF]/20 text-sm font-bold text-[#00C2FF]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-white leading-snug">
                          {post.title}
                          {post.titleZh && (
                            <span className="ml-1 text-white/60">（{post.titleZh}）</span>
                          )}
                        </p>
                        <span className="shrink-0 rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                          {attentionLabel}
                        </span>
                      </div>
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
                );
              })}
            </div>
          </div>
        )}

        {/* 核心痛点标签 */}
        {top5.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-widest text-white/50">核心痛点标签</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {top5.map((post, i) => {
                const pct = negCount >= 5 ? Math.round((1 / negCount) * 100) : 0;
                const alpha = pct > 15 ? '0.30' : pct >= 10 ? '0.18' : '0.20';
                return (
                  <a
                    key={post.id}
                    href={`#pain-${i}`}
                    className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-medium text-red-300 transition hover:border-red-400/60"
                    style={{ backgroundColor: `rgba(248,113,113,${alpha})` }}
                  >
                    {(post.titleZh ?? post.title).slice(0, 30)}
                    {(post.titleZh ?? post.title).length > 30 ? '…' : ''}
                    {pct > 0 && <span className="ml-1 text-red-300/60">{pct}%</span>}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 改进建议 */}
        {suggestions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-white">产品改进建议</h2>
            <p className="mt-0.5 text-xs text-white/40">由 AI 基于真实评论痛点生成</p>
            <div className="mt-3 space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-[#00C2FF]/15 bg-[#00C2FF]/5 px-4 py-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00C2FF]/20 text-xs font-bold text-[#00C2FF]">
                    {i + 1}
                  </span>
                  <p className="text-sm text-white/80 leading-relaxed">{s}</p>
                </div>
              ))}
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
