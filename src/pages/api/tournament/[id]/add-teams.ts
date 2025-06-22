import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../../lib/mongodb';
import Team from '../../../../models/Team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const { id: tournamentId } = req.query;
    const { teamIds } = req.body;

    if (!tournamentId || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ message: 'ID du tournoi et liste des équipes requis' });
    }

    await connectDB();

    // Vérifier que les équipes existent
    const existingTeams = await Team.find({ 
      _id: { $in: teamIds }
    });

    if (existingTeams.length !== teamIds.length) {
      return res.status(400).json({ 
        message: 'Certaines équipes sont introuvables' 
      });
    }

    // Vérifier qu'aucune équipe n'est déjà dans ce tournoi
    const teamsInTournament = existingTeams.filter(team => 
      team.tournamentId && team.tournamentId.toString() === tournamentId
    );

    if (teamsInTournament.length > 0) {
      return res.status(400).json({ 
        message: 'Certaines équipes sont déjà dans ce tournoi' 
      });
    }

    // Mettre à jour les équipes avec le tournamentId
    const result = await Team.updateMany(
      { _id: { $in: teamIds } },
      { 
        $set: { 
          tournamentId: tournamentId,
          points: 0,
          scoreDiff: 0,
          groupNumber: null
        }
      }
    );

    // Récupérer les équipes mises à jour
    const updatedTeams = await Team.find({ _id: { $in: teamIds } });

    res.status(200).json({
      message: `${result.modifiedCount} équipes ajoutées au tournoi`,
      teams: updatedTeams
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout des équipes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
} 