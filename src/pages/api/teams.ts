import { NextApiRequest, NextApiResponse } from 'next';
import { TournamentService } from '../../services/TournamentService';
import Team from '../../models/Team';
import TeamMember from '../../models/TeamMember';
import connectDB from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        return await getTeams(req, res);
      case 'POST':
        return await createTeam(req, res);
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API équipes:', error);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
}

async function getTeams(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Début getTeams - Query:', req.query);
    const { tournamentId } = req.query;
    
    const filter = tournamentId ? { tournamentId } : {};
    console.log('🔍 Filter utilisé:', filter);
    
    console.log('🔍 Recherche des équipes...');
    const teams = await Team.find(filter)
      .populate('tournamentId', 'name type')
      .sort({ points: -1, scoreDiff: -1 });
    
    console.log('🔍 Équipes trouvées:', teams.length);
    
    // Récupérer les membres pour chaque équipe
    console.log('🔍 Récupération des membres...');
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await TeamMember.find({ teamId: team._id });
        return {
          ...team.toObject(),
          members
        };
      })
    );
    
    console.log('🔍 Équipes avec membres:', teamsWithMembers.length);
    return res.status(200).json(teamsWithMembers);
  } catch (error) {
    console.error('❌ Erreur dans getTeams:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des équipes', error: error.message });
  }
}

async function createTeam(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Données reçues pour création équipe:', req.body);
    
    const {
      name,
      tournamentId,
      memberNames,
      groupNumber
    } = req.body;

    // Validation des données
    if (!name || !tournamentId || !memberNames || !Array.isArray(memberNames)) {
      console.log('❌ Données manquantes ou invalides:', { 
        name: !!name, 
        tournamentId: !!tournamentId, 
        memberNames: !!memberNames, 
        isArray: Array.isArray(memberNames),
        actualMemberNames: memberNames
      });
      return res.status(400).json({ message: 'Nom, tournoi et membres requis' });
    }

    if (memberNames.length === 0 || memberNames.length > 3) {
      console.log('❌ Nombre de membres invalide:', memberNames.length);
      return res.status(400).json({ message: 'Une équipe doit avoir entre 1 et 3 membres' });
    }

    console.log('✅ Création de l\'équipe...');
    const team = await TournamentService.addTeam(
      tournamentId,
      name,
      memberNames,
      groupNumber
    );

    // Récupérer l'équipe avec ses membres
    const members = await TeamMember.find({ teamId: team._id });
    
    console.log('✅ Équipe créée:', team._id);
    return res.status(201).json({
      ...team.toObject(),
      members
    });
  } catch (error) {
    console.error('❌ Erreur création équipe:', error);
    return res.status(500).json({ message: 'Erreur lors de la création de l\'équipe' });
  }
} 