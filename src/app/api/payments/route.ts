import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 1. Get the user's session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Get the user's payments from the database
    const payments = await prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Return the payments
    return new Response(JSON.stringify({ payments: payments || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', payments: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
