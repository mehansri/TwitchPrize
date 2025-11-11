import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isUserAuthorized } from '@/lib/config';
import { Prisma } from '@prisma/client';

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

    // Get filter parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const format = searchParams.get('format'); // 'boxes' for openedBoxes format, otherwise full prize claims

    // Build where clause based on filter
    const whereClause: Prisma.PrizeClaimWhereInput = 
      filter === 'pending' ? { status: 'PENDING_ADMIN_OPEN' } :
      filter === 'opened' ? { status: 'OPENED' } :
      filter === 'delivered' ? { status: 'DELIVERED' } :
      {}; // 'all' means no status filter

    // If format is 'boxes', return the openedBoxes format for prize page
    if (format === 'boxes') {
      const openedClaims = await prisma.prizeClaim.findMany({
        where: {
          status: 'OPENED', // Always filter for OPENED status when syncing boxes
        },
        include: {
          prizeType: true,
          user: true,
        },
        orderBy: {
          openedAt: 'asc',
        },
      });

      // Transform the data to match the local storage format
      const openedBoxes: { [key: number]: { prize: string; value: number; opened: boolean; glow: string } } = {};
      
      openedClaims.forEach((claim, index) => {
        if (claim.prizeType) {
          // Use the box number from the notes if available, otherwise use index + 1
          const boxNumberMatch = claim.notes?.match(/box #(\d+)/i);
          const boxNumber = boxNumberMatch ? parseInt(boxNumberMatch[1]) : index + 1;
          
          openedBoxes[boxNumber] = {
            prize: claim.prizeType.name,
            value: claim.prizeType.value,
            opened: true,
            glow: claim.prizeType.glow,
          };
        }
      });

      return NextResponse.json({
        success: true,
        openedBoxes,
        totalOpened: openedClaims.length,
      });
    }

    // Otherwise, return full prize claims list for admin page
    const prizeClaims = await prisma.prizeClaim.findMany({
      where: whereClause,
      include: {
        prizeType: {
          select: {
            name: true,
            value: true,
            glow: true,
          },
        },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected format
    const formattedClaims = prizeClaims.map(claim => ({
      id: claim.id,
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
      openedAt: claim.openedAt?.toISOString(),
      notes: claim.notes,
      user: {
        name: claim.user.name || 'Unknown',
        email: claim.user.email || '',
      },
      payment: claim.payment ? {
        amount: claim.payment.amount,
        currency: claim.payment.currency,
      } : undefined,
      prizeType: claim.prizeType ? {
        name: claim.prizeType.name,
        value: claim.prizeType.value,
        glow: claim.prizeType.glow,
      } : undefined,
    }));

    return NextResponse.json({
      success: true,
      prizeClaims: formattedClaims,
    });

  } catch (error) {
    console.error('Error fetching prize claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
