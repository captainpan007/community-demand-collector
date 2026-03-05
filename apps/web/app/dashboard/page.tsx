import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const reportCount = user
    ? await prisma.report.count({ where: { userId: user.id } })
    : 0;
  const monthlyUsed = user?.monthlyQuotaUsed ?? 0;
  const isPro = user?.subscriptionStatus === 'active';
  const remaining = isPro ? '无限制' : `${Math.max(0, 5 - monthlyUsed)}`;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-white">控制台</h1>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D]">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-medium text-white/70">
                本月采集次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-[#00C2FF]">
                {monthlyUsed}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D]">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-medium text-white/70">
                剩余配额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-white">
                {remaining}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D]">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-medium text-white/70">
                报告总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-white">
                {reportCount}
              </p>
            </CardContent>
          </Card>
        </div>
        <h2 className="mt-12 font-display text-lg font-semibold text-white">
          快捷操作
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D] p-6 transition hover:border-[#00C2FF]/40">
            <CardHeader>
              <CardTitle className="font-display text-white">新建采集</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-white/60">
                输入关键词与来源，立即生成需求报告。
              </p>
              <Link href="/new">
                <Button>去新建</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D] p-6 transition hover:border-[#00C2FF]/40">
            <CardHeader>
              <CardTitle className="font-display text-white">历史报告</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-white/60">
                查看过往采集报告与图表。
              </p>
              <Link href="/history">
                <Button variant="secondary">查看历史</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-[#00C2FF]/20 bg-[#0F1B2D] p-6 transition hover:border-[#00C2FF]/40">
            <CardHeader>
              <CardTitle className="font-display text-white">设置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-white/60">
                订阅与配额、账户设置。
              </p>
              <Link href="/settings">
                <Button variant="outline">设置</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
