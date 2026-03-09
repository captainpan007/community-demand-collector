import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUser, canRunCollect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runCollect, buildWordCloudChart, buildTrendChart } from '@demand-collector/core';

async function translateMissingTitles(
  topDemands: Array<Record<string, unknown>>
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;
  const missing = topDemands.filter((p) => !p.titleZh && p.title);
  if (missing.length === 0) return;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? '').replace(/\/$/, '');
  const apiUrl = process.env.OPENAI_API_URL ??
    (baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions');
  const model = process.env.OPENAI_MODEL ?? 'moonshot-v1-8k';
  const titles = missing.map((p, i) => `${i + 1}. ${p.title as string}`).join('\n');
  const prompt = `将以下电商评论标题翻译成简洁中文（每条不超过20字），保持原意。输出纯 JSON 数组，无 markdown，格式：["翻译1","翻译2"]:\n${titles}`;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '[]';
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()) as string[];
    if (Array.isArray(parsed)) {
      missing.forEach((p, i) => { if (parsed[i]) p.titleZh = parsed[i]; });
    }
  } catch (err) {
    console.warn('[collect] translateMissingTitles failed:', err);
  }
}

async function generateAISuggestions(
  keyword: string,
  source: string,
  topPosts: Array<{ title: string; titleZh?: string; content: string }>
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || topPosts.length === 0) return [];

  const baseUrl = (process.env.OPENAI_BASE_URL ?? '').replace(/\/$/, '');
  const apiUrl = process.env.OPENAI_API_URL ??
    (baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions');
  const model = process.env.OPENAI_MODEL ?? 'moonshot-v1-8k';

  const postsContext = topPosts.slice(0, 5).map((p, i) => {
    const zh = p.titleZh ? `（${p.titleZh}）` : '';
    return `${i + 1}. ${p.title}${zh}\n   ${p.content.slice(0, 200)}`;
  }).join('\n');

  const prompt = `你是资深出海电商产品顾问。以下是用户对产品"${keyword}"（平台：${source}）的真实评论痛点：

${postsContext}

请基于以上真实评论内容，生成3条具体的产品改进建议。要求：
1. 建议必须针对这个具体产品的实际痛点，不要套用通用模板
2. 每条建议包含具体改进方向和可落地的措施
3. 输出纯 JSON 数组，无 markdown 包裹，格式：["建议1", "建议2", "建议3"]`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '[]';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch (err) {
    console.warn('[collect] generateAISuggestions failed:', err);
    return [];
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const user = await getCurrentUser();
  if (!user || !canRunCollect(user)) {
    return NextResponse.json(
      { error: '免费用户本月采集次数已用完，请升级 Pro' },
      { status: 403 }
    );
  }

  let body: { keyword: string; source: string; subreddits?: string[]; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '无效 JSON' }, { status: 400 });
  }

  const { keyword, source, subreddits, limit = 100 } = body;
  if (!keyword || !source) {
    return NextResponse.json({ error: '缺少 keyword 或 source' }, { status: 400 });
  }

  try {
    const isValidAsin = (s: string) => /^[A-Z0-9]{10}$/.test(s.trim().toUpperCase());
    const keywordIsAsin = source === 'amazon' && isValidAsin(keyword);
    // Amazon: only mock if not a valid ASIN (collector handles ScraperAPI/Playwright/mock fallback internally)
    // Trustpilot: real Playwright scraping
    // Others: mock for now
    const mock =
      source === 'amazon' ? !keywordIsAsin :
      source === 'trustpilot' ? false :
      source === 'tiktokshop' ? true :
      source === 'shopee' ? true :
      true;
    console.log(`[collect] source=${source} mock=${mock}`);
    const result = await runCollect({
      keyword,
      source: source as 'reddit' | 'hackernews' | 'trustpilot' | 'amazon' | 'tiktokshop' | 'shopee',
      subreddits: subreddits ?? [],
      limit,
      mock,
    });
    // demoMode is propagated by runCollect from collector._demoMode
    // No additional check needed here - result.demoMode is set directly by runCollect

    // 翻译缺少中文标题的评论
    try {
      const allDemands = (result.analysis?.topDemands ?? []) as unknown as Array<Record<string, unknown>>;
      await translateMissingTitles(allDemands.slice(0, 5));
    } catch { /* ignore */ }

    // AI 改进建议：基于实际 topDemands 生成
    try {
      const topPosts = (result.analysis?.topDemands ?? [])
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, 5) as Array<{ title: string; titleZh?: string; content: string }>;
      const suggestions = await generateAISuggestions(keyword, source, topPosts);
      if (suggestions.length > 0) {
        (result as unknown as Record<string, unknown>).suggestions = suggestions;
      }
    } catch {
      // ignore, report page will show nothing
    }

    // Extract product title from Amazon reviews (stored per-post by collector)
    const productTitle: string | null =
      source === 'amazon'
        ? ((result.analysis?.topDemands?.[0] as unknown as Record<string, unknown>)?.productTitle as string | null) ?? null
        : null;
    if (productTitle) {
      (result as unknown as Record<string, unknown>).productTitle = productTitle;
    }

    const charts: string[] = [];
    try {
      const keywords = result.analysis?.keywords ?? new Map<string, number>();
      const wordCloudUrl = await buildWordCloudChart(keywords);
      if (wordCloudUrl) charts.push(wordCloudUrl);
    } catch {
      // ignore chart errors
    }

    const isValidAsin2 = (s: string) => /^[A-Z0-9]{10}$/.test(s.trim().toUpperCase());
    const platformLabel: Record<string, string> = {
      amazon: 'Amazon',
      tiktokshop: 'TikTok Shop',
      shopee: 'Shopee',
      trustpilot: 'Trustpilot',
      reddit: 'Reddit',
      hackernews: 'Hacker News',
    };
    const label = platformLabel[source] ?? source;
    const baseTitle =
      source === 'amazon'
        ? (productTitle ?? (isValidAsin2(keyword) ? `Amazon 商品 ${keyword.toUpperCase()}` : null) ?? 'Amazon 商品')
        : keyword;
    const reportTitle = `${baseTitle} - ${label}`;
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        title: reportTitle,
        reportData: JSON.stringify(result),
        charts: JSON.stringify(charts),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { monthlyQuotaUsed: { increment: 1 } },
    });

    return NextResponse.json({ reportId: report.id });
  } catch (err) {
    console.error('[collect] ERROR:', err);
    if (err instanceof Error && (err as NodeJS.ErrnoException & { cause?: unknown }).cause) {
      console.error('[collect] CAUSE:', (err as NodeJS.ErrnoException & { cause?: unknown }).cause);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '采集失败' },
      { status: 500 }
    );
  }
}
