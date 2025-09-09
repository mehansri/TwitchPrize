import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isUserAuthorized } from '@/lib/config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is authorized to access admin features
    const authorized = isUserAuthorized(session.user.email, session.user.id);
    if (!authorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch users with pending prize claims
    const pendingClaims = await prisma.prizeClaim.findMany({
      where: {
        status: 'PENDING_ADMIN_OPEN',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment: {
          select: {
            amount: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform the data to match the expected format
    const pendingUsers = pendingClaims.map(claim => ({
      id: claim.user.id,
      name: claim.user.name,
      email: claim.user.email,
      paymentAmount: claim.payment?.amount || 0,
      paymentId: claim.paymentId,
      createdAt: claim.createdAt,
    }));

    return NextResponse.json({
      success: true,
      pendingUsers,
      count: pendingUsers.length,
    });

  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
