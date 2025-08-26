import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isUserAuthorized } from '@/lib/config';

export async function GET(request: NextRequest) {
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

    // Fetch payments that do not have an associated prize claim
    const paymentsWithoutClaims = await prisma.payment.findMany({
      where: {
        prizeClaim: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transform the data to match the expected format
    const pendingUsers = paymentsWithoutClaims.map(payment => ({
      id: payment.user.id,
      name: payment.user.name,
      email: payment.user.email,
      paymentAmount: payment.amount || 0,
      paymentId: payment.id,
      createdAt: payment.createdAt,
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
