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

    const { winnersMatches, losersMatches } = await TournamentService.generateKnockoutStage(id);
    
    return res.status(200).json({
      message: `Phase d'élimination démarrée avec ${winnersMatches.length} matchs winners et ${losersMatches.length} matchs losers`,
      winnersMatches,
      losersMatches,
      totalMatches: winnersMatches.length + losersMatches.length
    });
  } catch (error: any) {
    console.error('Erreur phase élimination:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors du démarrage de la phase d\'élimination' 
    });
  }
} 