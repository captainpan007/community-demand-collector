import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

function isWhitelisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.SEED_USER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: userId, email },
    });
  } else if (email && user.email !== email) {
    user = await prisma.user.update({
      where: { clerkId: userId },
      data: { email },
    });
  }
  return user;
}

export function canRunCollect(user: { subscriptionStatus: string | null; monthlyQuotaUsed: number; email?: string | null }) {
  if (isWhitelisted(user.email)) return true;
  if (user.subscriptionStatus === 'active') return true;
  return user.monthlyQuotaUsed < 5;
}
