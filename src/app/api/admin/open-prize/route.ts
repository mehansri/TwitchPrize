import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isUserAuthorized } from '@/lib/config';
import { discordNotifier } from '@/lib/discord';

// Prize pool configuration (matching the one in prize page)
const prizePool = [
  { name: "Unified Minds Booster Box", value: 12000, glow: "gold" },
  { name: "151 UPC", value: 10000, glow: "gold" },
  { name: "151 ETB", value: 5000, glow: "gold" },
  { name: "Random Pack", value: 500, glow: "blue" },
  { name: "Random Single (Low-tier)", value: 200, glow: "green" },
  { name: "Random Single (Mid-tier)", value: 1500, glow: "blue" },
  { name: "Random Single (High-tier)", value: 3500, glow: "purple" },
  { name: "Spin Punishment Wheel", value: 0, glow: "green" },
  { name: "Vintage Card Bundle", value: 4000, glow: "blue" },
  { name: "Magic Booster Pack", value: 500, glow: "blue" },
  { name: "Next Box 50% Off", value: 0, glow: "blue" },
  { name: "Womp Womp", value: 0, glow: "green" },
  { name: "Gem Depo (Boxed)", value: 2500, glow: "green" },
  { name: "Random Slab", value: 3000, glow: "purple" },
  { name: "Random Pokémon Merch (Pick)", value: 2000, glow: "purple" },
  { name: "Custom Pokémon Art", value: 1500, glow: "purple" },
];

// Generate weighted random prize
function getRandomPrize() {
  // Create weighted array based on prize pool
  const weightedPrizes: Array<{ name: string; value: number; glow: string }> = [];
  
  prizePool.forEach((prize) => {
    // Add prizes multiple times based on their "count" (using value as proxy for rarity)
    // Higher value prizes should be rarer
    const weight = Math.max(1, Math.floor(1000 / (prize.value + 1))); // Prevent division by zero
    for (let i = 0; i < weight; i++) {
      weightedPrizes.push(prize);
    }
  });

  // Random selection
  const randomIndex = Math.floor(Math.random() * weightedPrizes.length);
  return weightedPrizes[randomIndex];
}

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
        payment: true,
      },
    });

    if (!prizeClaim) {
      return NextResponse.json({ error: 'Prize claim not found' }, { status: 404 });
    }

    if (prizeClaim.status !== 'PENDING_ADMIN_OPEN') {
      return NextResponse.json({ error: 'Prize claim is not pending' }, { status: 400 });
    }

    // Get or create prize type
    const randomPrize = getRandomPrize();
    
    let prizeType = await prisma.prizeType.findUnique({
      where: { name: randomPrize.name },
    });

    if (!prizeType) {
      prizeType = await prisma.prizeType.create({
        data: {
          name: randomPrize.name,
          value: randomPrize.value,
          glow: randomPrize.glow,
        },
      });
    }

    // Update the prize claim
    const updatedClaim = await prisma.prizeClaim.update({
      where: { id: claimId },
      data: {
        status: 'OPENED',
        prizeTypeId: prizeType.id,
        openedBy: session.user.id,
        openedAt: new Date(),
      },
      include: {
        user: true,
        payment: true,
        prizeType: true,
      },
    });

    // Create notification
    await prisma.adminNotification.create({
      data: {
        type: 'PRIZE_OPENED',
        title: 'Prize Opened',
        message: `Prize opened for ${updatedClaim.user.name || updatedClaim.user.email}`,
        userId: updatedClaim.userId,
        prizeClaimId: updatedClaim.id,
      },
    });

    // Send Discord notification
    await discordNotifier.notifyPrizeOpened(
      updatedClaim.user.name || 'Unknown',
      updatedClaim.user.email || 'No email',
      prizeType.name,
      prizeType.value,
      session.user.name || 'Admin'
    );

    return NextResponse.json({ 
      prizeClaim: updatedClaim,
      message: 'Prize opened successfully' 
    });
  } catch (error) {
    console.error('Error opening prize:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
