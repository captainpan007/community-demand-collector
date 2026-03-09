import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Temporary admin endpoint to set user subscription status.
 * Protected by ADMIN_SECRET query param (= CLERK_SECRET_KEY).
 *
 * Usage:
 *   POST /api/admin/set-pro
 *   Body: { "email": "user@example.com", "status": "active" }
 *   Header: Authorization: Bearer <CLERK_SECRET_KEY>
 *
 * DELETE THIS FILE after use.
 */
export async function POST(req: NextRequest) {
  // Auth: require CLERK_SECRET_KEY as bearer token
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { email, status } = body as { email?: string; status?: string };

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const validStatuses = ['active', 'cancelled', 'past_due', 'free'];
  const newStatus = status ?? 'active';
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Find user by email
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
  }

  // Update subscription status
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: newStatus },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      subscriptionStatus: updated.subscriptionStatus,
    },
  });
}

// GET to list all users (for diagnostics)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, subscriptionStatus: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}
