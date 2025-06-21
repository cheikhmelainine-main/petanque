import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { name, tournamentId, members } = await req.json();

    // Basic validation
    if (!name || !tournamentId || !Array.isArray(members)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // Fetch tournament to validate and get format
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Validate number of members based on tournament format
    const formatLimits = {
      SINGLES: 1,
      DOUBLES: 2,
      TRIPLETS: 3,
    };

    const maxMembers = formatLimits[tournament.format as keyof typeof formatLimits];
    if (members.length !== maxMembers) {
      return NextResponse.json({ error: `Team must have exactly ${maxMembers} member(s)` }, { status: 400 });
    }

    // Create team and members in one transaction
    const team = await prisma.team.create({
      data: {
        name,
        tournamentId,
        members: {
          create: members.map((member: { name: string }) => ({
            name: member.name,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
