import { NextApiRequest, NextApiResponse } from 'next';
import { ExcelService } from '../../../../services/ExcelService';
import Tournament from '../../../../models/Tournament';
import Team from '../../../../models/Team';
import Match from '../../../../models/Match';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    await connectDB();
    
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    // Récupérer les données du tournoi
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    const teams = await Team.find({ tournament: id });
    const matches = await Match.find({ tournament: id })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name');

    // Générer le fichier Excel
    const buffer = ExcelService.exportTournamentResults(tournament, teams, matches);
    
    const filename = `resultats_${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
  } catch (error: any) {
    console.error('Erreur export tournoi:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de l\'export du tournoi' 
    });
  }
} 