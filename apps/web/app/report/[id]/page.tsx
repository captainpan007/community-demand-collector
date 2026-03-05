import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const report = await prisma.report.findFirst({
    where: { id, userId: user.id },
  });
  if (!report) notFound();

  let reportData: unknown = null;
  let charts: string[] = [];
  try {
    if (report.reportData) reportData = JSON.parse(report.reportData);
    if (report.charts) charts = JSON.parse(report.charts);
  } catch {
    // ignore
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/history"
          className="text-sm text-white/60 transition hover:text-[#00C2FF]"
        >
          ← 历史报告
        </Link>
        <Card className="mt-6 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="font-display text-xl text-white">
              {report.title}
            </CardTitle>
            <p className="text-sm text-white/60">
              {new Date(report.createdAt).toLocaleString('zh-CN')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {reportData &&
              typeof reportData === 'object' &&
              'analysis' in (reportData as object) && (
                <div>
                  <h3 className="mb-2 font-display font-semibold text-white">
                    需求排行
                  </h3>
                  <pre className="max-h-96 overflow-auto rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/90">
                    {JSON.stringify(
                      (reportData as { analysis?: { topDemands?: unknown } })
                        .analysis?.topDemands,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            {charts.length > 0 && (
              <div>
                <h3 className="mb-2 font-display font-semibold text-white">
                  图表
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {charts.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Chart ${i + 1}`}
                      className="rounded-lg border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
