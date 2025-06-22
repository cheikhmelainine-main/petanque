import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import Tournament from '../../../../models/Tournament';
import Team from '../../../../models/Team';
import Match, { RoundType } from '../../../../models/Match';
import connectDB from '../../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    await connectDB();

    switch (req.method) {
      case 'POST':
        return await handleLosersFinalAction(req, res, id as string);
      case 'GET':
        return await getLosersFinalStatus(req, res, id as string);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API group-losers-final:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function handleLosersFinalAction(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const { action, groupNumber } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action requise' });
    }

    let result;

    switch (action) {
      case 'generate_losers_final':
        if (!groupNumber) {
          return res.status(400).json({ message: 'Numéro de groupe requis' });
        }
        result = await generateGroupLosersFinal(tournamentId, groupNumber);
        break;

      case 'generate_losers_qualification':
        result = await generateLosersQualification(tournamentId);
        break;

      default:
        return res.status(400).json({ message: 'Action non reconnue' });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('❌ Erreur action finale perdants:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de l\'action de finale perdants',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
}

async function generateGroupLosersFinal(tournamentId: string, groupNumber: number) {
  // Récupérer tous les matchs du groupe
  const groupMatches = await Match.find({
    tournamentId,
    groupNumber,
    roundType: RoundType.GROUP,
    status: 'COMPLETED'
  });

  if (groupMatches.length < 2) {
    throw new Error('Pas assez de matchs terminés pour générer la finale des perdants');
  }

  // Identifier les équipes et leurs résultats
  const teamResults = new Map<string, { wins: number, teamId: mongoose.Types.ObjectId }>();

  groupMatches.forEach(match => {
    const team1Id = match.team1Id.toString();
    const team2Id = match.team2Id.toString();

    if (!teamResults.has(team1Id)) {
      teamResults.set(team1Id, { wins: 0, teamId: match.team1Id });
    }
    if (!teamResults.has(team2Id)) {
      teamResults.set(team2Id, { wins: 0, teamId: match.team2Id });
    }

    if (match.winnerTeamId) {
      const winnerId = match.winnerTeamId.toString();
      const winnerResult = teamResults.get(winnerId);
      if (winnerResult) {
        winnerResult.wins++;
      }
    }
  });

  // Trier les équipes par nombre de victoires
  const sortedTeams = Array.from(teamResults.values()).sort((a, b) => b.wins - a.wins);

  if (sortedTeams.length >= 4) {
    const thirdPlace = sortedTeams[2];  // 3e place
    const fourthPlace = sortedTeams[3]; // 4e place

    // Vérifier si la finale existe déjà
    const existingFinal = await Match.findOne({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP_LOSERS_FINAL
    });

    if (existingFinal) {
      throw new Error('La finale des perdants existe déjà pour ce groupe');
    }

    // FINALE DES PERDANTS : 3e vs 4e place
    const losersFinal = new Match({
      tournamentId,
      round: 3,
      roundType: RoundType.GROUP_LOSERS_FINAL,
      groupNumber,
      team1Id: thirdPlace.teamId,
      team2Id: fourthPlace.teamId,
      isTimedMatch: false,
      metadata: {
        finalType: 'losers',
        groupNumber,
        description: 'Finale des perdants de groupe'
      }
    });

    await losersFinal.save();
    console.log(`🥉 Finale des perdants créée : ${thirdPlace.teamId} vs ${fourthPlace.teamId} (Groupe ${groupNumber})`);

    // Marquer les équipes comme qualifiées pour le bracket des perdants
    await Team.findByIdAndUpdate(thirdPlace.teamId, { 
      isQualified: true,
      qualificationRank: 3,
      originalGroup: groupNumber,
      qualificationType: 'losers_final'
    });

    await Team.findByIdAndUpdate(fourthPlace.teamId, { 
      isQualified: true,
      qualificationRank: 4,
      originalGroup: groupNumber,
      qualificationType: 'losers_final'
    });

    return {
      message: `Finale des perdants générée pour le groupe ${groupNumber}`,
      match: losersFinal
    };
  } else if (sortedTeams.length >= 3) {
    // Pour un groupe de 3 équipes, la 3e place est automatiquement qualifiée
    const thirdPlace = sortedTeams[2];

    // Vérifier si la finale existe déjà
    const existingFinal = await Match.findOne({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP_LOSERS_FINAL
    });

    if (existingFinal) {
      throw new Error('La finale des perdants existe déjà pour ce groupe');
    }

    // Marquer la 3e place comme qualifiée pour le bracket des perdants
    await Team.findByIdAndUpdate(thirdPlace.teamId, { 
      isQualified: true,
      qualificationRank: 3,
      originalGroup: groupNumber,
      qualificationType: 'losers_final'
    });

    return {
      message: `3e place qualifiée pour le groupe ${groupNumber} (pas de finale des perdants nécessaire)`,
      qualifiedTeam: thirdPlace
    };
  } else {
    throw new Error('Pas assez d\'équipes pour générer la finale des perdants');
  }
}

async function generateLosersQualification(tournamentId: string) {
  // Récupérer toutes les équipes qualifiées pour le bracket des perdants
  const losersTeams = await Team.find({
    tournamentId: new mongoose.Types.ObjectId(tournamentId),
    qualificationType: 'losers_final'
  });

  if (losersTeams.length < 4) {
    throw new Error('Pas assez d\'équipes perdantes qualifiées pour générer le bracket');
  }

  console.log(`🥉 Génération du bracket des perdants avec ${losersTeams.length} équipes`);

  // Générer le bracket d'élimination pour les perdants
  const eliminationMatches = await TournamentService.generateEliminationBracket(
    tournamentId, 
    losersTeams, 
    new Map()
  );

  return {
    message: `Bracket des perdants généré avec ${eliminationMatches.length} matchs`,
    matches: eliminationMatches
  };
}

async function getLosersFinalStatus(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    if (tournament.type !== 'GROUP') {
      return res.status(400).json({ message: 'Ce tournoi n\'est pas un tournoi par groupes' });
    }

    // Récupérer toutes les finales des perdants
    const losersFinals = await Match.find({
      tournamentId,
      roundType: RoundType.GROUP_LOSERS_FINAL
    }).populate(['team1Id', 'team2Id', 'winnerTeamId']).lean();

    // Récupérer les équipes qualifiées pour le bracket des perdants
    const qualifiedLosersTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      qualificationType: 'losers_final'
    }).lean();

    // Grouper par groupe
    const finalsByGroup = new Map();
    losersFinals.forEach(final => {
      const groupNumber = final.groupNumber;
      if (!finalsByGroup.has(groupNumber)) {
        finalsByGroup.set(groupNumber, []);
      }
      finalsByGroup.get(groupNumber).push(final);
    });

    return res.status(200).json({
      tournamentId,
      losersFinals: Array.from(finalsByGroup.entries()).map(([groupNumber, finals]) => ({
        groupNumber,
        finals
      })),
      totalFinals: losersFinals.length,
      qualifiedTeams: qualifiedLosersTeams,
      canGenerateQualification: qualifiedLosersTeams.length >= 4
    });
  } catch (error) {
    console.error('❌ Erreur récupération finales perdants:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des finales des perdants' });
  }
} 