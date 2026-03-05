import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function parseTitle(title: string): { keyword: string; source: string } {
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return { keyword: parts[0]!.trim(), source: parts[1]!.trim() };
  }
  return { keyword: title, source: '-' };
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const reports = await prisma.report.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm text-white/60 transition hover:text-[#00C2FF]"
        >
          ← 控制台
        </Link>
        <Card className="mt-6 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="font-display text-xl text-white">
              历史报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="py-8 text-center text-white/60">
                暂无报告，去新建采集吧。
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-sm text-white/60">
                      <th className="pb-3 font-medium">关键词</th>
                      <th className="pb-3 font-medium">来源</th>
                      <th className="pb-3 font-medium">时间</th>
                      <th className="pb-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const { keyword, source } = parseTitle(r.title);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-white/5 transition hover:bg-white/5"
                        >
                          <td className="py-4 text-white">{keyword}</td>
                          <td className="py-4 text-white/80">{source}</td>
                          <td className="py-4 text-sm text-white/60">
                            {new Date(r.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-4 text-right">
                            <Link href={`/report/${r.id}`}>
                              <Button variant="ghost" size="sm">
                                查看
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
