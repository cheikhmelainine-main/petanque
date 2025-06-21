import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MatchStatus = {
  PENDING: 'PENDING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
} as const;

type MatchStatus = 'PENDING' | 'ONGOING' | 'COMPLETED';

type Match = {
  team1Id: number;
  team2Id: number | null;
  team1Score: number | null;
  team2Score: number | null;
  status: MatchStatus;
};

type Team = {
  id: number;
  name: string;
};

type TeamWithRecord = {
  id: number;
  name: string;
  wins: number;
};

type MatchCreate = {
  tournamentId: number;
  round: number;
  roundType: string;
  team1Id: number;
  team2Id: number | null;
  status: MatchStatus;
  team1Score?: number;
  team2Score?: number;
};

// Shuffle helper to randomize pairings within same win group (tie-breaker)
function shuffleArray<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

// Pair teams by wins: top two, next two, etc.
function pairTeams(teams: TeamWithRecord[]): [TeamWithRecord, TeamWithRecord][] {
  const pairs: [TeamWithRecord, TeamWithRecord][] = [];
  const shuffled = shuffleArray([...teams]);

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

export async function POST(req: NextRequest) {
  try {
    const { tournamentId, roundNumber, totalRounds } = await req.json();

    if (!tournamentId || !roundNumber || !totalRounds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch teams for the tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true, name: true },
    });

    if (teams.length === 0) {
      return NextResponse.json({ error: 'No teams found' }, { status: 400 });
    }

    // Calculate wins for each team from completed Swiss matches before this round
    const winsMap: Record<number, number> = {};
    teams.forEach((team: Team) => {
      winsMap[team.id] = 0;
    });

    const completedMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        roundType: 'SWISS',
        round: { lt: roundNumber },
        status: MatchStatus.COMPLETED,
      },
    });

    completedMatches.forEach((match: Match) => {
      if (match.team1Score && match.team2Score && match.team1Score > match.team2Score) {
        winsMap[match.team1Id] += 1;
      } else if (match.team2Score && match.team1Score && match.team2Score > match.team1Score && match.team2Id) {
        winsMap[match.team2Id] += 1;
      }
    });

    // Build array of teams with their current wins
    const teamRecords: TeamWithRecord[] = teams.map((team: Team) => ({
      id: team.id,
      name: team.name,
      wins: winsMap[team.id] || 0,
    }));

    // Sort teams descending by wins (best records first)
    teamRecords.sort((a, b) => b.wins - a.wins);

    // If odd number of teams, assign bye to lowest-ranked (last team)
    let byeTeam: TeamWithRecord | null = null;
    if (teamRecords.length % 2 === 1) {
      byeTeam = teamRecords.pop()!;
    }

    // Pair remaining teams by wins
    const pairs = pairTeams(teamRecords);

    // Prepare matches for this Swiss round
    const matchesToCreate: MatchCreate[] = pairs.map(([team1, team2]) => ({
      tournamentId,
      round: roundNumber,
      roundType: 'SWISS',
      team1Id: team1.id,
      team2Id: team2.id,
      status: MatchStatus.PENDING,
    }));

    // Handle bye team by creating an automatic win match
    if (byeTeam) {
      const byeMatch: MatchCreate = {
        tournamentId,
        round: roundNumber,
        roundType: 'SWISS',
        team1Id: byeTeam.id,
        team2Id: byeTeam.id,
        status: MatchStatus.COMPLETED,
        team1Score: 1,
        team2Score: 0,
      };
      matchesToCreate.push(byeMatch);
    }

    // Create all matches in the database
    await prisma.match.createMany({ data: matchesToCreate });

    // If this is the last Swiss round, create knockout matches for top half
    if (roundNumber === totalRounds) {
      const halfCount = Math.floor(teams.length / 2);
      const topTeams = teamRecords.slice(0, halfCount);

      // Simple knockout pairing: 1v2, 3v4, etc.
      const knockoutPairs: [TeamWithRecord, TeamWithRecord][] = [];
      for (let i = 0; i < topTeams.length - 1; i += 2) {
        knockoutPairs.push([topTeams[i], topTeams[i + 1]]);
      }

      const knockoutMatches = knockoutPairs.map(([team1, team2]) => ({
        tournamentId,
        round: 1,
        roundType: 'KNOCKOUT',
        team1Id: team1.id,
        team2Id: team2.id,
        status: MatchStatus.PENDING,
      }));

      await prisma.match.createMany({ data: knockoutMatches });
    }

    return NextResponse.json({
      message: `Swiss round ${roundNumber} scheduled with ${matchesToCreate.length} matches`,
    });
  } catch (error) {
    console.error('Schedule Swiss round error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
