import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubscribeButton } from '@/components/SubscribeButton';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isPro = user.subscriptionStatus === 'active';
  const remaining = isPro ? '无限制' : `${Math.max(0, 5 - user.monthlyQuotaUsed)} 次/月`;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm text-white/60 transition hover:text-[#00C2FF]"
        >
          ← 控制台
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-white">
          订阅与配额
        </h1>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="font-display text-lg text-white">
                Free
              </CardTitle>
              <p className="text-sm text-white/60">适合轻度使用</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-white/80">
                <li>• 每月 5 次采集</li>
                <li>• 基础报告</li>
                <li>• 词云图表</li>
              </ul>
              <div className="pt-2">
                {!isPro && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    当前方案
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#00C2FF]/40 bg-white/5 shadow-glow">
            <CardHeader>
              <CardTitle className="font-display text-lg text-[#00C2FF]">
                Pro
              </CardTitle>
              <p className="text-sm text-white/60">无限采集，深度分析</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-white/80">
                <li>• 无限次采集</li>
                <li>• 完整报告与趋势图</li>
                <li>• 优先支持</li>
              </ul>
              <div className="space-y-2 pt-2">
                {isPro && (
                  <Badge className="bg-[#00C2FF]/20 text-[#00C2FF]">
                    当前方案
                  </Badge>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">本月剩余</span>
                  <span className="font-semibold text-white">{remaining}</span>
                </div>
                {!isPro && <SubscribeButton />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
