import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../services/TournamentService';
import connectDB from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await connectDB();
    
    const { 
      matchId, 
      team1Score, 
      team2Score, 
      victoryType, // 'TIME_LIMIT' | 'SCORE_13' | 'NORMAL'
      winnerTeamId 
    } = req.body;

    if (!matchId || team1Score === undefined || team2Score === undefined) {
      return res.status(400).json({ 
        message: 'ID du match, scores et type de victoire requis' 
      });
    }

    // Validation des scores
    if (team1Score < 0 || team2Score < 0) {
      return res.status(400).json({ 
        message: 'Les scores ne peuvent pas être négatifs' 
      });
    }

    // Validation du type de victoire
    const validVictoryTypes = ['TIME_LIMIT', 'SCORE_13', 'NORMAL'];
    if (victoryType && !validVictoryTypes.includes(victoryType)) {
      return res.status(400).json({ 
        message: 'Type de victoire invalide' 
      });
    }

    // Déterminer si c'est une victoire avant limite de temps
    let finishedBeforeTimeLimit = false;
    
    if (victoryType === 'TIME_LIMIT') {
      finishedBeforeTimeLimit = true;
    } else if (victoryType === 'SCORE_13') {
      // Victoire à 13 points
      if (team1Score !== 13 && team2Score !== 13) {
        return res.status(400).json({ 
          message: 'Pour une victoire à 13, un des scores doit être 13' 
        });
      }
      finishedBeforeTimeLimit = false;
    } else {
      // Victoire normale (pas de limite de temps spécifiée)
      finishedBeforeTimeLimit = false;
    }

    // Vérifier qu'il n'y a pas d'égalité en phase knockout
    const match = await TournamentService.updateMatchScore(
      matchId, 
      team1Score, 
      team2Score, 
      finishedBeforeTimeLimit
    );

    // Pour les phases knockout, il ne peut pas y avoir d'égalité
    const isKnockoutPhase = ['WINNERS', 'LOSERS', 'KNOCKOUT'].includes(match.roundType);
    
    if (isKnockoutPhase && team1Score === team2Score) {
      return res.status(400).json({ 
        message: 'Pas d\'égalité autorisée en phase d\'élimination. Un gagnant doit être désigné.' 
      });
    }

    return res.status(200).json({
      message: 'Score mis à jour par l\'arbitre',
      match,
      victoryInfo: {
        type: victoryType,
        finishedBeforeTimeLimit,
        isKnockout: isKnockoutPhase
      }
    });

  } catch (error: any) {
    console.error('Erreur mise à jour score arbitre:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de la mise à jour du score' 
    });
  }
} 