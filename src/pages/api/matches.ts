import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../services/TournamentService';
import Match from '../../models/Match';
import connectDB from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getMatches(req, res);
      case 'PUT':
        return await updateMatch(req, res);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('❌ Erreur API matchs:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getMatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tournamentId, round } = req.query;
    
    let filter: any = {};
    
    if (tournamentId) {
      filter.tournamentId = tournamentId;
    }
    
    if (round) {
      filter.round = parseInt(round as string);
    }
    
    const matches = await Match.find(filter)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name')
      .populate('winnerTeamId', 'name')
      .sort({ round: 1, createdAt: 1 });
    
    return res.status(200).json(matches);
  } catch (error) {
    console.error('❌ Erreur récupération matchs:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des matchs' });
  }
}

async function updateMatch(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Action match reçue:', req.body);
    
    const { action, matchId, team1Score, team2Score, finishedBeforeTimeLimit } = req.body;

    if (!action || !matchId) {
      console.log('❌ Action ou matchId manquant');
      return res.status(400).json({ message: 'Action et matchId requis' });
    }

    let updatedMatch;

    switch (action) {
      case 'update_score':
        if (team1Score === undefined || team2Score === undefined) {
          return res.status(400).json({ message: 'Scores requis pour cette action' });
        }
        
        console.log('✅ Mise à jour du score...');
        updatedMatch = await TournamentService.updateMatchScore(
          matchId,
          team1Score,
          team2Score,
          finishedBeforeTimeLimit
        );
        break;

      case 'start_timer':
        console.log('✅ Démarrage du timer...');
        updatedMatch = await TournamentService.startMatchTimer(matchId);
        break;

      case 'end_timer':
        console.log('✅ Arrêt du timer...');
        const match = await Match.findById(matchId);
        if (!match) {
          return res.status(404).json({ message: 'Match non trouvé' });
        }
        
        // Marquer le match comme fini par temps limite si pas de score
        if (match.team1Score === undefined || match.team2Score === undefined) {
          match.status = 'TIMED_OUT';
        }
        match.endedAt = new Date();
        updatedMatch = await match.save();
        break;

      default:
        return res.status(400).json({ message: 'Action non reconnue' });
    }

    const populatedMatch = await Match.findById(updatedMatch._id)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name')
      .populate('winnerTeamId', 'name');

    console.log('✅ Match mis à jour:', populatedMatch._id);
    return res.status(200).json(populatedMatch);
  } catch (error) {
    console.error('❌ Erreur mise à jour match:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du match',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 