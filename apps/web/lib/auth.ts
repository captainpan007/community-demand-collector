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
  if (user.subscriptionStatus === 'active') return true;
  return user.monthlyQuotaUsed < 5;
}
