import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    const tournament = await TournamentService.nextRound(id);
    
    return res.status(200).json({
      message: 'Tour suivant généré avec succès',
      tournament
    });
  } catch (error: any) {
    console.error('Erreur tour suivant:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors du passage au tour suivant' 
    });
  }
} 