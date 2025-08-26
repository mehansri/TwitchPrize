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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Build the where clause based on filter
    const whereClause: { status?: 'PENDING_ADMIN_OPEN' | 'OPENED' | 'DELIVERED' } = {};
    
    if (filter === 'pending') {
      whereClause.status = 'PENDING_ADMIN_OPEN';
    } else if (filter === 'opened') {
      whereClause.status = 'OPENED';
    } else if (filter === 'delivered') {
      whereClause.status = 'DELIVERED';
    }
    // 'all' filter doesn't add any where clause

    const prizeClaims = await prisma.prizeClaim.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
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
        prizeType: {
          select: {
            name: true,
            value: true,
            glow: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ prizeClaims });
  } catch (error) {
    console.error('Error fetching prize claims:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
