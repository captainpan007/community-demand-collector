'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SOURCES = [
  { id: 'hackernews' as const, label: 'Hacker News', icon: 'HN', enabled: true },
  { id: 'reddit' as const, label: 'Reddit', icon: 'R', enabled: true },
  { id: 'amazon' as const, label: 'Amazon', icon: 'AMZ', enabled: true },
  { id: 'trustpilot' as const, label: 'Trustpilot', icon: 'TP', enabled: true },
  { id: 'g2' as const, label: 'G2', icon: 'G2', enabled: false },
] as const;

export default function NewPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<'reddit' | 'hackernews' | 'amazon' | 'trustpilot'>('hackernews');
  const [subreddits, setSubreddits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = SOURCES.find((s) => s.id === source);
    if (selected && !selected.enabled) {
      setError('该来源即将推出');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          source,
          subreddits: source === 'reddit' ? subreddits.split(/[\s,]+/).filter(Boolean) : undefined,
          limit: 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '采集失败');
      router.push(`/report/${data.reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '采集失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm text-white/60 transition hover:text-[#00C2FF]"
        >
          ← 控制台
        </Link>
        <Card className="mt-6 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="font-display text-xl text-white">
              新建采集
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="keyword" className="text-white/80">
                  关键词
                </Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={source === 'amazon' ? '例如：B08F7PTF53' : '例如：Anker 充电器 差评'}
                  required
                  className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-[#00C2FF] focus:ring-[#00C2FF]/50"
                />
                <p className="mt-1.5 text-xs text-white/50">
                  {source === 'amazon'
                    ? 'Amazon 请输入 ASIN（如 B08F7PTF53）；其他平台可输入中英文关键词'
                    : '支持中英文关键词，如：AI meeting tool、AI 会议工具'}
                </p>
                {source === 'amazon' && /[\u4e00-\u9fa5]/.test(keyword) && (
                  <p className="mt-1 text-xs text-yellow-400/80">
                    ⚠ 检测到中文关键词：Amazon 评论为英文，建议改用英文关键词或直接输入 ASIN
                  </p>
                )}
              </div>
              <div>
                <Label className="text-white/80">来源</Label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SOURCES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => s.enabled && setSource(s.id)}
                      disabled={!s.enabled}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-lg border-2 py-4 transition',
                        source === s.id
                          ? 'border-[#00C2FF] bg-[#00C2FF]/10 text-[#00C2FF]'
                          : s.enabled
                            ? 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'
                            : 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
                      )}
                    >
                      <span className="font-display text-lg font-bold">
                        {s.icon}
                      </span>
                      <span className="mt-1 text-xs">{s.label}</span>
                      {!s.enabled && (
                        <span className="absolute right-1 top-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                          即将推出
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {source === 'reddit' && (
                <div>
                  <Label htmlFor="subreddits" className="text-white/80">
                    子版块（逗号或空格分隔）
                  </Label>
                  <Input
                    id="subreddits"
                    value={subreddits}
                    onChange={(e) => setSubreddits(e.target.value)}
                    placeholder="AI_Agents, LocalLLaMA"
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-[#00C2FF] focus:ring-[#00C2FF]/50"
                  />
                </div>
              )}
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <Button type="submit" disabled={loading} size="lg">
                {loading ? '采集中…' : '开始采集'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
