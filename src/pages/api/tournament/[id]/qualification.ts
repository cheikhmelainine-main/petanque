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

    console.log('🏆 Lancement des qualifications pour le tournoi:', id);

    const result = await TournamentService.generateQualificationPhase(id);
    
    return res.status(200).json({
      message: `Qualifications lancées avec succès ! ${result.qualifiedTeams.length} équipes qualifiées, ${result.eliminationMatches.length} matchs d'élimination créés`,
      qualifiedTeams: result.qualifiedTeams,
      eliminationMatches: result.eliminationMatches,
      totalQualified: result.qualifiedTeams.length,
      totalMatches: result.eliminationMatches.length
    });
  } catch (error: any) {
    console.error('❌ Erreur lors des qualifications:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors du lancement des qualifications' 
    });
  }
} 