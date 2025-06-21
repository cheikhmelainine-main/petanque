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
  team2Id: number;
  team1Score: number;
  team2Score: number;
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

// Shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

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

    // Fetch teams
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true, name: true },
    });

    if (teams.length === 0) {
      return NextResponse.json({ error: 'No teams found' }, { status: 400 });
    }

    // Calculate wins for each team from completed Marathon matches (roundType = 'MARATHON') before this round
    const winsMap: Record<number, number> = {};
    teams.forEach((team: Team) => {
      winsMap[team.id] = 0;
    });

    const completedMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        roundType: 'MARATHON',
        round: { lt: roundNumber },
        status: MatchStatus.COMPLETED,
      },
    });

    completedMatches.forEach((match: Match) => {
      if (match.team1Score > match.team2Score) {
        winsMap[match.team1Id] += 1;
      } else if (match.team2Score > match.team1Score) {
        winsMap[match.team2Id] += 1;
      }
    });

    // Build team records with wins
    const teamRecords: TeamWithRecord[] = teams.map((team: Team) => ({
      id: team.id,
      name: team.name,
      wins: winsMap[team.id] || 0,
    }));

    // Sort descending by wins
    teamRecords.sort((a, b) => b.wins - a.wins);

    // Handle odd number of teams for bye (optional, here ignored for simplicity)

    // If not last round, pair teams for Swiss-like marathon round
    if (roundNumber < totalRounds) {
      // Shuffle within wins groups to break ties better could be added, but let's pair normally here
      const pairs = pairTeams(teamRecords);

      const matchesToCreate = pairs.map(([team1, team2]) => ({
        tournamentId,
        round: roundNumber,
        roundType: 'MARATHON',
        team1Id: team1.id,
        team2Id: team2.id,
        status: MatchStatus.PENDING,
      }));

      await prisma.match.createMany({ data: matchesToCreate });

      return NextResponse.json({
        message: `Marathon round ${roundNumber} scheduled with ${matchesToCreate.length} matches`,
      });
    }

    // Last round — create knockout brackets

    const halfCount = Math.floor(teamRecords.length / 2);
    const winnersBracketTeams = teamRecords.slice(0, halfCount);
    const losersBracketTeams = teamRecords.slice(halfCount);

    // Pair winners bracket
    const winnersPairs: [TeamWithRecord, TeamWithRecord][] = [];
    for (let i = 0; i < winnersBracketTeams.length - 1; i += 2) {
      winnersPairs.push([winnersBracketTeams[i], winnersBracketTeams[i + 1]]);
    }

    // Pair losers bracket
    const losersPairs: [TeamWithRecord, TeamWithRecord][] = [];
    for (let i = 0; i < losersBracketTeams.length - 1; i += 2) {
      losersPairs.push([losersBracketTeams[i], losersBracketTeams[i + 1]]);
    }

    // Prepare knockout matches for winners bracket round 1
    const winnersMatches = winnersPairs.map(([team1, team2]) => ({
      tournamentId,
      round: 1,
      roundType: 'KNOCKOUT',
      bracket: 'WINNERS',  // optional field if you want to track bracket type
      team1Id: team1.id,
      team2Id: team2.id,
      status: MatchStatus.PENDING,
    }));

    // Prepare knockout matches for losers bracket round 1
    const losersMatches = losersPairs.map(([team1, team2]) => ({
      tournamentId,
      round: 1,
      roundType: 'KNOCKOUT',
      bracket: 'LOSERS',  // optional
      team1Id: team1.id,
      team2Id: team2.id,
      status: MatchStatus.PENDING,
    }));

    await prisma.match.createMany({ data: [...winnersMatches, ...losersMatches] });

    return NextResponse.json({
      message: `Marathon complete, knockout winners (${winnersMatches.length}) and losers (${losersMatches.length}) matches scheduled`,
    });
  } catch (error) {
    console.error('Schedule Marathon error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
