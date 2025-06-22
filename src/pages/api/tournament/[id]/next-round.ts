import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await connectDB();
    
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    const matches = await TournamentService.generateNextRound(id);
    
    return res.status(200).json({
      message: `Tour suivant généré avec ${matches.length} matchs`,
      matches
    });
  } catch (error: any) {
    console.error('Erreur génération tour suivant:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de la génération du tour suivant' 
    });
  }
} 