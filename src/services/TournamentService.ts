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
  }): Promise<ITournament> {
    const tournament = new Tournament({
      ...data,
      createdById: new mongoose.Types.ObjectId(data.createdById)
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

  // Générer les matchs pour le système de groupes
  private static async generateGroupMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    const groupSize = tournament.format === TeamFormat.SINGLES ? 4 : 3;
    const groups = this.createGroups(teams, groupSize);
    
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const groupTeams = groups[groupIndex];
      const groupNumber = groupIndex + 1;
      
      // Assigner le numéro de groupe aux équipes
      await Team.updateMany(
        { _id: { $in: groupTeams.map(t => t._id) } },
        { groupNumber }
      );
      
      // Créer les matchs de groupe
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const match = new Match({
            tournamentId: tournament._id,
            round: 1,
            roundType: RoundType.GROUP,
            groupNumber,
            team1Id: groupTeams[i]._id,
            team2Id: groupTeams[j]._id
          });
          await match.save();
        }
      }
    }
  }

  // Générer les matchs pour le système suisse
  private static async generateSwissMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    const shuffledTeams = this.shuffleArray([...teams]);
    
    // Premier tour : appariement aléatoire
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId: tournament._id,
          round: 1,
          roundType: RoundType.KNOCKOUT,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id
        });
        await match.save();
      }
    }
  }

  // Générer les matchs pour le système marathon
  private static async generateMarathonMatches(tournament: ITournament, teams: ITeam[]): Promise<void> {
    // Identique au suisse mais complètement aléatoire
    await this.generateSwissMatches(tournament, teams);
  }

  // Mettre à jour le score d'un match avec gestion du temps
  static async updateMatchScore(matchId: string, team1Score: number, team2Score: number, finishedBeforeTimeLimit?: boolean): Promise<IMatch> {
    const match = await Match.findById(matchId).populate(['team1Id', 'team2Id']);
    if (!match) {
      throw new Error('Match non trouvé');
    }

    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.status = MatchStatus.COMPLETED;
    match.endedAt = new Date();

    // Déterminer le gagnant
    if (team1Score > team2Score) {
      match.winnerTeamId = match.team1Id;
    } else if (team2Score > team1Score) {
      match.winnerTeamId = match.team2Id;
    }

    await match.save();

    // Mettre à jour les points des équipes avec gestion du temps
    await this.updateTeamStats(match, finishedBeforeTimeLimit);

    return match;
  }

  // Générer le tour suivant pour un tournoi Swiss
  static async generateNextRound(tournamentId: string): Promise<IMatch[]> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Vérifier qu'on n'a pas dépassé le nombre de tours
    const currentRound = await Match.findOne({ tournamentId }).sort({ round: -1 });
    const nextRoundNumber = currentRound ? currentRound.round + 1 : 1;
    
    if (tournament.rounds && nextRoundNumber > tournament.rounds) {
      throw new Error('Tous les tours Swiss sont terminés');
    }

    // Obtenir le classement actuel
    const teams = await Team.find({ tournamentId })
      .sort({ points: -1, scoreDiff: -1 });

    const matches: IMatch[] = [];
    
    // Appariement 1er vs 2ème, 3ème vs 4ème, etc.
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = new Match({
          tournamentId,
          round: nextRoundNumber,
          roundType: RoundType.SWISS,
          team1Id: teams[i]._id,
          team2Id: teams[i + 1]._id
        });
        
        const savedMatch = await match.save();
        matches.push(savedMatch);
      }
    }

    return matches;
  }

  // Générer la phase d'élimination avec brackets des gagnants et perdants
  static async generateKnockoutStage(tournamentId: string): Promise<{ winnersMatches: IMatch[], losersMatches: IMatch[] }> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Obtenir le classement final Swiss
    const allTeams = await Team.find({ tournamentId })
      .sort({ points: -1, scoreDiff: -1 });

    // Top 16 pour le bracket des gagnants
    const winnersTeams = allTeams.slice(0, 16);
    // 16 suivants pour le bracket des perdants
    const losersTeams = allTeams.slice(16, 32);

    const winnersMatches: IMatch[] = [];
    const losersMatches: IMatch[] = [];
    const currentRound = await Match.findOne({ tournamentId }).sort({ round: -1 });
    const knockoutRound = currentRound ? currentRound.round + 1 : 6;

    // Créer les 8èmes de finale du bracket des gagnants
    for (let i = 0; i < winnersTeams.length; i += 2) {
      if (i + 1 < winnersTeams.length) {
        const match = new Match({
          tournamentId,
          round: knockoutRound,
          roundType: RoundType.WINNERS,
          team1Id: winnersTeams[i]._id,
          team2Id: winnersTeams[i + 1]._id
        });
        
        const savedMatch = await match.save();
        winnersMatches.push(savedMatch);
      }
    }

    // Créer les 8èmes de finale du bracket des perdants
    for (let i = 0; i < losersTeams.length; i += 2) {
      if (i + 1 < losersTeams.length) {
        const match = new Match({
          tournamentId,
          round: knockoutRound,
          roundType: RoundType.LOSERS,
          team1Id: losersTeams[i]._id,
          team2Id: losersTeams[i + 1]._id
        });
        
        const savedMatch = await match.save();
        losersMatches.push(savedMatch);
      }
    }

    return { winnersMatches, losersMatches };
  }

  // Générer le tour suivant du knockout
  static async generateNextKnockoutRound(tournamentId: string, roundType: RoundType): Promise<IMatch[]> {
    // Obtenir le tour précédent pour ce roundType spécifique
    const previousRound = await Match.findOne({ 
      tournamentId, 
      roundType 
    }).sort({ round: -1 });
    
    if (!previousRound) {
      throw new Error(`Aucun tour précédent trouvé pour le type ${roundType}`);
    }

    const currentRound = previousRound.round;
    const nextRound = currentRound + 1;

    // Obtenir tous les matchs du tour précédent pour ce roundType
    const previousMatches = await Match.find({ 
      tournamentId, 
      round: currentRound,
      roundType,
      status: MatchStatus.COMPLETED,
      winnerTeamId: { $exists: true }
    }).populate('winnerTeamId team1Id team2Id');

    if (previousMatches.length === 0) {
      throw new Error(`Aucun match complété trouvé pour le round ${currentRound} du type ${roundType}`);
    }

    // Obtenir les participants pour le tour suivant
    const participants: mongoose.Types.ObjectId[] = [];
    
    // Pour le bracket des gagnants, prendre les gagnants
    if (roundType === RoundType.WINNERS) {
      for (const match of previousMatches) {
        if (match.winnerTeamId) {
          participants.push(match.winnerTeamId);
        }
      }
    }
    
    // Pour le bracket des perdants, prendre les gagnants du bracket perdants + perdants du bracket gagnants
    else if (roundType === RoundType.LOSERS) {
      // Gagnants du bracket perdants
      for (const match of previousMatches) {
        if (match.winnerTeamId) {
          participants.push(match.winnerTeamId);
        }
      }
      
      // Ajouter les perdants du même round du bracket gagnants
      const winnersMatches = await Match.find({ 
        tournamentId, 
        round: currentRound,
        roundType: RoundType.WINNERS,
        status: MatchStatus.COMPLETED,
        winnerTeamId: { $exists: true }
      }).populate('winnerTeamId team1Id team2Id');

      for (const match of winnersMatches) {
        if (match.winnerTeamId) {
          // Ajouter le perdant
          const loserId = match.team1Id._id.equals(match.winnerTeamId) 
            ? match.team2Id._id 
            : match.team1Id._id;
          participants.push(loserId);
        }
      }
    }

    if (participants.length < 2) {
      throw new Error(`Pas assez de participants pour le tour suivant (${participants.length} équipes)`);
    }

    // Créer les matchs du tour suivant
    const matches: IMatch[] = [];
    
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        const match = new Match({
          tournamentId,
          round: nextRound,
          roundType,
          team1Id: participants[i],
          team2Id: participants[i + 1]
        });
        
        const savedMatch = await match.save();
        matches.push(savedMatch);
      }
    }

    return matches;
  }

  // Mettre à jour les statistiques des équipes
  private static async updateTeamStats(match: IMatch, finishedBeforeTimeLimit?: boolean): Promise<void> {
    const tournament = await Tournament.findById(match.tournamentId);
    if (!tournament) return;

    let pointsTeam1 = 0;
    let pointsTeam2 = 0;

    // Vérifier si c'est une phase Swiss ou knockout
    const isSwissPhase = match.roundType === RoundType.SWISS;

    if (isSwissPhase && (tournament.type === TournamentType.SWISS || tournament.type === TournamentType.MARATHON)) {
      // Système de points pour Swiss/Marathon avec gestion du temps
      if (match.team1Score! > match.team2Score!) {
        pointsTeam1 = finishedBeforeTimeLimit ? 3 : 2; // 3 pts avant temps, 2 pts après temps
      } else if (match.team2Score! > match.team1Score!) {
        pointsTeam2 = finishedBeforeTimeLimit ? 3 : 2; // 3 pts avant temps, 2 pts après temps
      } else {
        pointsTeam1 = 1; // 1 pt pour nul
        pointsTeam2 = 1; // 1 pt pour nul
      }

      // Mettre à jour les équipes avec points et différentiel
      await Team.findByIdAndUpdate(match.team1Id, {
        $inc: {
          points: pointsTeam1,
          scoreDiff: (match.team1Score || 0) - (match.team2Score || 0)
        }
      });

      await Team.findByIdAndUpdate(match.team2Id, {
        $inc: {
          points: pointsTeam2,
          scoreDiff: (match.team2Score || 0) - (match.team1Score || 0)
        }
      });
    } else if (isSwissPhase) {
      // Système de groupes : 2 points pour victoire, 1 pour nul
      if (match.team1Score! > match.team2Score!) {
        pointsTeam1 = 2;
      } else if (match.team2Score! > match.team1Score!) {
        pointsTeam2 = 2;
      } else {
        pointsTeam1 = 1;
        pointsTeam2 = 1;
      }

      // Mettre à jour les équipes avec points et différentiel
      await Team.findByIdAndUpdate(match.team1Id, {
        $inc: {
          points: pointsTeam1,
          scoreDiff: (match.team1Score || 0) - (match.team2Score || 0)
        }
      });

      await Team.findByIdAndUpdate(match.team2Id, {
        $inc: {
          points: pointsTeam2,
          scoreDiff: (match.team2Score || 0) - (match.team1Score || 0)
        }
      });
    }
    // Pour les phases knockout (WINNERS, LOSERS, KNOCKOUT), pas de mise à jour des points
    // Seul le gagnant est déterminé pour la progression
  }

  // Obtenir le classement d'un tournoi
  static async getTournamentRanking(tournamentId: string): Promise<ITeam[]> {
    return await Team.find({ tournamentId })
      .sort({ points: -1, scoreDiff: -1 })
      .populate('tournamentId');
  }

  // Utilitaires
  private static createGroups<T>(items: T[], groupSize: number): T[][] {
    const shuffled = this.shuffleArray([...items]);
    const groups: T[][] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      groups.push(shuffled.slice(i, i + groupSize));
    }
    
    return groups;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
} 