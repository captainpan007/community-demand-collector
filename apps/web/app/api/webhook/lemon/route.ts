import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const LEMON_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

function verifySignature(rawBody: string, signature: string): boolean {
  if (!LEMON_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', LEMON_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(digest, 'utf8'));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: { clerkId?: string } };
    data?: { attributes?: { customer_id?: number; status?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  const clerkId = payload.meta?.custom_data?.clerkId;
  const customerId = payload.data?.attributes?.customer_id?.toString();
  const status = payload.data?.attributes?.status;

  if (eventName === 'order_created' || eventName === 'subscription_created') {
    if (clerkId && customerId) {
      await prisma.user.updateMany({
        where: { clerkId },
        data: {
          lemonSqueezyCustomerId: customerId,
          subscriptionStatus: status ?? 'active',
        },
      });
    }
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    if (clerkId) {
      await prisma.user.updateMany({
        where: { clerkId },
        data: { subscriptionStatus: 'cancelled' },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
