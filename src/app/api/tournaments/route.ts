import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Define valid enum values as string arrays
const validTournamentTypes = ['GROUP', 'SWISS', 'MARATHON'] as const;
const validTeamFormats = ['SINGLES', 'DOUBLES', 'TRIPLETS'] as const;
const validTournamentStatuses = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

export async function POST(req: NextRequest) {
  try {
    const { name, type, format, rounds, startDate } = await req.json();

    // Basic validation
    if (!name || !type || !format || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate enums manually using string arrays
    if (!validTournamentTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid tournament type' }, { status: 400 });
    }
    if (!validTeamFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid team format' }, { status: 400 });
    }

    // Get admin user ID from headers (set by middleware)
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create tournament with explicit status as string
    const tournament = await prisma.tournament.create({
      data: {
        name,
        type,
        format,
        rounds,
        startDate: new Date(startDate),
        status: 'UPCOMING', // use string here
        createdById: Number(userId),
      },
    });

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Create tournament error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
