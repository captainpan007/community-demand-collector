import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          发现竞品弱点，抢占市场先机
        </h1>
        <p className="mt-6 text-lg text-white/70 sm:text-xl">
          从 Amazon、G2、Trustpilot 的真实差评中，提取买家痛点与需求信号
        </p>
        <div className="mt-10">
          {userId ? (
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold"
              >
                进入控制台
              </Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold"
              >
                免费开始分析
              </Button>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
