import Tournament, { ITournament, TournamentType, TournamentStatus, TeamFormat } from '../models/Tournament';
import Team, { ITeam } from '../models/Team';
import TeamMember from '../models/TeamMember';
import Match, { IMatch, MatchStatus, RoundType } from '../models/Match';
import mongoose from 'mongoose';

export class TournamentService {
  
  // Créer un nouveau tournoi
  static async createTournament(data: {
    name: string;
    type: TournamentType;
    format: TeamFormat;
    rounds?: number;
    startDate: Date;
    createdById: string;
    groupSize?: number;
    hasTimedMatches?: boolean;
    matchTimeLimit?: number;
  }): Promise<ITournament> {
    const tournament = new Tournament({
      ...data,
      createdById: new mongoose.Types.ObjectId(data.createdById),
      hasTimedMatches: data.hasTimedMatches ?? (data.type === TournamentType.SWISS || data.type === TournamentType.MARATHON),
      matchTimeLimit: data.matchTimeLimit ?? 45,
      groupSize: data.groupSize ?? 4,
      qualifiersPerGroup: 2
    });
    
    return await tournament.save();
  }

  // Ajouter une équipe à un tournoi
  static async addTeam(tournamentId: string, teamName: string, memberNames: string[], groupNumber?: number): Promise<ITeam> {
    const team = new Team({
      name: teamName,
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      groupNumber
    });
    
    const savedTeam = await team.save();
    
    // Ajouter les membres de l'équipe
    const members = memberNames.map(name => ({
      name,
      teamId: savedTeam._id
    }));
    
    await TeamMember.insertMany(members);
    
    return savedTeam;
  }

  // Démarrer un tournoi
  static async startTournament(tournamentId: string): Promise<ITournament> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    tournament.status = TournamentStatus.ONGOING;
    await tournament.save();

    // Générer les matchs selon le type de tournoi
    await this.generateMatches(tournament);

    return tournament;
  }

  // Générer les matchs selon le type de tournoi
  private static async generateMatches(tournament: ITournament): Promise<void> {
    const teams = await Team.find({ tournamentId: tournament._id });
    
    switch (tournament.type) {
      case TournamentType.GROUP:
        await this.generateGroupMatches(tournament, teams);
        break;
      case TournamentType.SWISS:
        await this.generateSwissMatches(tournament, teams);
        break;
      case TournamentType.MARATHON:
        await this.generateMarathonMatches(tournament, teams);
        break;
    }
  }

  // Générer les matchs pour le système de groupes (NOUVELLE LOGIQUE)
  private static async generateGroupMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    const groupSize = tournament.groupSize || 4;
    const groups = this.createGroups(teams, groupSize);
    tournament.groupsCount = groups.length;
    await tournament.save();
    
    // Ne générer que le PREMIER ROUND initialement
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const groupTeams = groups[groupIndex];
      const groupNumber = groupIndex + 1;
      
      // Assigner le numéro de groupe aux équipes
      await Team.updateMany(
        { _id: { $in: groupTeams.map(t => t._id) } },
        { groupNumber }
      );
      
      // Ne créer que le premier round
      await this.generateGroupFirstRound(tournament._id, groupTeams, groupNumber);
    }
  }

  // Générer SEULEMENT le premier round de groupe
  private static async generateGroupFirstRound(tournamentId: mongoose.Types.ObjectId | unknown, teams: ITeam[], groupNumber: number): Promise<void> {
    const shuffledTeams = this.shuffleArray([...teams]);
    const tournamentObjectId = tournamentId as mongoose.Types.ObjectId;
    
    if (teams.length === 4) {
      // Groupe de 4 : 2 matchs en parallèle pour le round 1
      const match1 = new Match({
        tournamentId: tournamentObjectId,
        round: 1,
        roundType: RoundType.GROUP,
        groupNumber,
        team1Id: shuffledTeams[0]._id,
        team2Id: shuffledTeams[1]._id,
        isTimedMatch: false // Pas de limite de temps pour les groupes
      });
      
      const match2 = new Match({
        tournamentId: tournamentObjectId,
        round: 1,
        roundType: RoundType.GROUP,
        groupNumber,
        team1Id: shuffledTeams[2]._id,
        team2Id: shuffledTeams[3]._id,
        isTimedMatch: false
      });
      
      await match1.save();
      await match2.save();
      
    } else if (teams.length === 3) {
      // Groupe de 3 : un match pour le round 1
      const match1 = new Match({
        tournamentId: tournamentObjectId,
        round: 1,
        roundType: RoundType.GROUP,
        groupNumber,
        team1Id: shuffledTeams[0]._id,
        team2Id: shuffledTeams[1]._id,
        isTimedMatch: false
      });
      
      await match1.save();
      // shuffledTeams[2] gets a bye to round 2
    }
  }

  // Méthode pour démarrer le round suivant d'un groupe spécifique
  static async startNextGroupRound(tournamentId: string, groupNumber: number): Promise<void> {
    // Vérifier le statut actuel du groupe
    const currentRoundMatches = await Match.find({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP
    }).sort({ round: -1 });

    if (currentRoundMatches.length === 0) {
      throw new Error('Aucun match trouvé pour ce groupe');
    }

    const currentRound = currentRoundMatches[0].round;
    const currentRoundMatchesFiltered = currentRoundMatches.filter(m => m.round === currentRound);
    
    // Vérifier que tous les matchs du round actuel sont terminés
    const allCompleted = currentRoundMatchesFiltered.every(m => m.status === MatchStatus.COMPLETED);
    if (!allCompleted) {
      throw new Error(`Tous les matchs du round ${currentRound} doivent être terminés avant de passer au suivant`);
    }

    // Générer le round suivant selon la logique
    if (currentRound === 1) {
      await this.generateGroupSecondRound(tournamentId, groupNumber);
    } else if (currentRound === 2) {
      await this.generateGroupQualificationMatch(tournamentId, groupNumber);
    } else {
      throw new Error('Ce groupe a déjà terminé tous ses rounds');
    }
  }

  // Méthode pour démarrer le round suivant pour TOUS les groupes
  static async startNextRoundAllGroups(tournamentId: string): Promise<void> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    const groupsCount = tournament.groupsCount || 0;
    
    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      try {
        await this.startNextGroupRound(tournamentId, groupNumber);
      } catch (error) {
        // Continuer avec les autres groupes même si un groupe a une erreur
        console.log(`Groupe ${groupNumber}:`, error instanceof Error ? error.message : 'Erreur inconnue');
      }
    }
  }

  // Vérifier si tous les groupes peuvent passer au round suivant
  static async canStartNextRound(tournamentId: string): Promise<{ canStart: boolean, currentRound: number, completedGroups: number, totalGroups: number }> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    const groupsCount = tournament.groupsCount || 0;
    let completedGroups = 0;
    let currentRound = 1;

    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      const groupMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP
      }).sort({ round: -1 });

      if (groupMatches.length > 0) {
        const latestRound = groupMatches[0].round;
        currentRound = Math.max(currentRound, latestRound);
        
        const latestRoundMatches = groupMatches.filter(m => m.round === latestRound);
        const allCompleted = latestRoundMatches.every(m => m.status === MatchStatus.COMPLETED);
        
        if (allCompleted) {
          completedGroups++;
        }
      }
    }

    return {
      canStart: completedGroups === groupsCount,
      currentRound,
      completedGroups,
      totalGroups: groupsCount
    };
  }

  // Générer le deuxième tour de groupe après les résultats du premier
  static async generateGroupSecondRound(tournamentId: string, groupNumber: number): Promise<void> {
    const firstRoundMatches = await Match.find({
      tournamentId,
      groupNumber,
      round: 1,
      status: MatchStatus.COMPLETED
    }).populate(['team1Id', 'team2Id']);

    if (firstRoundMatches.length === 0) {
      throw new Error('Tous les matchs du premier tour doivent être terminés');
    }

    const winners: mongoose.Types.ObjectId[] = [];
    const losers: mongoose.Types.ObjectId[] = [];

    firstRoundMatches.forEach(match => {
      if (match.winnerTeamId) {
        winners.push(match.winnerTeamId);
        // L'autre équipe est le perdant
        const loserTeamId = match.winnerTeamId.equals(match.team1Id._id) ? match.team2Id._id : match.team1Id._id;
        losers.push(loserTeamId);
      }
    });

    // Gagnant vs Gagnant
    if (winners.length >= 2) {
      const winnersMatch = new Match({
        tournamentId,
        round: 2,
        roundType: RoundType.GROUP,
        groupNumber,
        team1Id: winners[0],
        team2Id: winners[1],
        isTimedMatch: false
      });
      await winnersMatch.save();
    }

    // Perdant vs Perdant
    if (losers.length >= 2) {
      const losersMatch = new Match({
        tournamentId,
        round: 2,
        roundType: RoundType.GROUP,
        groupNumber,
        team1Id: losers[0],
        team2Id: losers[1],
        isTimedMatch: false
      });
      await losersMatch.save();
    }
  }

  // Générer le match de qualification de groupe (3ème place)
  static async generateGroupQualificationMatch(tournamentId: string, groupNumber: number): Promise<void> {
    // Récupérer tous les matchs du groupe
    const groupMatches = await Match.find({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP,
      status: MatchStatus.COMPLETED
    });

    if (groupMatches.length < 2) {
      throw new Error('Pas assez de matchs terminés pour générer le match de qualification');
    }

    // Identifier les équipes et leurs résultats
    const teamResults = new Map<string, { wins: number, teamId: mongoose.Types.ObjectId }>();

    groupMatches.forEach(match => {
      const team1Id = match.team1Id.toString();
      const team2Id = match.team2Id.toString();

      if (!teamResults.has(team1Id)) {
        teamResults.set(team1Id, { wins: 0, teamId: match.team1Id });
      }
      if (!teamResults.has(team2Id)) {
        teamResults.set(team2Id, { wins: 0, teamId: match.team2Id });
      }

      if (match.winnerTeamId) {
        const winnerId = match.winnerTeamId.toString();
        const winnerResult = teamResults.get(winnerId);
        if (winnerResult) {
          winnerResult.wins++;
        }
      }
    });

    // Trier les équipes par nombre de victoires
    const sortedTeams = Array.from(teamResults.values()).sort((a, b) => b.wins - a.wins);

    if (sortedTeams.length >= 3) {
      // Le gagnant avec le plus de victoires se qualifie directement
      const firstPlace = sortedTeams[0];
      const secondPlace = sortedTeams[1];
      const thirdPlace = sortedTeams[2];

      // Match de qualification entre 2e et 3e place pour la 2e qualification
      const qualificationMatch = new Match({
        tournamentId,
        round: 3,
        roundType: RoundType.GROUP_QUALIFICATION,
        groupNumber,
        team1Id: secondPlace.teamId,
        team2Id: thirdPlace.teamId,
        isTimedMatch: false
      });

      await qualificationMatch.save();

      // Marquer la première équipe comme qualifiée directement
      await Team.findByIdAndUpdate(firstPlace.teamId, { 
        isQualified: true,
        qualificationRank: 1
      });
    }
  }

  // Générer les matchs knockout après la phase de groupes
  static async generateKnockoutFromGroups(tournamentId: string): Promise<void> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Récupérer toutes les équipes qualifiées
    const qualifiedTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      isQualified: true
    }).sort({ qualificationRank: 1 });

    if (qualifiedTeams.length < 4) {
      throw new Error('Pas assez d\'équipes qualifiées pour commencer les phases éliminatoires');
    }

    // Créer le bracket winners et losers
    await this.generateWinnersAndLosersBrackets(tournamentId, qualifiedTeams);
  }

  // Générer les brackets winners et losers
  private static async generateWinnersAndLosersBrackets(tournamentId: string, teams: ITeam[]): Promise<void> {
    // Créer les matchs du premier tour du winners bracket
    const shuffledTeams = this.shuffleArray([...teams]);
    
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const winnersMatch = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round: 1,
          roundType: RoundType.WINNERS,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: false
        });
        
        await winnersMatch.save();
      }
    }
  }

  // Démarrer le timer d'un match (amélioré)
  static async startMatchTimer(matchId: string): Promise<IMatch> {
    const match = await Match.findById(matchId).populate('tournamentId');
    if (!match) {
      throw new Error('Match non trouvé');
    }

    const tournament = match.tournamentId as ITournament;
    
    // Seuls les tournois Swiss et Marathon ont des timers
    if (tournament.type !== TournamentType.SWISS && tournament.type !== TournamentType.MARATHON) {
      throw new Error('Ce type de tournoi ne supporte pas les timers');
    }

    match.status = MatchStatus.ONGOING;
    match.timerStartedAt = new Date();
    match.startedAt = new Date();
    match.isTimedMatch = true;
    match.timeLimit = tournament.matchTimeLimit || 45;
    
    return await match.save();
  }

  // Mettre à jour le score d'un match avec gestion du temps (LOGIQUE MISE À JOUR)
  static async updateMatchScore(matchId: string, team1Score: number, team2Score: number, finishedBeforeTimeLimit?: boolean): Promise<IMatch> {
    const match = await Match.findById(matchId).populate('tournamentId');
    if (!match) {
      throw new Error('Match non trouvé');
    }

    const tournament = match.tournamentId as ITournament;
    
    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.finishedBeforeTimeLimit = finishedBeforeTimeLimit ?? false;
    match.status = MatchStatus.COMPLETED;
    match.endedAt = new Date();

    // Déterminer le gagnant
    let winnerTeamId: mongoose.Types.ObjectId | undefined;
    let team1TournamentPoints = 0;
    let team2TournamentPoints = 0;

    if (tournament.type === TournamentType.GROUP) {
      // Pour les groupes : pas de matchs nuls, pas de système de points
      if (team1Score > team2Score) {
        winnerTeamId = match.team1Id;
      } else if (team2Score > team1Score) {
        winnerTeamId = match.team2Id;
      } else {
        // En cas d'égalité dans un groupe, on peut forcer une victoire à l'équipe 1 ou demander un tie-break
        // Pour l'instant, on donne la victoire à l'équipe 1
        winnerTeamId = match.team1Id;
      }
    } else {
      // Pour Swiss et Marathon : nouveau système de points
      if (team1Score === 13 || team2Score === 13) {
        // Victoire avec 13 points = 3 points
        if (team1Score === 13) {
          winnerTeamId = match.team1Id;
          team1TournamentPoints = 3;
          team2TournamentPoints = 0;
        } else {
          winnerTeamId = match.team2Id;
          team1TournamentPoints = 0;
          team2TournamentPoints = 3;
        }
      } else {
        // Match fini dans les temps sans atteindre 13
        if (team1Score === team2Score) {
          // Match nul dans le temps = 1 point chacun
          team1TournamentPoints = 1;
          team2TournamentPoints = 1;
        } else {
          // Victoire dans le temps = 2 points
          if (team1Score > team2Score) {
            winnerTeamId = match.team1Id;
            team1TournamentPoints = 2;
            team2TournamentPoints = 0;
          } else {
            winnerTeamId = match.team2Id;
            team1TournamentPoints = 0;
            team2TournamentPoints = 2;
          }
        }
      }
    }

    match.winnerTeamId = winnerTeamId;
    match.team1TournamentPoints = team1TournamentPoints;
    match.team2TournamentPoints = team2TournamentPoints;

    await match.save();

    // Mettre à jour les statistiques des équipes
    await this.updateTeamStats(match);

    // Vérifier si on peut générer les matchs suivants pour les groupes
    if (tournament.type === TournamentType.GROUP && match.roundType === RoundType.GROUP) {
      const tournamentIdString = (tournament._id as mongoose.Types.ObjectId).toString();
      await this.checkAndGenerateNextGroupRound(tournamentIdString, match.groupNumber!);
    }

    return match;
  }

  // Vérifier et générer le prochain tour de groupe si nécessaire
  private static async checkAndGenerateNextGroupRound(tournamentId: string, groupNumber: number): Promise<void> {
    const completedRound1Matches = await Match.find({
      tournamentId,
      groupNumber,
      round: 1,
      roundType: RoundType.GROUP,
      status: MatchStatus.COMPLETED
    });

    const totalRound1Matches = await Match.find({
      tournamentId,
      groupNumber,
      round: 1,
      roundType: RoundType.GROUP
    });

    // Si tous les matchs du round 1 sont terminés, générer le round 2
    if (completedRound1Matches.length === totalRound1Matches.length && completedRound1Matches.length > 0) {
      const existingRound2Matches = await Match.find({
        tournamentId,
        groupNumber,
        round: 2,
        roundType: RoundType.GROUP
      });

      if (existingRound2Matches.length === 0) {
        await this.generateGroupSecondRound(tournamentId, groupNumber);
      }
    }

    // Vérifier si on peut générer le match de qualification
    const completedRound2Matches = await Match.find({
      tournamentId,
      groupNumber,
      round: 2,
      roundType: RoundType.GROUP,
      status: MatchStatus.COMPLETED
    });

    const totalRound2Matches = await Match.find({
      tournamentId,
      groupNumber,
      round: 2,
      roundType: RoundType.GROUP
    });

    if (completedRound2Matches.length === totalRound2Matches.length && completedRound2Matches.length > 0) {
      const existingQualificationMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_QUALIFICATION
      });

      if (existingQualificationMatches.length === 0) {
        await this.generateGroupQualificationMatch(tournamentId, groupNumber);
      }
    }
  }

  // Générer les matchs pour le système suisse
  private static async generateSwissMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    // Première ronde : appariements aléatoires
    const shuffledTeams = this.shuffleArray([...teams]);
    const tournamentId = tournament._id as mongoose.Types.ObjectId;
    
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId,
          round: 1,
          roundType: RoundType.SWISS,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: tournament.hasTimedMatches,
          timeLimit: tournament.matchTimeLimit
        });
        await match.save();
      }
    }
  }

  // Générer les matchs pour le système marathon
  private static async generateMarathonMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    // Tous contre tous
    const tournamentId = tournament._id as mongoose.Types.ObjectId;
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const match = new Match({
          tournamentId,
          round: 1,
          roundType: RoundType.SWISS, // Marathon utilise le même type
          team1Id: teams[i]._id,
          team2Id: teams[j]._id,
          isTimedMatch: tournament.hasTimedMatches,
          timeLimit: tournament.matchTimeLimit
        });
        await match.save();
      }
    }
  }

  // Mettre à jour les statistiques des équipes
  private static async updateTeamStats(match: IMatch): Promise<void> {
    const team1Update: { $inc?: Record<string, number> } = {};
    const team2Update: { $inc?: Record<string, number> } = {};

    // Ajouter les points de tournoi
    if (match.team1TournamentPoints) {
      team1Update.$inc = { tournamentPoints: match.team1TournamentPoints };
    }
    if (match.team2TournamentPoints) {
      team2Update.$inc = { tournamentPoints: match.team2TournamentPoints };
    }

    // Mettre à jour les victoires/défaites
    if (match.winnerTeamId) {
      if (match.winnerTeamId.equals(match.team1Id)) {
        team1Update.$inc = { ...team1Update.$inc, wins: 1 };
        team2Update.$inc = { ...team2Update.$inc, losses: 1 };
      } else {
        team2Update.$inc = { ...team2Update.$inc, wins: 1 };
        team1Update.$inc = { ...team1Update.$inc, losses: 1 };
      }
    } else {
      // Match nul
      team1Update.$inc = { ...team1Update.$inc, draws: 1 };
      team2Update.$inc = { ...team2Update.$inc, draws: 1 };
    }

    if (Object.keys(team1Update).length > 0) {
      await Team.findByIdAndUpdate(match.team1Id, team1Update);
    }
    if (Object.keys(team2Update).length > 0) {
      await Team.findByIdAndUpdate(match.team2Id, team2Update);
    }
  }

  // Obtenir le classement d'un tournoi
  static async getTournamentRanking(tournamentId: string): Promise<ITeam[]> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Pour les tournois par groupes, utiliser un classement spécifique
    if (tournament.type === TournamentType.GROUP) {
      return await this.getGroupTournamentRanking(tournamentId);
    }

    // Pour Swiss et Marathon, utiliser le classement par points
    return await Team.find({ tournamentId })
      .sort({ tournamentPoints: -1, wins: -1, name: 1 })
      .populate('members');
  }

  // Classement spécifique pour les tournois par groupes
  static async getGroupTournamentRanking(tournamentId: string): Promise<any[]> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    const groupsCount = tournament.groupsCount || 0;
    const groupsRanking = [];

    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      // Récupérer les équipes du groupe
      const groupTeams = await Team.find({ tournamentId, groupNumber }).lean();
      
      // Récupérer tous les matchs du groupe
      const groupMatches = await Match.find({ 
        tournamentId, 
        groupNumber,
        status: MatchStatus.COMPLETED 
      }).lean();

      // Calculer les statistiques pour chaque équipe
      const teamsWithStats = groupTeams.map(team => {
        const teamMatches = groupMatches.filter(match => 
          match.team1Id.toString() === team._id.toString() || 
          match.team2Id?.toString() === team._id.toString()
        );

        const wins = teamMatches.filter(match => 
          match.winnerTeamId && match.winnerTeamId.toString() === team._id.toString()
        ).length;

        const losses = teamMatches.filter(match => 
          match.winnerTeamId && match.winnerTeamId.toString() !== team._id.toString()
        ).length;

        const matchesPlayed = teamMatches.length;

        // Calculer les points marqués et encaissés
        let pointsFor = 0;
        let pointsAgainst = 0;

        teamMatches.forEach(match => {
          if (match.team1Id.toString() === team._id.toString()) {
            pointsFor += match.team1Score || 0;
            pointsAgainst += match.team2Score || 0;
          } else {
            pointsFor += match.team2Score || 0;
            pointsAgainst += match.team1Score || 0;
          }
        });

        const pointsDifference = pointsFor - pointsAgainst;

        // Déterminer le statut de qualification
        let qualificationStatus = 'eliminated';
        let qualificationRank = null;

        if (team.isQualified) {
          qualificationStatus = 'qualified';
          qualificationRank = team.qualificationRank || 1;
        }

        return {
          ...team,
          wins,
          losses,
          matchesPlayed,
          pointsFor,
          pointsAgainst,
          pointsDifference,
          qualificationStatus,
          qualificationRank
        };
      });

      // Trier les équipes : d'abord par nombre de victoires, puis par différence de points
      const sortedTeams = teamsWithStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsDifference - a.pointsDifference;
      });

      // Assigner les rangs dans le groupe
      sortedTeams.forEach((team, index) => {
        team.groupRank = index + 1;
        // Les 2 premiers sont normalement qualifiés
        if (index < 2 && !team.isQualified) {
          team.qualificationStatus = 'should_qualify';
        }
      });

      groupsRanking.push({
        groupNumber,
        teams: sortedTeams,
        status: this.getGroupStatus(sortedTeams, groupMatches)
      });
    }

    return groupsRanking;
  }

  // Déterminer le statut d'un groupe
  private static getGroupStatus(teams: any[], matches: any[]) {
    const totalTeams = teams.length;
    const expectedMatches = totalTeams === 4 ? 4 : 2; // 4 matchs pour groupe de 4, 2 pour groupe de 3
    const completedMatches = matches.length;

    if (teams.every(team => team.qualificationStatus === 'qualified')) {
      return 'completed';
    } else if (completedMatches >= expectedMatches) {
      return 'ready_for_qualification';
    } else {
      return 'in_progress';
    }
  }

  // Créer des groupes d'équipes
  private static createGroups<T>(items: T[], groupSize: number): T[][] {
    const groups: T[][] = [];
    for (let i = 0; i < items.length; i += groupSize) {
      groups.push(items.slice(i, i + groupSize));
    }
    return groups;
  }

  // Mélanger un tableau
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
} 