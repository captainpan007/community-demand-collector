import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Nav } from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'DemandLens - 竞品评论情报分析',
  description: '从 Amazon、G2、Trustpilot 的真实差评中，提取买家痛点与需求信号',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''}
    >
      <html lang="zh-CN">
        <body className="min-h-screen antialiased">
          <Nav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
