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
        return await handleWinnersFinalAction(req, res, id as string);
      case 'GET':
        return await getWinnersFinalStatus(req, res, id as string);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API group-winners-final:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function handleWinnersFinalAction(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const { action, groupNumber } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action requise' });
    }

    let result;

    switch (action) {
      case 'generate_winners_final':
        if (!groupNumber) {
          return res.status(400).json({ message: 'Numéro de groupe requis' });
        }
        result = await generateGroupWinnersFinal(tournamentId, groupNumber);
        break;

      case 'generate_winners_qualification':
        result = await generateWinnersQualification(tournamentId);
        break;

      default:
        return res.status(400).json({ message: 'Action non reconnue' });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('❌ Erreur action finale gagnants:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de l\'action de finale gagnants',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
}

async function generateGroupWinnersFinal(tournamentId: string, groupNumber: number) {
  // Récupérer tous les matchs du groupe
  const groupMatches = await Match.find({
    tournamentId,
    groupNumber,
    roundType: RoundType.GROUP,
    status: 'COMPLETED'
  });

  if (groupMatches.length < 2) {
    throw new Error('Pas assez de matchs terminés pour générer la finale des gagnants');
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

  if (sortedTeams.length >= 2) {
    const firstPlace = sortedTeams[0];  // 1er place
    const secondPlace = sortedTeams[1]; // 2e place

    // Vérifier si la finale existe déjà
    const existingFinal = await Match.findOne({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP_WINNERS_FINAL
    });

    if (existingFinal) {
      throw new Error('La finale des gagnants existe déjà pour ce groupe');
    }

    // FINALE DES GAGNANTS : 1er vs 2e place
    const winnersFinal = new Match({
      tournamentId,
      round: 3,
      roundType: RoundType.GROUP_WINNERS_FINAL,
      groupNumber,
      team1Id: firstPlace.teamId,
      team2Id: secondPlace.teamId,
      isTimedMatch: false,
      metadata: {
        finalType: 'winners',
        groupNumber,
        description: 'Finale des gagnants de groupe'
      }
    });

    await winnersFinal.save();
    console.log(`🏆 Finale des gagnants créée : ${firstPlace.teamId} vs ${secondPlace.teamId} (Groupe ${groupNumber})`);

    // Marquer les équipes comme qualifiées pour le bracket des gagnants
    await Team.findByIdAndUpdate(firstPlace.teamId, { 
      isQualified: true,
      qualificationRank: 1,
      originalGroup: groupNumber,
      qualificationType: 'winners_final'
    });

    await Team.findByIdAndUpdate(secondPlace.teamId, { 
      isQualified: true,
      qualificationRank: 2,
      originalGroup: groupNumber,
      qualificationType: 'winners_final'
    });

    return {
      message: `Finale des gagnants générée pour le groupe ${groupNumber}`,
      match: winnersFinal
    };
  } else {
    throw new Error('Pas assez d\'équipes pour générer la finale des gagnants');
  }
}

async function generateWinnersQualification(tournamentId: string) {
  // Récupérer toutes les équipes qualifiées pour le bracket des gagnants
  const winnersTeams = await Team.find({
    tournamentId: new mongoose.Types.ObjectId(tournamentId),
    qualificationType: 'winners_final'
  });

  if (winnersTeams.length < 4) {
    throw new Error('Pas assez d\'équipes gagnantes qualifiées pour générer le bracket');
  }

  console.log(`🏆 Génération du bracket des gagnants avec ${winnersTeams.length} équipes`);

  // Générer le bracket d'élimination pour les gagnants
  const eliminationMatches = await TournamentService.generateWinnersBracketOnly(
    tournamentId, 
    winnersTeams
  );

  return {
    message: `Bracket des gagnants généré avec ${eliminationMatches.length} matchs`,
    matches: eliminationMatches
  };
}

async function getWinnersFinalStatus(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    if (tournament.type !== 'GROUP') {
      return res.status(400).json({ message: 'Ce tournoi n\'est pas un tournoi par groupes' });
    }

    // Récupérer toutes les finales des gagnants
    const winnersFinals = await Match.find({
      tournamentId,
      roundType: RoundType.GROUP_WINNERS_FINAL
    }).populate(['team1Id', 'team2Id', 'winnerTeamId']).lean();

    // Récupérer les équipes qualifiées pour le bracket des gagnants
    const qualifiedWinnersTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      qualificationType: 'winners_final'
    }).lean();

    // Grouper par groupe
    const finalsByGroup = new Map();
    winnersFinals.forEach(final => {
      const groupNumber = final.groupNumber;
      if (!finalsByGroup.has(groupNumber)) {
        finalsByGroup.set(groupNumber, []);
      }
      finalsByGroup.get(groupNumber).push(final);
    });

    return res.status(200).json({
      tournamentId,
      winnersFinals: Array.from(finalsByGroup.entries()).map(([groupNumber, finals]) => ({
        groupNumber,
        finals
      })),
      totalFinals: winnersFinals.length,
      qualifiedTeams: qualifiedWinnersTeams,
      canGenerateQualification: qualifiedWinnersTeams.length >= 4
    });
  } catch (error) {
    console.error('❌ Erreur récupération finales gagnants:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des finales des gagnants' });
  }
} 