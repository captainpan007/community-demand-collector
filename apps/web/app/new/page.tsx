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
  { id: 'tiktokshop' as const, label: 'TikTok Shop', icon: 'TT', enabled: true },
  { id: 'shopee' as const, label: 'Shopee 东南亚', icon: 'SP', enabled: true },
  { id: 'g2' as const, label: 'G2', icon: 'G2', enabled: false },
] as const;

function extractAsin(input: string): string | null {
  // Handle bare ASIN
  if (/^[A-Z0-9]{10}$/i.test(input.trim())) return input.trim().toUpperCase();
  // Handle /dp/ASIN or /gp/product/ASIN or /product/ASIN
  const m = input.match(/(?:\/dp\/|\/gp\/product\/|\/product\/)([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : null;
}

export default function NewPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [asinHint, setAsinHint] = useState<string | null>(null);
  const [source, setSource] = useState<'reddit' | 'hackernews' | 'amazon' | 'trustpilot' | 'tiktokshop' | 'shopee'>('hackernews');
  const [subreddits, setSubreddits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleKeywordChange(val: string) {
    if (source === 'amazon') {
      const asin = extractAsin(val);
      if (asin) {
        setKeyword(asin);
        setAsinHint(`已识别 ASIN: ${asin}`);
        return;
      }
    }
    setKeyword(val);
    setAsinHint(null);
  }

  function handleSourceChange(id: typeof source) {
    setSource(id);
    setAsinHint(null);
  }

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
                  onChange={(e) => handleKeywordChange(e.target.value)}
                  placeholder={source === 'amazon' ? '例如：B08F7PTF53 或粘贴 Amazon 商品链接' : '例如：Anker 充电器 差评'}
                  required
                  className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-[#00C2FF] focus:ring-[#00C2FF]/50"
                />
                <p className="mt-1.5 text-xs text-white/50">
                  {source === 'amazon'
                    ? '支持直接输入 ASIN（如 B08F7PTF53）或粘贴完整 Amazon 商品链接'
                    : '支持中英文关键词，如：AI meeting tool、AI 会议工具'}
                </p>
                {asinHint && (
                  <p className="mt-1 text-xs text-green-400/90">{asinHint}</p>
                )}
                {source === 'amazon' && !asinHint && /[\u4e00-\u9fa5]/.test(keyword) && (
                  <p className="mt-1 text-xs text-yellow-400/80">
                    ⚠ 检测到中文关键词：Amazon 评论为英文，建议改用英文关键词或直接输入 ASIN
                  </p>
                )}
              </div>
              <div>
                <Label className="text-white/80">来源</Label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {SOURCES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => s.enabled && handleSourceChange(s.id)}
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
