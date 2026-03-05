'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? '创建 Checkout 失败');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('未返回 Checkout URL');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建 Checkout 失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} size="sm">
        {loading ? '创建中…' : '升级 Pro'}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
