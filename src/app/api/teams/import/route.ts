import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Read multipart form data with file (Next.js Edge APIs need special handling)
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Assume first sheet has the data
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array of rows
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    /*
    Expected format example:
    [
      { teamName: 'Team A', member1: 'Alice', member2: 'Bob', member3: 'Charlie' },
      { teamName: 'Team B', member1: 'Dave', member2: 'Eve', member3: '' },
      ...
    ]
    */

    // Get tournamentId from query param or formData
    const tournamentIdStr = formData.get('tournamentId') as string;
    if (!tournamentIdStr) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }
    const tournamentId = parseInt(tournamentIdStr);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournamentId' }, { status: 400 });
    }

    // Fetch tournament to validate format
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const formatLimits = {
      SINGLES: 1,
      DOUBLES: 2,
      TRIPLETS: 3,
    };
    console.log('Parsed Excel JSON:', jsonData);
console.log('Tournament format:', tournament.format);
    const maxMembers = formatLimits[tournament.format as keyof typeof formatLimits];

    const teamsToCreate = [];

    for (const row of jsonData) {
      const teamName = row.teamName || row.TeamName || row.team || row.Team;
      if (!teamName) continue;

      const members = [];
      for (let i = 1; i <= maxMembers; i++) {
        const memberName = row[`member${i}`] || row[`Member${i}`];
        if (memberName) members.push({ name: memberName });
      }

      if (members.length !== maxMembers) {
        // Skip or handle error for this team
        continue;
      }

      teamsToCreate.push({
        name: teamName,
        members,
      });
    }

    // Bulk create teams with members in one transaction
    const createdTeams = [];

    for (const teamData of teamsToCreate) {
      const team = await prisma.team.create({
        data: {
          name: teamData.name,
          tournamentId,
          members: {
            create: teamData.members,
          },
        },
        include: { members: true },
      });
      createdTeams.push(team);
    }

    return NextResponse.json({
      message: `Imported ${createdTeams.length} teams successfully.`,
      teams: createdTeams,
    });
  } catch (error) {
    console.error('Import teams error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
