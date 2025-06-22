import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import Tournament from '../../../../models/Tournament';
import Team from '../../../../models/Team';
import Match from '../../../../models/Match';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    await connectDB();

    switch (req.method) {
      case 'POST':
        return await handleGroupAction(req, res, id as string);
      case 'GET':
        return await getGroupStatus(req, res, id as string);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API group-management:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function handleGroupAction(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const { action, groupNumber } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action requise' });
    }

    let result;

    switch (action) {
      case 'generate_second_round':
        if (!groupNumber) {
          return res.status(400).json({ message: 'Numéro de groupe requis' });
        }
        result = await TournamentService.generateGroupSecondRound(tournamentId, groupNumber);
        break;

      case 'generate_qualification_match':
        if (!groupNumber) {
          return res.status(400).json({ message: 'Numéro de groupe requis' });
        }
        result = await TournamentService.generateGroupQualificationMatch(tournamentId, groupNumber);
        break;

      case 'start_knockout_phase':
        result = await TournamentService.generateKnockoutFromGroups(tournamentId);
        break;

      case 'check_group_progression':
        result = await checkAllGroupsProgression(tournamentId);
        break;

      default:
        return res.status(400).json({ message: 'Action non reconnue' });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('❌ Erreur action groupe:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de l\'action de groupe',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
}

async function getGroupStatus(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    if (tournament.type !== 'GROUP') {
      return res.status(400).json({ message: 'Ce tournoi n\'est pas un tournoi par groupes' });
    }

    // Récupérer les informations de tous les groupes
    const groupsStatus = [];
    const groupsCount = tournament.groupsCount || 0;

    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      const groupStatus = await getGroupDetails(tournamentId, groupNumber);
      groupsStatus.push(groupStatus);
    }

    // Vérifier si on peut démarrer les phases knockout
    const canStartKnockout = await canStartKnockoutPhase(tournamentId);
    
    return res.status(200).json({
      tournamentId,
      groupsCount,
      groups: groupsStatus,
      canStartKnockout,
      overallStatus: getOverallGroupStatus(groupsStatus)
    });
  } catch (error) {
    console.error('❌ Erreur récupération statut groupes:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du statut des groupes' });
  }
}

async function getGroupDetails(tournamentId: string, groupNumber: number) {
  // Récupérer les équipes du groupe
  const teams = await Team.find({ tournamentId, groupNumber }).lean();
  
  // Récupérer tous les matchs du groupe
  const matches = await Match.find({ 
    tournamentId, 
    groupNumber 
  }).populate(['team1Id', 'team2Id', 'winnerTeamId']).lean();

  // Séparer les matchs par round et type
  const round1Matches = matches.filter(m => m.round === 1 && m.roundType === 'GROUP');
  const round2Matches = matches.filter(m => m.round === 2 && m.roundType === 'GROUP');
  const qualificationMatches = matches.filter(m => m.roundType === 'GROUP_QUALIFICATION');

  // Calculer les statistiques des équipes
  const teamStats = teams.map(team => {
    const teamMatches = matches.filter(m => 
      m.team1Id._id.toString() === team._id.toString() || 
      m.team2Id?._id.toString() === team._id.toString()
    );
    
    const wins = teamMatches.filter(m => 
      m.winnerTeamId && m.winnerTeamId.toString() === team._id.toString()
    ).length;
    
    const losses = teamMatches.filter(m => 
      m.winnerTeamId && m.winnerTeamId.toString() !== team._id.toString()
    ).length;

    return {
      ...team,
      wins,
      losses,
      matchesPlayed: teamMatches.filter(m => m.status === 'COMPLETED').length
    };
  });

  // Déterminer le statut du groupe
  const round1Completed = round1Matches.length > 0 && round1Matches.every(m => m.status === 'COMPLETED');
  const round2Completed = round2Matches.length > 0 && round2Matches.every(m => m.status === 'COMPLETED');
  const qualificationCompleted = qualificationMatches.length > 0 && qualificationMatches.every(m => m.status === 'COMPLETED');

  let status = 'ROUND_1_IN_PROGRESS';
  if (qualificationCompleted) {
    status = 'COMPLETED';
  } else if (round2Completed) {
    status = 'QUALIFICATION_READY';
  } else if (round1Completed) {
    status = 'ROUND_2_READY';
  }

  return {
    groupNumber,
    teams: teamStats.sort((a, b) => b.wins - a.wins),
    matches: {
      round1: round1Matches,
      round2: round2Matches,
      qualification: qualificationMatches
    },
    status,
    round1Completed,
    round2Completed,
    qualificationCompleted
  };
}

async function checkAllGroupsProgression(tournamentId: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament || tournament.type !== 'GROUP') {
    throw new Error('Tournoi par groupes non trouvé');
  }

  const groupsCount = tournament.groupsCount || 0;
  const progressionResults = [];

  for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
    const groupStatus = await getGroupDetails(tournamentId, groupNumber);
    
    if (groupStatus.round1Completed && groupStatus.matches.round2.length === 0) {
      // Générer le round 2
      await TournamentService.generateGroupSecondRound(tournamentId, groupNumber);
      progressionResults.push(`Round 2 généré pour le groupe ${groupNumber}`);
    }
    
    if (groupStatus.round2Completed && groupStatus.matches.qualification.length === 0) {
      // Générer le match de qualification
      await TournamentService.generateGroupQualificationMatch(tournamentId, groupNumber);
      progressionResults.push(`Match de qualification généré pour le groupe ${groupNumber}`);
    }
  }

  return progressionResults;
}

async function canStartKnockoutPhase(tournamentId: string): Promise<boolean> {
  try {
    // Vérifier que tous les groupes sont terminés
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.type !== 'GROUP') {
      return false;
    }

    const groupsCount = tournament.groupsCount || 0;
    
    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      const groupStatus = await getGroupDetails(tournamentId, groupNumber);
      if (!groupStatus.qualificationCompleted) {
        return false;
      }
    }

    // Vérifier qu'il n'y a pas déjà de matchs knockout
    const knockoutMatches = await Match.find({
      tournamentId,
      roundType: { $in: ['WINNERS', 'LOSERS', 'KNOCKOUT'] }
    });

    return knockoutMatches.length === 0;
  } catch (error) {
    console.error('Erreur vérification knockout:', error);
    return false;
  }
}

function getOverallGroupStatus(groupsStatus: any[]) {
  if (groupsStatus.every(g => g.status === 'COMPLETED')) {
    return 'ALL_GROUPS_COMPLETED';
  } else if (groupsStatus.some(g => g.status === 'COMPLETED')) {
    return 'SOME_GROUPS_COMPLETED';
  } else if (groupsStatus.every(g => g.round1Completed)) {
    return 'ALL_ROUND_1_COMPLETED';
  } else {
    return 'IN_PROGRESS';
  }
} 