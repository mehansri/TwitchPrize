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

    const { boxNumber, prizeName, prizeValue, prizeGlow } = await request.json();

    if (!boxNumber || !prizeName) {
      return NextResponse.json({ error: 'Box number and prize name are required' }, { status: 400 });
    }

    // Find or create the prize type
    let prizeType = await prisma.prizeType.findUnique({
      where: { name: prizeName },
    });

    if (!prizeType) {
      // Create the prize type if it doesn't exist
      prizeType = await prisma.prizeType.create({
        data: {
          name: prizeName,
          description: `Direct admin opening: ${prizeName}`,
          value: prizeValue || 0,
          glow: prizeGlow || "green",
          isActive: true,
        },
      });
    }

    // Create a direct opening record (no user assigned, no payment)
    const directOpening = await prisma.prizeClaim.create({
      data: {
        userId: session.user.id, // Use admin's ID as placeholder
        status: 'OPENED',
        openedAt: new Date(),
        notes: `Direct admin opening by ${session.user.email} - Box #${boxNumber} - ${prizeName} (No user assigned)`,
        prizeTypeId: prizeType.id,
        paymentId: null, // No payment link for direct openings
      },
      include: {
        prizeType: true,
      },
    });

    // Create admin notification
    await prisma.adminNotification.create({
      data: {
        type: 'MANUAL_PRIZE_OPENED',
        title: 'Direct Box Opening',
        message: `Admin ${session.user.email} directly opened box #${boxNumber} containing "${prizeName}" (No user assigned)`,
        userId: session.user.id,
      },
    });

    // Send Discord notification
    await discordNotifier.notifyDirectBoxOpening(
      session.user.name || session.user.email || 'Unknown Admin',
      boxNumber,
      prizeName,
      prizeType.value
    );

    return NextResponse.json({
      success: true,
      message: `Direct box opening tracked: Box #${boxNumber} - ${prizeName}`,
      directOpening,
    });

  } catch (error) {
    console.error('Error tracking direct box opening:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
