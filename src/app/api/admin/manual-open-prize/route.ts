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

    const { userEmail, prizeName, boxNumber, paymentId } = await request.json();

    if (!userEmail && !paymentId) {
      return NextResponse.json({ error: 'User email or payment ID is required' }, { status: 400 });
    }

    let user;
    if (userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail },
      });
    } else if (paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true },
      });
      if (payment) {
        user = payment.user;
      }
    }


    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If a paymentId is provided, check if this specific payment already has an opened prize.
    // Otherwise (manual opening without paymentId), check if the user has any opened prize.
    if (paymentId) {
        const existingClaimForThisPayment = await prisma.prizeClaim.findFirst({
            where: {
                paymentId: paymentId,
                status: 'OPENED',
            },
        });
        if (existingClaimForThisPayment) {
            return NextResponse.json({ error: 'This payment already has an opened prize.' }, { status: 400 });
        }
    } else {
        // This is a truly manual opening (no paymentId provided)
        // Check if the user already has an opened prize that has not been delivered
        const existingClaim = await prisma.prizeClaim.findFirst({
            where: {
                userId: user.id,
                status: 'OPENED',
            },
        });
        if (existingClaim) {
            return NextResponse.json({ error: 'User already has an opened prize that has not been delivered.' }, { status: 400 });
        }
    }

    const finalPrizeName = prizeName;

    // Find or create the prize type
    let prizeType = await prisma.prizeType.findUnique({
      where: { name: finalPrizeName },
    });

    if (!prizeType) {
      // Create the prize type if it doesn't exist
      const prizeValue = getPrizeValue(finalPrizeName);
      const prizeGlow = getPrizeGlow(finalPrizeName);
      
      prizeType = await prisma.prizeType.create({
        data: {
          name: finalPrizeName,
          description: `Manual prize: ${finalPrizeName}`,
          value: prizeValue,
          glow: prizeGlow,
          isActive: true,
        },
      });
    }

    let prizeClaim;

    if (paymentId) {
      // Find the existing PENDING_ADMIN_OPEN prize claim for this payment
      prizeClaim = await prisma.prizeClaim.findFirst({
        where: {
          paymentId: paymentId,
          status: 'PENDING_ADMIN_OPEN',
        },
      });

      if (!prizeClaim) {
        return NextResponse.json({ error: 'No pending prize claim found for this payment.' }, { status: 404 });
      }

      // Update the existing prize claim
      prizeClaim = await prisma.prizeClaim.update({
        where: { id: prizeClaim.id },
        data: {
          status: 'OPENED',
          openedAt: new Date(),
          notes: `Opened by admin ${session.user.email} from box #${boxNumber} for payment ${paymentId}`,
          prizeTypeId: prizeType.id,
        },
        include: {
          user: true,
          prizeType: true,
        },
      });
    } else {
      // Create a manual prize claim (without payment)
      prizeClaim = await prisma.prizeClaim.create({
        data: {
          userId: user.id,
          status: 'OPENED', // Directly mark as opened since it's manual
          openedAt: new Date(),
          notes: `Manually opened by admin ${session.user.email} from box #${boxNumber}`,
          prizeTypeId: prizeType.id,
          paymentId: null, // No payment link for truly manual claims
        },
        include: {
          user: true,
          prizeType: true,
        },
      });
    }

    // Create admin notification
    await prisma.adminNotification.create({
      data: {
        type: 'MANUAL_PRIZE_OPENED',
        title: 'Manual Prize Opened',
        message: `Admin ${session.user.email} manually opened "${finalPrizeName}" for ${user.name || user.email}${boxNumber ? ` (Box ${boxNumber})` : ''}`,
        userId: user.id,
      },
    });

    // Send Discord notification
    await discordNotifier.notifyManualPrizeOpened(
      session.user.name || session.user.email || 'Unknown Admin',
       user.name ?? user.email ?? "Unknown User",
      finalPrizeName,
      prizeType.value
    );

    return NextResponse.json({
      success: true,
      message: `Prize "${finalPrizeName}" successfully opened for ${user.name || user.email}${boxNumber ? ` (Box ${boxNumber})` : ''}`,
      prizeClaim,
    });

  } catch (error) {
    console.error('Error in manual-open-prize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get prize value based on name
function getPrizeValue(prizeName: string): number {
  const prizePool = [
    { name: "Unified Minds Booster Box", value: 12000 },
    { name: "151 UPC", value: 10000 },
    { name: "151 ETB", value: 5000 },
    { name: "Random Pack", value: 500 },
    { name: "Random Single (Low-tier)", value: 200 },
    { name: "Random Single (Mid-tier)", value: 1500 },
    { name: "Random Single (High-tier)", value: 3500 },
    { name: "Spin Punishment Wheel", value: 0 },
    { name: "Vintage Card Bundle", value: 4000 },
    { name: "Magic Booster Pack", value: 500 },
    { name: "Next Box 50% Off", value: 0 },
    { name: "Womp Womp", value: 0 },
    { name: "Gem Depo (Boxed)", value: 2500 },
    { name: "Random Slab", value: 3000 },
    { name: "Random Pokémon Merch (Pick)", value: 2000 },
    { name: "Custom Pokémon Art", value: 1500 },
  ];

  const prize = prizePool.find(p => p.name === prizeName);
  return prize ? prize.value : 0;
}

// Helper function to get prize glow based on name
function getPrizeGlow(prizeName: string): string {
  const prizePool = [
    { name: "Unified Minds Booster Box", glow: "gold" },
    { name: "151 UPC", glow: "gold" },
    { name: "151 ETB", glow: "gold" },
    { name: "Random Pack", glow: "blue" },
    { name: "Random Single (Low-tier)", glow: "green" },
    { name: "Random Single (Mid-tier)", glow: "blue" },
    { name: "Random Single (High-tier)", glow: "purple" },
    { name: "Spin Punishment Wheel", glow: "green" },
    { name: "Vintage Card Bundle", glow: "blue" },
    { name: "Magic Booster Pack", glow: "blue" },
    { name: "Next Box 50% Off", glow: "blue" },
    { name: "Womp Womp", glow: "green" },
    { name: "Gem Depo (Boxed)", glow: "green" },
    { name: "Random Slab", glow: "purple" },
    { name: "Random Pokémon Merch (Pick)", glow: "purple" },
    { name: "Custom Pokémon Art", glow: "purple" },
  ];

  const prize = prizePool.find(p => p.name === prizeName);
  return prize ? prize.glow : "green";
}


