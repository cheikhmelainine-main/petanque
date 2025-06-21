import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, RoundType, MatchStatus } from '@/generated/prisma';

const prisma = new PrismaClient();

type TeamWithGroup = {
  id: number;
  name: string;
  groupNumber: number; // Assumed non-null here
};

// Simple unbiased shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pair teams for matches (bye if odd number)
function pairTeams(teams: TeamWithGroup[]): [TeamWithGroup, TeamWithGroup | null][] {
  const pairs: [TeamWithGroup, TeamWithGroup | null][] = [];
  const shuffled = shuffleArray(teams);

  for (let i = 0; i < shuffled.length; i += 2) {
    const team1 = shuffled[i];
    const team2 = i + 1 < shuffled.length ? shuffled[i + 1] : null;
    pairs.push([team1, team2]);
  }
  return pairs;
}

// Calculate standings per group based on completed matches
async function calculateGroupStandings(tournamentId: number, groupNumber: number) {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP,
      status: MatchStatus.COMPLETED,
    },
    select: {
      team1Id: true,
      team2Id: true,
      team1Score: true,
      team2Score: true,
    },
  });

  const pointsMap: Record<number, number> = {};

  for (const match of matches) {
    const t1 = match.team1Id;
    const t2 = match.team2Id;
    const t1Score = match.team1Score ?? 0;
    const t2Score = match.team2Score ?? 0;

    if (t2 === null) {
      // Bye: team1 automatically gets 3 points
      pointsMap[t1] = (pointsMap[t1] || 0) + 3;
      continue;
    }

    if (t1Score > t2Score) {
      pointsMap[t1] = (pointsMap[t1] || 0) + 3;
      pointsMap[t2] = pointsMap[t2] || 0;
    } else if (t1Score < t2Score) {
      pointsMap[t2] = (pointsMap[t2] || 0) + 3;
      pointsMap[t1] = pointsMap[t1] || 0;
    } else {
      // Draw
      pointsMap[t1] = (pointsMap[t1] || 0) + 1;
      pointsMap[t2] = (pointsMap[t2] || 0) + 1;
    }
  }

  return Object.entries(pointsMap)
    .map(([teamId, points]) => ({ teamId: Number(teamId), points }))
    .sort((a, b) => b.points - a.points);
}

// Generate knockout pairs, with bye (team2 = null) if odd number
function generateKnockoutPairs(qualifiedTeams: number[]): [number, number | null][] {
  const shuffled = shuffleArray(qualifiedTeams);
  const pairs: [number, number | null][] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const team1 = shuffled[i];
    const team2 = i + 1 < shuffled.length ? shuffled[i + 1] : null;
    pairs.push([team1, team2]);
  }
  return pairs;
}

export async function POST(req: NextRequest) {
  try {
    const { tournamentId, knockoutQualifyCount = 2 } = (await req.json()) as {
      tournamentId?: number;
      knockoutQualifyCount?: number;
    };

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Fetch teams with groupNumber
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true, name: true, groupNumber: true },
    });

    if (teams.length === 0) {
      return NextResponse.json({ error: 'No teams found' }, { status: 400 });
    }

    // Group teams by groupNumber (throw if any groupNumber null)
    const groups = teams.reduce<Record<number, TeamWithGroup[]>>((acc, team) => {
      const { id, name, groupNumber } = team;
      if (groupNumber == null) throw new Error(`Team ${name} missing groupNumber`);
      if (!acc[groupNumber]) acc[groupNumber] = [];
      acc[groupNumber].push({ id, name, groupNumber });
      return acc;
    }, {});
    
    // Check if group matches already scheduled
    const existingGroupMatch = await prisma.match.findFirst({
      where: { tournamentId, roundType: RoundType.GROUP },
    });

    if (!existingGroupMatch) {
      // Schedule group stage round 1 matches, including byes
      const matchesToCreate = [];

      for (const [groupNumStr, groupTeams] of Object.entries(groups)) {
        const groupNum = Number(groupNumStr);
        const pairs = pairTeams(groupTeams);

        for (const [team1, team2] of pairs) {
          matchesToCreate.push({
            tournamentId,
            round: 1,
            roundType: RoundType.GROUP,
            groupNumber: groupNum,
            team1Id: team1.id,
            team2Id: team2 ? team2.id : null, // allow null for bye
            status: MatchStatus.PENDING,
          });
        }
      }

      // Filter out matches where team2Id is null, as Prisma expects a number
      const validMatchesToCreate = matchesToCreate.filter(
        (match) => match.team2Id !== null
      );

      // If there are no valid matches to create, return a message
      if (validMatchesToCreate.length === 0) {
        return NextResponse.json({ message: 'No valid group stage matches to schedule.' });
      }

      // If there are no valid matches to create, return a message
      if (validMatchesToCreate.length === 0) {
        return NextResponse.json({ message: 'No valid group stage matches to schedule.' });
      }

      // Map validMatchesToCreate to ensure team2Id is a number (not null)
      const matchesWithTeam2Id = validMatchesToCreate.map(match => ({
        ...match,
        team2Id: match.team2Id as number,
      }));

      await prisma.match.createMany({ data: matchesWithTeam2Id });
      return NextResponse.json({ message: 'Scheduled group stage matches.' });
    }

    // Check if group matches are still in progress
    const incompleteGroupMatch = await prisma.match.findFirst({
      where: {
        tournamentId,
        roundType: RoundType.GROUP,
        status: { not: MatchStatus.COMPLETED },
      },
    });

    if (incompleteGroupMatch) {
      return NextResponse.json({ message: 'Group matches still in progress.' });
    }

    // Calculate qualified teams per group (top X)
    const qualifiedTeams: number[] = [];

    for (const groupNumStr of Object.keys(groups)) {
      const groupNum = Number(groupNumStr);
      const standings = await calculateGroupStandings(tournamentId, groupNum);

      for (let i = 0; i < Math.min(knockoutQualifyCount, standings.length); i++) {
        qualifiedTeams.push(standings[i].teamId);
      }
    }

    // Check if knockout matches already scheduled
    const existingKnockoutMatch = await prisma.match.findFirst({
      where: { tournamentId, roundType: RoundType.KNOCKOUT },
    });

    if (existingKnockoutMatch) {
      return NextResponse.json({ message: 'Knockout matches already scheduled.' });
    }

    // Generate knockout pairs (bye allowed)
    const knockoutPairs = generateKnockoutPairs(qualifiedTeams);

    const knockoutMatchesToCreate = knockoutPairs.map(([team1Id, team2Id]) => ({
      tournamentId,
      round: 1,
      roundType: RoundType.KNOCKOUT,
      groupNumber: null,
      team1Id,
      team2Id: team2Id, // null allowed for bye
      status: MatchStatus.PENDING,
    }))
    // Filter out matches where team2Id is null, as Prisma expects a number
    .filter((match): match is typeof match & { team2Id: number } => match.team2Id !== null);

    await prisma.match.createMany({ data: knockoutMatchesToCreate });

    return NextResponse.json({
      message: `Knockout stage matches scheduled with ${knockoutMatchesToCreate.length} matches.`,
    });
  } catch (error) {
    console.error('Scheduling error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
