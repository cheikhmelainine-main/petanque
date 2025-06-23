import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Vérifier si les demi-finales peuvent être lancées
    try {
      await connectDB();
      
      const { id: tournamentId } = req.query;
      
      if (!tournamentId || typeof tournamentId !== 'string') {
        return res.status(400).json({ error: 'ID du tournoi requis' });
      }

      const canStart = await TournamentService.canStartSemiFinals(tournamentId);

      return res.status(200).json({
        success: true,
        canStart: canStart.canStart,
        qualifiedTeamsCount: canStart.qualifiedTeams.length,
        qualifiedTeams: canStart.qualifiedTeams.map(team => ({
          id: team._id,
          name: team.name,
          originalGroup: team.originalGroup,
          qualificationRank: team.qualificationRank,
          qualificationType: team.qualificationType
        })),
        message: canStart.message
      });

    } catch (error) {
      console.error('Erreur lors de la vérification des demi-finales:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  if (req.method === 'POST') {
    // Générer les demi-finales
    try {
      await connectDB();
      
      const { id: tournamentId } = req.query;
      
      if (!tournamentId || typeof tournamentId !== 'string') {
        return res.status(400).json({ error: 'ID du tournoi requis' });
      }

      const result = await TournamentService.generateSemiFinals(tournamentId);

      return res.status(200).json({
        success: true,
        message: 'Demi-finales des qualifiés générées avec succès',
        data: {
          semiFinalMatchesCount: result.semiFinalMatches.length,
          qualifiedTeamsCount: result.qualifiedTeams.length,
          semiFinalMatches: result.semiFinalMatches.map(match => ({
            id: match._id,
            round: match.round,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            eliminationRound: match.metadata?.eliminationRound
          })),
          qualifiedTeams: result.qualifiedTeams.map(team => ({
            id: team._id,
            name: team.name,
            originalGroup: team.originalGroup,
            qualificationRank: team.qualificationRank
          }))
        }
      });

    } catch (error) {
      console.error('Erreur lors de la génération des demi-finales:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
} 