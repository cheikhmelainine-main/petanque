import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../services/TournamentService';
import Tournament from '../../models/Tournament';
import connectDB from '../../lib/mongodb';
import { TournamentType, TeamFormat } from '../../models/Tournament';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getTournaments(req, res);
      case 'POST':
        return await createTournament(req, res);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API tournois:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getTournaments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tournaments = await Tournament.find()
      .populate('createdById', 'email')
      .sort({ createdAt: -1 });
    
    return res.status(200).json(tournaments);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des tournois' });
  }
}

async function createTournament(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Données reçues pour création tournoi:', req.body);
    
    const {
      name,
      type,
      format,
      rounds,
      startDate,
      createdById
    } = req.body;

    // Validation des données
    if (!name || !type || !format || !startDate || !createdById) {
      console.log('❌ Données manquantes:', { name, type, format, startDate, createdById });
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    console.log('🔍 Validation des types:', { 
      typeValid: Object.values(TournamentType).includes(type),
      formatValid: Object.values(TeamFormat).includes(format),
      availableTypes: Object.values(TournamentType),
      availableFormats: Object.values(TeamFormat)
    });

    if (!Object.values(TournamentType).includes(type)) {
      console.log('❌ Type de tournoi invalide:', type);
      return res.status(400).json({ message: 'Type de tournoi invalide' });
    }

    if (!Object.values(TeamFormat).includes(format)) {
      console.log('❌ Format d\'équipe invalide:', format);
      return res.status(400).json({ message: 'Format d\'équipe invalide' });
    }

    console.log('✅ Création du tournoi...');
    const tournament = await TournamentService.createTournament({
      name,
      type,
      format,
      rounds,
      startDate: new Date(startDate),
      createdById
    });

    console.log('✅ Tournoi créé:', tournament._id);
    return res.status(201).json(tournament);
  } catch (error) {
    console.error('❌ Erreur création tournoi:', error);
    return res.status(500).json({ message: 'Erreur lors de la création du tournoi' });
  }
} 