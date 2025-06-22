import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    await connectDB();
    
    const { id: tournamentId } = req.query;
    
    if (!tournamentId || typeof tournamentId !== 'string') {
      return res.status(400).json({ error: 'ID du tournoi requis' });
    }

    // Vérifier que toutes les poules sont terminées
    const canStartQualification = await TournamentService.canStartNextRound(tournamentId);
    
    if (!canStartQualification.canStart) {
      return res.status(400).json({ 
        error: 'Impossible de lancer les qualifications',
        details: {
          currentRound: canStartQualification.currentRound,
          completedGroups: canStartQualification.completedGroups,
          totalGroups: canStartQualification.totalGroups
        }
      });
    }

    // Générer la phase de qualification avec tirage au sort
    const result = await TournamentService.generateQualificationPhase(tournamentId);

    return res.status(200).json({
      success: true,
      message: `Phase de qualification générée avec succès`,
      data: {
        qualifiedTeamsCount: result.qualifiedTeams.length,
        eliminationMatchesCount: result.eliminationMatches.length,
        qualifiedTeams: result.qualifiedTeams.map(team => ({
          id: team._id,
          name: team.name,
          originalGroup: team.originalGroup,
          qualificationRank: team.qualificationRank
        })),
        eliminationMatches: result.eliminationMatches.map(match => ({
          id: match._id,
          round: match.round,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          eliminationRound: match.metadata?.eliminationRound
        }))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération de la phase de qualification:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 