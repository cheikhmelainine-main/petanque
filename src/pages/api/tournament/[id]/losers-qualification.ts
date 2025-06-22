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

    console.log(`🥉 Génération des qualifications du bracket des perdants pour le tournoi ${id}`);

    // Récupérer toutes les équipes qualifiées
    const qualifiedTeams = await TournamentService.getQualifiedTeams(id);
    
    // Filtrer uniquement les équipes perdantes
    const losersTeams = qualifiedTeams.filter(team => team.qualificationType === 'losers_final');

    if (losersTeams.length < 4) {
      return res.status(400).json({ 
        error: `Pas assez d'équipes perdantes qualifiées (${losersTeams.length}/4 minimum)` 
      });
    }

    console.log(`✅ ${losersTeams.length} équipes perdantes qualifiées`);

    // Générer le bracket des perdants uniquement
    const eliminationMatches = await TournamentService.generateLosersBracketOnly(id, losersTeams);

    console.log(`🥉 Bracket des perdants créé avec ${eliminationMatches.length} matchs`);

    res.status(200).json({
      success: true,
      message: 'Qualifications du bracket des perdants générées avec succès',
      qualifiedTeams: losersTeams,
      eliminationMatches,
      bracketType: 'losers'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération des qualifications perdantes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la génération des qualifications perdantes',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 