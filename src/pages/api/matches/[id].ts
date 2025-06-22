import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../services/TournamentService';
import Match from '../../../models/Match';
import connectDB from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du match requis' });
    }

    switch (req.method) {
      case 'GET':
        return await getMatch(req, res, id);
      case 'PUT':
        return await updateMatch(req, res, id);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API match:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getMatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const match = await Match.findById(id)
      .populate('team1', 'name players stats')
      .populate('team2', 'name players stats')
      .populate('tournament', 'name type settings');
    
    if (!match) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }

    return res.status(200).json(match);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération du match' });
  }
}

async function updateMatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { score1, score2, action } = req.body;

    if (action === 'start') {
      const match = await TournamentService.startMatch(id);
      return res.status(200).json({
        message: 'Match démarré avec succès',
        match
      });
    }

    if (action === 'update_score') {
      if (typeof score1 !== 'number' || typeof score2 !== 'number') {
        return res.status(400).json({ message: 'Scores requis' });
      }

      if (score1 < 0 || score2 < 0) {
        return res.status(400).json({ message: 'Les scores doivent être positifs' });
      }

      const match = await TournamentService.updateMatchScore(id, score1, score2);
      
      return res.status(200).json({
        message: 'Score mis à jour avec succès',
        match
      });
    }

    return res.status(400).json({ message: 'Action invalide' });
  } catch (error: any) {
    console.error('Erreur mise à jour match:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de la mise à jour du match' 
    });
  }
} 