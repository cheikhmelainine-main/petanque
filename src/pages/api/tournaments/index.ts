import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../../services/TournamentService';
import Tournament from '../../../models/Tournament';
import { connectDB } from '../../../lib/mongodb';

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
      .populate('teams')
      .sort({ createdAt: -1 });
    
    return res.status(200).json(tournaments);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des tournois' });
  }
}

async function createTournament(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      type,
      settings
    } = req.body;

    // Validation des données
    if (!name || !type) {
      return res.status(400).json({ message: 'Nom et type du tournoi requis' });
    }

    if (!['groups', 'swiss', 'marathon'].includes(type)) {
      return res.status(400).json({ message: 'Type de tournoi invalide' });
    }

    // Validation des paramètres selon le type
    if (type === 'groups') {
      if (!settings?.playersPerGroup || ![3, 4].includes(settings.playersPerGroup)) {
        return res.status(400).json({ message: 'Nombre de joueurs par groupe invalide (3 ou 4)' });
      }
    }

    if (['swiss', 'marathon'].includes(type)) {
      if (!settings?.rounds || ![4, 5].includes(settings.rounds)) {
        return res.status(400).json({ message: 'Nombre de tours invalide (4 ou 5)' });
      }
      if (!settings?.timeLimit || settings.timeLimit < 30 || settings.timeLimit > 120) {
        return res.status(400).json({ message: 'Limite de temps invalide (30-120 minutes)' });
      }
    }

    const tournament = await TournamentService.createTournament({
      name,
      type,
      settings: {
        ...settings,
        winningScore: settings?.winningScore || 13,
        maxTeams: settings?.maxTeams || 128,
        teamType: settings?.teamType || 'individual'
      }
    });

    return res.status(201).json(tournament);
  } catch (error) {
    console.error('Erreur création tournoi:', error);
    return res.status(500).json({ message: 'Erreur lors de la création du tournoi' });
  }
} 