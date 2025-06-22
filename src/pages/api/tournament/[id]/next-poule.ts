import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectDB from '../../../../lib/mongodb';
import Tournament from '../../../../models/Tournament';
import Team from '../../../../models/Team';
import Match, { MatchStatus, RoundType } from '../../../../models/Match';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await connectDB();

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de tournoi invalide' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournoi non trouvé' });
    }

    if (tournament.type !== 'GROUP') {
      return res.status(400).json({ message: 'Cette action est uniquement disponible pour les tournois en mode groupe' });
    }

    // Vérifier l'état du tournoi
    if (tournament.status !== 'ONGOING') {
      return res.status(400).json({ message: 'Le tournoi doit être en cours pour lancer une nouvelle poule' });
    }

    // Récupérer tous les matchs du tournoi
    const matches = await Match.find({ tournamentId: id })
      .populate('team1Id team2Id', 'name')
      .sort({ round: 1, groupNumber: 1 });

    if (matches.length === 0) {
      return res.status(400).json({ message: 'Aucun match trouvé pour ce tournoi' });
    }

    // Déterminer le round/poule actuel
    const currentRound = Math.max(...matches.map(m => m.round));
    const currentRoundMatches = matches.filter(m => m.round === currentRound);

    // Vérifier si tous les matchs du round actuel sont terminés
    const pendingMatches = currentRoundMatches.filter(m => m.status === MatchStatus.PENDING || m.status === MatchStatus.ONGOING);
    if (pendingMatches.length > 0) {
      return res.status(400).json({ 
        message: `Tous les matchs de la poule actuelle doivent être terminés avant de lancer la poule suivante. ${pendingMatches.length} match(s) en attente.`
      });
    }

    // Récupérer les équipes et calculer les classements
    const teams = await Team.find({ tournamentId: id });
    if (teams.length === 0) {
      return res.status(400).json({ message: 'Aucune équipe trouvée pour ce tournoi' });
    }

    // Calculer les stats des équipes pour le round actuel
    const teamStats = teams.map(team => {
      const teamMatches = currentRoundMatches.filter(
        m => m.team1Id._id.toString() === team._id.toString() || 
             m.team2Id._id.toString() === team._id.toString()
      );

      let wins = 0, losses = 0, draws = 0, points = 0, scoreDiff = 0;

      teamMatches.forEach(match => {
        if (match.status === MatchStatus.COMPLETED) {
          const isTeam1 = match.team1Id._id.toString() === team._id.toString();
          const teamScore = isTeam1 ? match.team1Score : match.team2Score;
          const opponentScore = isTeam1 ? match.team2Score : match.team1Score;

          if (teamScore! > opponentScore!) {
            wins++;
            points += 3;
          } else if (teamScore! < opponentScore!) {
            losses++;
          } else {
            draws++;
            points += 1;
          }

          scoreDiff += (teamScore! - opponentScore!);
        }
      });

      return {
        team,
        stats: { wins, losses, draws, points, scoreDiff, gamesPlayed: teamMatches.length }
      };
    });

    // Trier les équipes par points, puis par différence de buts
    const sortedTeams = teamStats.sort((a, b) => {
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      if (b.stats.scoreDiff !== a.stats.scoreDiff) return b.stats.scoreDiff - a.stats.scoreDiff;
      return b.stats.wins - a.stats.wins;
    });

    // Déterminer combien d'équipes se qualifient par groupe
    const qualifiersPerGroup = tournament.qualifiersPerGroup || 2;
    const groupSize = tournament.groupSize || 4;
    const currentGroupsCount = Math.max(...currentRoundMatches.map(m => m.groupNumber || 1));

    // Récupérer les équipes qualifiées de chaque groupe
    const qualifiedTeams: typeof teams = [];
    
    for (let groupNum = 1; groupNum <= currentGroupsCount; groupNum++) {
      const groupMatches = currentRoundMatches.filter(m => m.groupNumber === groupNum);
      const groupTeamIds = [...new Set([
        ...groupMatches.map(m => m.team1Id._id.toString()),
        ...groupMatches.map(m => m.team2Id._id.toString())
      ])];

      const groupTeamStats = sortedTeams.filter(ts => 
        groupTeamIds.includes(ts.team._id.toString())
      );

      // Prendre les X premiers qualifiés de ce groupe
      const qualified = groupTeamStats.slice(0, qualifiersPerGroup);
      qualifiedTeams.push(...qualified.map(ts => ts.team));
    }

    if (qualifiedTeams.length < 4) {
      return res.status(400).json({ 
        message: 'Pas assez d\'équipes qualifiées pour former la poule suivante' 
      });
    }

    // Créer la nouvelle poule avec les équipes qualifiées
    const nextRound = currentRound + 1;
    const newMatches = [];

    // Organiser les équipes qualifiées en nouveaux groupes
    const newGroupsCount = Math.ceil(qualifiedTeams.length / groupSize);
    
    for (let groupNum = 1; groupNum <= newGroupsCount; groupNum++) {
      const startIndex = (groupNum - 1) * groupSize;
      const groupTeams = qualifiedTeams.slice(startIndex, startIndex + groupSize);

      if (groupTeams.length < 3) {
        // Si moins de 3 équipes, on passe au mode éliminatoire ou on termine
        break;
      }

      // Créer tous les matchs possibles dans ce groupe (round-robin)
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const match = new Match({
            tournamentId: id,
            round: nextRound,
            roundType: RoundType.GROUP,
            groupNumber: groupNum,
            team1Id: groupTeams[i]._id,
            team2Id: groupTeams[j]._id,
            status: MatchStatus.PENDING,
            isTimedMatch: tournament.hasTimedMatches || false,
            timeLimit: tournament.matchTimeLimit || 45
          });

          newMatches.push(match);
        }
      }
    }

    if (newMatches.length === 0) {
      return res.status(400).json({ 
        message: 'Impossible de créer de nouveaux matchs avec les équipes qualifiées' 
      });
    }

    // Sauvegarder les nouveaux matchs
    await Match.insertMany(newMatches);

    console.log(`✅ Poule ${nextRound} lancée avec ${newMatches.length} matchs créés`);

    res.status(200).json({
      message: `Poule ${nextRound} lancée avec succès`,
      data: {
        round: nextRound,
        matchesCreated: newMatches.length,
        qualifiedTeams: qualifiedTeams.length,
        groupsCount: newGroupsCount
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du lancement de la poule suivante:', error);
    res.status(500).json({ message: 'Erreur serveur lors du lancement de la poule suivante' });
  }
} 