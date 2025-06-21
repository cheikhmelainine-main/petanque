import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Match = {
  id: number;
  status: string;
  team1Id: number;
  team2Id: number;
  team1Score: number | null;
  team2Score: number | null;
  roundType: string;
  round: number;
  tournamentId: number;
};

const MatchStatus = {
  PENDING: 'PENDING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
} as const;

export async function PATCH(req: NextRequest) {
  try {
    const { matchId, team1Score, team2Score } = await req.json();

    if (matchId == null || team1Score == null || team2Score == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch match to update
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Determine new status
    let newStatus: typeof MatchStatus[keyof typeof MatchStatus];
    if (team1Score == null || team2Score == null) {
      newStatus = MatchStatus.PENDING;
    } else {
      newStatus = MatchStatus.COMPLETED;
    }

    // Update match result and status
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        team1Score,
        team2Score,
        status: newStatus,
      },
    });

    // If knockout match and completed, check if next round matches need to be generated
    if (updatedMatch.roundType === 'KNOCKOUT' && newStatus === MatchStatus.COMPLETED) {
      await handleKnockoutProgression(updatedMatch.tournamentId, updatedMatch.round);
    }

    return NextResponse.json({ match: updatedMatch });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Knockout round progression logic:
 * After all matches in the current knockout round are complete,
 * get winners and schedule next round matches.
 */
async function handleKnockoutProgression(tournamentId: number, completedRound: number) {
  // 1. Check if all matches in this knockout round are completed
  const matchesThisRound = await prisma.match.findMany({
    where: {
      tournamentId,
      round: completedRound,
      roundType: 'KNOCKOUT',
    },
  });

  if (matchesThisRound.length === 0) {
    console.warn('No matches found for knockout round', completedRound);
    return;
  }

  const allCompleted = matchesThisRound.every((m: Match) => m.status === MatchStatus.COMPLETED);
  if (!allCompleted) {
    // Not all matches finished yet, so don't proceed
    return;
  }

  // 2. Get winners of this round
  const winners = matchesThisRound.map((m: Match) => {
    if (m.team1Score! > m.team2Score!) return m.team1Id;
    if (m.team2Score! > m.team1Score!) return m.team2Id;
    // Handle tie or edge case, here default to team1 (or you can throw)
    return m.team1Id;
  });

  if (winners.length === 1) {
    console.log(`Tournament ${tournamentId} knockout complete, winner teamId: ${winners[0]}`);
    return;
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < winners.length - 1; i += 2) {
    pairs.push([winners[i], winners[i + 1]]);
  }
  if (winners.length % 2 === 1) {
    pairs.push([winners[winners.length - 1], winners[winners.length - 1]]); // Dummy match or auto-advance
  }

  const nextRoundMatches = pairs.map(([team1Id, team2Id]) => ({
    tournamentId,
    round: completedRound + 1,
    roundType: 'KNOCKOUT',
    team1Id,
    team2Id,
    status: MatchStatus.PENDING,
  }));

  await prisma.match.createMany({ data: nextRoundMatches });

  console.log(`Scheduled ${nextRoundMatches.length} matches for knockout round ${completedRound + 1}`);
}
