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

    const { userEmail, prizeName, boxNumber } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine the final prize name
    let finalPrizeName = prizeName;
    
    if (boxNumber) {
      // If box number is provided, get prize from box number
      finalPrizeName = getPrizeFromBoxNumber(parseInt(boxNumber));
    } else if (!prizeName) {
      // If no prize name and no box number, pick random
      finalPrizeName = getRandomPrize();
    }

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
          description: `Manual prize: ${finalPrizeName}${boxNumber ? ` (Box ${boxNumber})` : ''}`,
          value: prizeValue,
          glow: prizeGlow,
          isActive: true,
        },
      });
    }

    // Create a manual prize claim (without payment)
    const prizeClaim = await prisma.prizeClaim.create({
      data: {
        userId: user.id,
        status: 'OPENED', // Directly mark as opened since it's manual
        openedAt: new Date(),
        notes: `Manually opened by admin ${session.user.email}${boxNumber ? ` (Box ${boxNumber})` : ''}`,
        prizeTypeId: prizeType.id,
      },
      include: {
        user: true,
        prizeType: true,
      },
    });

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
      user.name || user.email,
      finalPrizeName,
      prizeType.value
    );

    return NextResponse.json({
      success: true,
      message: `Prize "${finalPrizeName}" successfully opened for ${user.name || user.email}${boxNumber ? ` (Box ${boxNumber})` : ''}`,
      prizeClaim,
    });

  } catch (error) {
    console.error('Error manually opening prize:', error);
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

// Helper function to get prize from box number (matches the box generation logic)
function getPrizeFromBoxNumber(boxNum: number): string {
  // This should match the exact same logic as your box generation
  // For now, using a deterministic approach based on box number
  const prizePool = [
    { name: "Unified Minds Booster Box", count: 1, value: 120, glow: "gold" },
    { name: "151 UPC", count: 1, value: 100, glow: "gold" },
    { name: "151 ETB", count: 1, value: 50, glow: "gold" },
    { name: "Random Pack", count: 120, value: 5, glow: "blue" },
    { name: "Random Single (Low-tier)", count: 420, value: 2, glow: "green" },
    { name: "Random Single (Mid-tier)", count: 20, value: 15, glow: "blue" },
    { name: "Random Single (High-tier)", count: 12, value: 35, glow: "purple" },
    { name: "Spin Punishment Wheel", count: 60, value: 0, glow: "green" },
    { name: "Vintage Card Bundle", count: 20, value: 40, glow: "blue" },
    { name: "Magic Booster Pack", count: 20, value: 5, glow: "blue" },
    { name: "Next Box 50% Off", count: 40, value: 0, glow: "blue" },
    { name: "Womp Womp", count: 170, value: 0, glow: "green" },
    { name: "Gem Depo (Boxed)", count: 50, value: 25, glow: "green" },
    { name: "Random Slab", count: 25, value: 30, glow: "purple" },
    { name: "Random Pokémon Merch (Pick)", count: 20, value: 20, glow: "purple" },
    { name: "Custom Pokémon Art", count: 20, value: 15, glow: "purple" },
  ];

  // Generate the same box mapping as in the frontend
  const allPrizes: string[] = [];
  prizePool.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      allPrizes.push(item.name);
    }
  });

  // Use a deterministic seed based on box number
  const seed = boxNum - 1; // Convert to 0-based index
  if (seed >= 0 && seed < allPrizes.length) {
    return allPrizes[seed];
  }

  // Fallback to random if box number is out of range
  return getRandomPrize();
}

// Helper function to get a random prize
function getRandomPrize(): string {
  const prizePool = [
    "Unified Minds Booster Box",
    "151 UPC", 
    "151 ETB",
    "Random Pack",
    "Random Single (Low-tier)",
    "Random Single (Mid-tier)",
    "Random Single (High-tier)",
    "Spin Punishment Wheel",
    "Vintage Card Bundle",
    "Magic Booster Pack",
    "Next Box 50% Off",
    "Womp Womp",
    "Gem Depo (Boxed)",
    "Random Slab",
    "Random Pokémon Merch (Pick)",
    "Custom Pokémon Art",
  ];

  const randomIndex = Math.floor(Math.random() * prizePool.length);
  return prizePool[randomIndex];
}
