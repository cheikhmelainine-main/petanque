import Tournament, { ITournament } from '../models/Tournament';
import Team, { ITeam } from '../models/Team';
import Match, { IMatch } from '../models/Match';
import Group, { IGroup } from '../models/Group';
import { connectDB } from '../lib/mongodb';
import mongoose from 'mongoose';

export class TournamentService {
  
  /**
   * Créer un nouveau tournoi
   */
  static async createTournament(tournamentData: Partial<ITournament>): Promise<ITournament> {
    await connectDB();
    
    const tournament = new Tournament(tournamentData);
    await tournament.save();
    
    return tournament;
  }

  /**
   * Ajouter des équipes à un tournoi
   */
  static async addTeams(tournamentId: string, teamsData: Partial<ITeam>[]): Promise<ITeam[]> {
    await connectDB();
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    const teams = await Promise.all(
      teamsData.map(async (teamData) => {
        const team = new Team({
          ...teamData,
          tournament: tournamentId,
          type: tournament.settings.teamType
        });
        await team.save();
        return team;
      })
    );

    // Ajouter les équipes au tournoi
    tournament.teams.push(...teams.map(team => team._id));
    await tournament.save();

    return teams;
  }

  /**
   * Démarrer un tournoi
   */
  static async startTournament(tournamentId: string): Promise<ITournament> {
    await connectDB();
    
    const tournament = await Tournament.findById(tournamentId).populate('teams');
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    if (tournament.status !== 'created') {
      throw new Error('Le tournoi ne peut pas être démarré');
    }

    // Générer les matchs selon le type de tournoi
    switch (tournament.type) {
      case 'groups':
        await this.generateGroupMatches(tournament);
        break;
      case 'swiss':
        await this.generateSwissMatches(tournament);
        break;
      case 'marathon':
        await this.generateMarathonMatches(tournament);
        break;
    }

    tournament.status = 'in_progress';
    tournament.startedAt = new Date();
    tournament.currentRound = 1;
    
    await tournament.save();
    return tournament;
  }

  /**
   * Générer les groupes et matchs pour le système de groupes
   */
  private static async generateGroupMatches(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournament: tournament._id });
    const playersPerGroup = tournament.settings.playersPerGroup || 4;
    
    // Mélanger les équipes
    const shuffledTeams = this.shuffleArray([...teams]);
    
    // Créer les groupes
    const groups: IGroup[] = [];
    for (let i = 0; i < shuffledTeams.length; i += playersPerGroup) {
      const groupTeams = shuffledTeams.slice(i, i + playersPerGroup);
      
      const group = new Group({
        tournament: tournament._id,
        name: `Groupe ${Math.floor(i / playersPerGroup) + 1}`,
        teams: groupTeams.map(team => team._id),
        maxTeams: playersPerGroup,
        groupType: 'initial_random', // Peut être changé selon les besoins
        maxRounds: groupTeams.length === 4 ? 3 : 2 // 3 rounds pour 4 équipes, 2 pour 3 équipes
      });
      
      await group.save();
      groups.push(group);
      
      // Assigner les équipes au groupe
      await Team.updateMany(
        { _id: { $in: groupTeams.map(team => team._id) } },
        { groupId: group._id }
      );
    }

    // Sauvegarder les groupes dans le tournoi
    tournament.groups = groups.map(group => group._id);
    tournament.maxRounds = Math.max(...groups.map(g => g.maxRounds));
  }

  /**
   * Générer les matchs pour le système suisse
   */
  private static async generateSwissMatches(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournament: tournament._id });
    const rounds = tournament.settings.rounds || 5;
    
    tournament.maxRounds = rounds;
    
    // Premier tour: mélanger et associer
    const shuffledTeams = this.shuffleArray([...teams]);
    await this.createSwissRoundMatches(tournament, shuffledTeams, 1);
  }

  /**
   * Générer les matchs pour le système marathon
   */
  private static async generateMarathonMatches(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournament: tournament._id });
    const rounds = tournament.settings.rounds || 5;
    
    tournament.maxRounds = rounds;
    
    // Premier tour: complètement aléatoire
    const shuffledTeams = this.shuffleArray([...teams]);
    await this.createMarathonRoundMatches(tournament, shuffledTeams, 1);
  }

  /**
   * Créer les matchs d'un tour suisse
   */
  private static async createSwissRoundMatches(tournament: ITournament, teams: ITeam[], round: number): Promise<void> {
    const matches: IMatch[] = [];
    
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = new Match({
          tournament: tournament._id,
          team1: teams[i]._id,
          team2: teams[i + 1]._id,
          round,
          timeLimit: tournament.settings.timeLimit
        });
        
        await match.save();
        matches.push(match);
      }
    }
    
    // Ajouter les matchs au tournoi
    tournament.matches.push(...matches.map(match => match._id));
  }

  /**
   * Créer les matchs d'un tour marathon
   */
  private static async createMarathonRoundMatches(tournament: ITournament, teams: ITeam[], round: number): Promise<void> {
    // Même logique que le suisse mais complètement aléatoire
    const shuffledTeams = this.shuffleArray([...teams]);
    await this.createSwissRoundMatches(tournament, shuffledTeams, round);
  }

  /**
   * Mettre à jour le score d'un match
   */
  static async updateMatchScore(matchId: string, score1: number, score2: number): Promise<IMatch> {
    await connectDB();
    
    const match = await Match.findById(matchId).populate(['team1', 'team2', 'tournament']);
    if (!match) {
      throw new Error('Match non trouvé');
    }

    const tournament = match.tournament as ITournament;
    const winningScore = tournament.settings.winningScore;

    // Mettre à jour les scores
    match.score1 = score1;
    match.score2 = score2;
    
    // Déterminer le gagnant et les points
    if (score1 >= winningScore || score2 >= winningScore) {
      match.status = 'completed';
      match.endTime = new Date();
      
      if (score1 > score2) {
        match.winner = match.team1;
        // 3 points si victoire avant la fin du temps, 2 points si victoire après expiration du temps
        match.pointsTeam1 = match.timeExpired ? 2 : 3;
        match.pointsTeam2 = 0;
      } else if (score2 > score1) {
        match.winner = match.team2;
        match.pointsTeam1 = 0;
        // 3 points si victoire avant la fin du temps, 2 points si victoire après expiration du temps
        match.pointsTeam2 = match.timeExpired ? 2 : 3;
      }
    } else if (match.timeExpired) {
      // Match terminé par le temps
      match.status = 'completed';
      match.endTime = new Date();
      
      if (score1 > score2) {
        match.winner = match.team1;
        match.pointsTeam1 = 2; // Victoire après expiration du temps
        match.pointsTeam2 = 0;
      } else if (score2 > score1) {
        match.winner = match.team2;
        match.pointsTeam1 = 0;
        match.pointsTeam2 = 2; // Victoire après expiration du temps
      } else {
        match.isDraw = true;
        match.pointsTeam1 = 1; // Match nul
        match.pointsTeam2 = 1; // Match nul
      }
    }

    await match.save();
    
    // Mettre à jour les statistiques des équipes
    await this.updateTeamStats(match);
    
    return match;
  }

  /**
   * Mettre à jour les statistiques des équipes après un match
   */
  private static async updateTeamStats(match: IMatch): Promise<void> {
    const team1 = await Team.findById(match.team1);
    const team2 = await Team.findById(match.team2);
    
    if (!team1 || !team2) return;

    // Mettre à jour team1
    team1.stats.gamesPlayed += 1;
    team1.stats.points += match.pointsTeam1;
    team1.stats.scoreDifference += (match.score1 - match.score2);
    
    if (match.winner?.toString() === team1._id.toString()) {
      team1.stats.wins += 1;
    } else if (match.isDraw) {
      team1.stats.draws += 1;
    } else {
      team1.stats.losses += 1;
    }

    // Mettre à jour team2
    team2.stats.gamesPlayed += 1;
    team2.stats.points += match.pointsTeam2;
    team2.stats.scoreDifference += (match.score2 - match.score1);
    
    if (match.winner?.toString() === team2._id.toString()) {
      team2.stats.wins += 1;
    } else if (match.isDraw) {
      team2.stats.draws += 1;
    } else {
      team2.stats.losses += 1;
    }

    await Promise.all([team1.save(), team2.save()]);
  }

  /**
   * Passer au tour suivant
   */
  static async nextRound(tournamentId: string): Promise<ITournament> {
    await connectDB();
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    if (tournament.currentRound >= tournament.maxRounds) {
      throw new Error('Tous les tours ont été joués');
    }

    tournament.currentRound += 1;
    
    // Générer les matchs du tour suivant selon le type
    switch (tournament.type) {
      case 'swiss':
        await this.generateNextSwissRound(tournament);
        break;
      case 'marathon':
        await this.generateNextMarathonRound(tournament);
        break;
      case 'groups':
        // La logique des groupes sera gérée différemment
        break;
    }

    await tournament.save();
    return tournament;
  }

  /**
   * Générer le tour suivant pour le système suisse
   */
  private static async generateNextSwissRound(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournament: tournament._id })
      .sort({ 'stats.points': -1, 'stats.scoreDifference': -1 });
    
    await this.createSwissRoundMatches(tournament, teams, tournament.currentRound);
  }

  /**
   * Générer le tour suivant pour le système marathon
   */
  private static async generateNextMarathonRound(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournament: tournament._id });
    const shuffledTeams = this.shuffleArray([...teams]);
    
    await this.createMarathonRoundMatches(tournament, shuffledTeams, tournament.currentRound);
  }

  /**
   * Démarrer un match (déclencher le chrono)
   */
  static async startMatch(matchId: string): Promise<IMatch> {
    await connectDB();
    
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match non trouvé');
    }

    match.status = 'in_progress';
    match.startTime = new Date();
    
    // Programmer l'expiration du temps si limite définie
    if (match.timeLimit) {
      setTimeout(async () => {
        const updatedMatch = await Match.findById(matchId);
        if (updatedMatch && updatedMatch.status === 'in_progress') {
          updatedMatch.timeExpired = true;
          await updatedMatch.save();
        }
      }, match.timeLimit * 60 * 1000);
    }

    await match.save();
    return match;
  }

  /**
   * Utilitaire pour mélanger un tableau
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Obtenir le classement d'un tournoi
   */
  static async getTournamentRanking(tournamentId: string): Promise<ITeam[]> {
    await connectDB();
    
    return await Team.find({ tournament: tournamentId })
      .sort({ 
        'stats.points': -1, 
        'stats.scoreDifference': -1,
        'stats.wins': -1
      })
      .populate('players');
  }
} 