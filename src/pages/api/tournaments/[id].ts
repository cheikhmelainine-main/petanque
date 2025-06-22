import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../services/TournamentService';
import Tournament from '../../../models/Tournament';
import connectDB from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    switch (req.method) {
      case 'GET':
        return await getTournament(req, res, id);
      case 'PUT':
        return await updateTournament(req, res, id);
      case 'DELETE':
        return await deleteTournament(req, res, id);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API tournoi:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getTournament(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const tournament = await Tournament.findById(id)
      .populate('teams')
      .populate('matches')
      .populate('groups');
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    return res.status(200).json(tournament);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération du tournoi' });
  }
}

async function updateTournament(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const updateData = req.body;
    
    const tournament = await Tournament.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    return res.status(200).json(tournament);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du tournoi' });
  }
}

async function deleteTournament(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const tournament = await Tournament.findByIdAndDelete(id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    return res.status(200).json({ message: 'Tournoi supprimé avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la suppression du tournoi' });
  }
} 