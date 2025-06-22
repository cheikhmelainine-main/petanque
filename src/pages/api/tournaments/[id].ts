import { NextApiRequest, NextApiResponse } from 'next';
import Tournament from '../../../models/Tournament';
import connectDB from '../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    // Vérifier que l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID du tournoi invalide' });
    }

    switch (req.method) {
      case 'GET':
        return await getTournament(req, res, id);
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
      .populate('createdById', 'email username');
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('Erreur lors de la récupération du tournoi:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du tournoi' });
  }
} 