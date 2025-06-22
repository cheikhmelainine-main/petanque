import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import Tournament from '../../../../models/Tournament';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    await connectDB();

    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    const ranking = await TournamentService.getTournamentRanking(id as string);

    return res.status(200).json({
      tournamentId: id,
      tournamentType: tournament.type,
      ranking
    });

  } catch (error) {
    console.error('❌ Erreur API ranking:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération du classement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 