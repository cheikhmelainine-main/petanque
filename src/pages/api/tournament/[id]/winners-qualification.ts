import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import { connectToDatabase } from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    await connectToDatabase();
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID de tournoi requis' });
    }

    console.log(`🏆 Génération des qualifications du bracket des gagnants pour le tournoi ${id}`);

    // Récupérer toutes les équipes qualifiées
    const qualifiedTeams = await TournamentService.getQualifiedTeams(id);
    
    // Filtrer uniquement les équipes gagnantes
    const winnersTeams = qualifiedTeams.filter(team => team.qualificationType === 'winners_final');

    if (winnersTeams.length < 4) {
      return res.status(400).json({ 
        error: `Pas assez d'équipes gagnantes qualifiées (${winnersTeams.length}/4 minimum)` 
      });
    }

    console.log(`✅ ${winnersTeams.length} équipes gagnantes qualifiées`);

    // Générer le bracket des gagnants uniquement
    const eliminationMatches = await TournamentService.generateWinnersBracketOnly(id, winnersTeams);

    console.log(`🏆 Bracket des gagnants créé avec ${eliminationMatches.length} matchs`);

    res.status(200).json({
      success: true,
      message: 'Qualifications du bracket des gagnants générées avec succès',
      qualifiedTeams: winnersTeams,
      eliminationMatches,
      bracketType: 'winners'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération des qualifications gagnantes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération des qualifications gagnantes',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 