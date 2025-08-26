import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isUserAuthorized } from '@/lib/config';
import { discordNotifier } from '@/lib/discord';

export async function POST(request: NextRequest) {
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

    const { claimId } = await request.json();

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 });
    }

    // Find the prize claim
    const prizeClaim = await prisma.prizeClaim.findUnique({
      where: { id: claimId },
      include: {
        user: true,
        prizeType: true,
      },
    });

    if (!prizeClaim) {
      return NextResponse.json({ error: 'Prize claim not found' }, { status: 404 });
    }

    if (prizeClaim.status !== 'OPENED') {
      return NextResponse.json({ error: 'Prize must be opened before marking as delivered' }, { status: 400 });
    }

    // Update the prize claim
    const updatedClaim = await prisma.prizeClaim.update({
      where: { id: claimId },
      data: {
        status: 'DELIVERED',
      },
      include: {
        user: true,
        prizeType: true,
      },
    });

    // Create notification
    await prisma.adminNotification.create({
      data: {
        type: 'PRIZE_DELIVERED',
        title: 'Prize Delivered',
        message: `Prize delivered to ${updatedClaim.user.name || updatedClaim.user.email}`,
        userId: updatedClaim.userId,
        prizeClaimId: updatedClaim.id,
      },
    });

    // Send Discord notification
    if (updatedClaim.prizeType) {
      await discordNotifier.notifyPrizeDelivered(
        updatedClaim.user.name || 'Unknown',
        updatedClaim.user.email || 'No email',
        updatedClaim.prizeType.name,
        session.user.name || 'Admin'
      );
    }

    return NextResponse.json({ 
      prizeClaim: updatedClaim,
      message: 'Prize marked as delivered successfully' 
    });
  } catch (error) {
    console.error('Error marking prize as delivered:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
