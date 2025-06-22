import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../services/TournamentService';
import Match, { MatchStatus } from '../../models/Match';
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
    console.error('Erreur API matchs:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getMatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tournamentId, round, status } = req.query;
    
    const filter: any = {};
    if (tournamentId) filter.tournamentId = tournamentId;
    if (round) filter.round = parseInt(round as string);
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('team1Id', 'name')
      .populate('team2Id', 'name')
      .populate('winnerTeamId', 'name')
      .populate('tournamentId', 'name type')
      .sort({ round: 1, createdAt: 1 });
    
    return res.status(200).json(matches);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des matchs' });
  }
}

async function updateMatch(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { matchId, team1Score, team2Score, action } = req.body;

    if (!matchId) {
      return res.status(400).json({ message: 'ID du match requis' });
    }

    if (action === 'start') {
      const match = await Match.findByIdAndUpdate(
        matchId,
        { 
          status: MatchStatus.ONGOING,
          startedAt: new Date()
        },
        { new: true }
      );

      if (!match) {
        return res.status(404).json({ message: 'Match non trouvé' });
      }

      return res.status(200).json({
        message: 'Match démarré avec succès',
        match
      });
    }

    if (action === 'update_score') {
      if (typeof team1Score !== 'number' || typeof team2Score !== 'number') {
        return res.status(400).json({ message: 'Scores requis' });
      }

      const { finishedBeforeTimeLimit } = req.body;
      const match = await TournamentService.updateMatchScore(matchId, team1Score, team2Score, finishedBeforeTimeLimit);
      
      return res.status(200).json({
        message: 'Score mis à jour avec succès',
        match
      });
    }

    return res.status(400).json({ message: 'Action invalide' });
  } catch (error) {
    console.error('Erreur mise à jour match:', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du match' });
  }
} 