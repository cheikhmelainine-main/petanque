import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await connectDB();

    const { id: tournamentId } = req.query;
    const { groupNumber } = req.body;

    if (!tournamentId || typeof tournamentId !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    if (!groupNumber || typeof groupNumber !== 'number') {
      return res.status(400).json({ message: 'Numéro de groupe requis' });
    }

    console.log('🔍 Génération du match de qualification pour le groupe:', groupNumber);

    await TournamentService.generateGroupQualificationMatch(tournamentId, groupNumber);

    console.log('✅ Match de qualification généré avec succès');
    return res.status(200).json({ message: 'Match de qualification généré avec succès' });
  } catch (error) {
    console.error('❌ Erreur génération match qualification:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la génération du match de qualification',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 