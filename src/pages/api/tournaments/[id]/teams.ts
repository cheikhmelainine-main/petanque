import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../../services/TournamentService';
import Team from '../../../../models/Team';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    switch (req.method) {
      case 'GET':
        return await getTeams(req, res, id);
      case 'POST':
        return await addTeams(req, res, id);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API équipes:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getTeams(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const teams = await Team.find({ tournament: tournamentId })
      .sort({ 'stats.points': -1, 'stats.scoreDifference': -1 });
    
    return res.status(200).json(teams);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des équipes' });
  }
}

async function addTeams(req: NextApiRequest, res: NextApiResponse, tournamentId: string) {
  try {
    const { teams } = req.body;

    if (!teams || !Array.isArray(teams)) {
      return res.status(400).json({ message: 'Liste d\'équipes requise' });
    }

    // Validation des équipes
    for (const team of teams) {
      if (!team.name || !team.players || !Array.isArray(team.players)) {
        return res.status(400).json({ message: 'Nom et joueurs requis pour chaque équipe' });
      }

      if (team.players.length < 1 || team.players.length > 3) {
        return res.status(400).json({ message: 'Une équipe doit avoir entre 1 et 3 joueurs' });
      }

      for (const player of team.players) {
        if (!player.name) {
          return res.status(400).json({ message: 'Nom requis pour chaque joueur' });
        }
      }
    }

    const createdTeams = await TournamentService.addTeams(tournamentId, teams);
    
    return res.status(201).json({
      message: `${createdTeams.length} équipe(s) ajoutée(s) avec succès`,
      teams: createdTeams
    });
  } catch (error: any) {
    console.error('Erreur ajout équipes:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de l\'ajout des équipes' 
    });
  }
} 