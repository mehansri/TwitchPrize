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

    // Fetch all opened prize claims (including direct openings)
    const openedClaims = await prisma.prizeClaim.findMany({
      where: {
        status: 'OPENED',
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
        const boxNumberMatch = claim.notes?.match(/box #(\d+)/);
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

  } catch (error) {
    console.error('Error fetching opened prize claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
