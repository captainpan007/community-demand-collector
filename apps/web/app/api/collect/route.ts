import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUser, canRunCollect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runCollect, buildWordCloudChart, buildTrendChart } from '@demand-collector/core';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const AMAZON_AUTH_PATH = join(homedir(), '.demand-collector', 'amazon-auth.json');

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
    // amazon: 有 auth 文件走真实采集，否则 fallback mock
    const amazonAuthMissing = source === 'amazon' && !existsSync(AMAZON_AUTH_PATH);
    const isValidAsin = (s: string) => /^[A-Z0-9]{10}$/.test(s.trim().toUpperCase());
    const keywordIsAsin = source === 'amazon' && isValidAsin(keyword);
    const mock = source !== 'amazon' || amazonAuthMissing || !keywordIsAsin;
    console.log(`[collect] source=${source} mock=${mock} amazonAuthMissing=${amazonAuthMissing} authPath=${AMAZON_AUTH_PATH}`);
    const result = await runCollect({
      keyword,
      source: source as 'reddit' | 'hackernews' | 'trustpilot' | 'amazon',
      subreddits: subreddits ?? [],
      limit,
      mock,
    });
    if (amazonAuthMissing) {
      (result as Record<string, unknown>).demoMode = true;
    }

    const charts: string[] = [];
    try {
      const keywords = result.analysis?.keywords ?? new Map<string, number>();
      const wordCloudUrl = await buildWordCloudChart(keywords);
      if (wordCloudUrl) charts.push(wordCloudUrl);
    } catch {
      // ignore chart errors
    }

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        title: `${keyword} - ${source} - ${new Date().toLocaleDateString('zh-CN')}`,
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
