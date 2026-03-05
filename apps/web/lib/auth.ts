import { auth } from '@clerk/nextjs/server';
import { prisma } from './prisma';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId },
    });
  }
  return user;
}

export function canRunCollect(user: { subscriptionStatus: string | null; monthlyQuotaUsed: number }) {
  const isPro = true; // TODO: 上线前删除此行
  if (isPro) return true;
  if (user.subscriptionStatus === 'active') return true;
  return user.monthlyQuotaUsed < 5;
}
