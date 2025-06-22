import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { ExcelService } from '../../../services/ExcelService';
import { TournamentService } from '../../../services/TournamentService';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const form = new IncomingForm();
    
    const { fields, files } = await new Promise<{
      fields: any;
      files: any;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const tournamentId = Array.isArray(fields.tournamentId) ? fields.tournamentId[0] : fields.tournamentId;
    
    if (!tournamentId) {
      return res.status(400).json({ message: 'ID du tournoi requis' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file || !file.filepath) {
      return res.status(400).json({ message: 'Fichier Excel requis' });
    }

    // Lire le fichier
    const buffer = fs.readFileSync(file.filepath);
    
    // Parser les équipes
    const teamsData = ExcelService.parseTeamsFromExcel(buffer);
    
    if (teamsData.length === 0) {
      return res.status(400).json({ message: 'Aucune équipe trouvée dans le fichier' });
    }

    // Ajouter les équipes au tournoi
    const teams = await TournamentService.addTeams(tournamentId, teamsData);
    
    // Nettoyer le fichier temporaire
    fs.unlinkSync(file.filepath);
    
    return res.status(201).json({
      message: `${teams.length} équipe(s) importée(s) avec succès`,
      teams
    });
  } catch (error: any) {
    console.error('Erreur import équipes:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de l\'import des équipes' 
    });
  }
} 