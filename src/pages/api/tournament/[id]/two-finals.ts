import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Vérifier si les deux finales peuvent être lancées
    try {
      await connectDB();
      
      const { id: tournamentId } = req.query;
      
      if (!tournamentId || typeof tournamentId !== 'string') {
        return res.status(400).json({ error: 'ID du tournoi requis' });
      }

      const canStart = await TournamentService.canStartTwoFinals(tournamentId);

      return res.status(200).json({
        success: true,
        canStart: canStart.canStart,
        winnersTeamsCount: canStart.winnersTeams.length,
        losersTeamsCount: canStart.losersTeams.length,
        winnersTeams: canStart.winnersTeams.map(team => ({
          id: team._id,
          name: team.name,
          originalGroup: team.originalGroup,
          qualificationRank: team.qualificationRank
        })),
        losersTeams: canStart.losersTeams.map(team => ({
          id: team._id,
          name: team.name,
          originalGroup: team.originalGroup,
          qualificationRank: team.qualificationRank
        })),
        message: canStart.message
      });

    } catch (error) {
      console.error('Erreur lors de la vérification des finales:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  if (req.method === 'POST') {
    // Générer les deux finales
    try {
      await connectDB();
      
      const { id: tournamentId } = req.query;
      
      if (!tournamentId || typeof tournamentId !== 'string') {
        return res.status(400).json({ error: 'ID du tournoi requis' });
      }

      const result = await TournamentService.generateTwoFinals(tournamentId);

      return res.status(200).json({
        success: true,
        message: 'Deux finales générées avec succès',
        data: {
          winnersFinal: {
            id: result.winnersFinal._id,
            round: result.winnersFinal.round,
            team1Id: result.winnersFinal.team1Id,
            team2Id: result.winnersFinal.team2Id,
            eliminationRound: result.winnersFinal.metadata?.eliminationRound
          },
          losersFinal: {
            id: result.losersFinal._id,
            round: result.losersFinal.round,
            team1Id: result.losersFinal.team1Id,
            team2Id: result.losersFinal.team2Id,
            eliminationRound: result.losersFinal.metadata?.eliminationRound
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la génération des finales:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
} 