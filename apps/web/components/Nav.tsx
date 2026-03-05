import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0F1B2D]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0F1B2D]/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-bold text-white">
          DemandLens
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-white/80 transition hover:text-[#00C2FF]"
          >
            控制台
          </Link>
          <Link
            href="/history"
            className="text-sm text-white/80 transition hover:text-[#00C2FF]"
          >
            历史
          </Link>
          <Link
            href="/settings"
            className="text-sm text-white/80 transition hover:text-[#00C2FF]"
          >
            设置
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </nav>
  );
}
