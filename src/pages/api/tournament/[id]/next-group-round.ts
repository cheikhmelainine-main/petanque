import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import Tournament from '../../../../models/Tournament';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    await connectDB();

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    if (tournament.type !== 'GROUP') {
      return res.status(400).json({ message: 'Cette API est uniquement pour les tournois par groupes' });
    }

    // Vérifier si on peut démarrer le round suivant
    const roundStatus = await TournamentService.canStartNextRound(id as string);
    
    if (!roundStatus.canStart) {
      return res.status(400).json({ 
        message: `Impossible de démarrer le round suivant. ${roundStatus.completedGroups}/${roundStatus.totalGroups} groupes terminés.`,
        roundStatus
      });
    }

    // Démarrer le round suivant pour tous les groupes
    await TournamentService.startNextRoundAllGroups(id as string);

    // Récupérer le nouveau statut
    const newRoundStatus = await TournamentService.canStartNextRound(id as string);

    return res.status(200).json({
      message: `Round ${newRoundStatus.currentRound} démarré avec succès`,
      roundStatus: newRoundStatus
    });

  } catch (error) {
    console.error('❌ Erreur API next-group-round:', error);
    return res.status(500).json({ 
      message: 'Erreur lors du démarrage du round suivant',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 