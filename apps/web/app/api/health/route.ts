import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const env = {
    hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    hasSecretKey: !!process.env.CLERK_SECRET_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  let db = { connected: false, error: '', userCount: -1 };
  try {
    const count = await prisma.user.count();
    db = { connected: true, error: '', userCount: count };
  } catch (e: unknown) {
    db = { connected: false, error: String(e instanceof Error ? e.message : e), userCount: -1 };
  }

  return NextResponse.json({ status: 'ok', env, db });
}
