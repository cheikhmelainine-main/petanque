import { NextApiRequest, NextApiResponse } from 'next';
import Match from '../../../models/Match';
import connectDB from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getMatches(req, res);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API matchs:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getMatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tournamentId, round, status } = req.query;
    
    const filter: any = {};
    
    if (tournamentId) filter.tournament = tournamentId;
    if (round) filter.round = parseInt(round as string);
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('team1', 'name players stats')
      .populate('team2', 'name players stats')
      .populate('tournament', 'name type')
      .sort({ round: 1, createdAt: 1 });
    
    return res.status(200).json(matches);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des matchs' });
  }
} 