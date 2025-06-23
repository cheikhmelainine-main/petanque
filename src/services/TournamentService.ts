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

  // Générer le match de qualification de groupe (3ème place) - MODIFIÉ POUR DOUBLE FINALE
  static async generateGroupQualificationMatch(tournamentId: string, groupNumber: number): Promise<void> {
    // Récupérer tous les matchs du groupe
    const groupMatches = await Match.find({
      tournamentId,
      groupNumber,
      roundType: RoundType.GROUP,
      status: MatchStatus.COMPLETED
    });

    if (groupMatches.length < 2) {
      throw new Error('Pas assez de matchs terminés pour générer les finales de groupe');
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

    if (sortedTeams.length >= 4) {
      // Groupe de 4 équipes
      const firstPlace = sortedTeams[0];  // 1er place
      const secondPlace = sortedTeams[1]; // 2e place
      const thirdPlace = sortedTeams[2];  // 3e place
      const fourthPlace = sortedTeams[3]; // 4e place

      // FINALE DES GAGNANTS : 1er vs 2e place
      const winnersFinal = new Match({
        tournamentId,
        round: 3,
        roundType: RoundType.GROUP_WINNERS_FINAL,
        groupNumber,
        team1Id: firstPlace.teamId,
        team2Id: secondPlace.teamId,
        isTimedMatch: false,
        metadata: {
          finalType: 'winners',
          groupNumber,
          description: 'Finale des gagnants de groupe'
        }
      });

      await winnersFinal.save();
      console.log(`🏆 Finale des gagnants créée : ${firstPlace.teamId} vs ${secondPlace.teamId} (Groupe ${groupNumber})`);

      // FINALE DES PERDANTS : 3e vs 4e place
      const losersFinal = new Match({
        tournamentId,
        round: 3,
        roundType: RoundType.GROUP_LOSERS_FINAL,
        groupNumber,
        team1Id: thirdPlace.teamId,
        team2Id: fourthPlace.teamId,
        isTimedMatch: false,
        metadata: {
          finalType: 'losers',
          groupNumber,
          description: 'Finale des perdants de groupe'
        }
      });

      await losersFinal.save();
      console.log(`🥉 Finale des perdants créée : ${thirdPlace.teamId} vs ${fourthPlace.teamId} (Groupe ${groupNumber})`);

      // Marquer les équipes comme qualifiées selon leur position
      await Team.findByIdAndUpdate(firstPlace.teamId, { 
        isQualified: true,
        qualificationRank: 1,
        originalGroup: groupNumber,
        qualificationType: 'winners_final'
      });

      await Team.findByIdAndUpdate(secondPlace.teamId, { 
        isQualified: true,
        qualificationRank: 2,
        originalGroup: groupNumber,
        qualificationType: 'winners_final'
      });

      await Team.findByIdAndUpdate(thirdPlace.teamId, { 
        isQualified: true,
        qualificationRank: 3,
        originalGroup: groupNumber,
        qualificationType: 'losers_final'
      });

      await Team.findByIdAndUpdate(fourthPlace.teamId, { 
        isQualified: true,
        qualificationRank: 4,
        originalGroup: groupNumber,
        qualificationType: 'losers_final'
      });

    } else if (sortedTeams.length >= 3) {
      // Groupe de 3 équipes
      const firstPlace = sortedTeams[0];  // 1er place
      const secondPlace = sortedTeams[1]; // 2e place
      const thirdPlace = sortedTeams[2];  // 3e place

      // FINALE DES GAGNANTS : 1er vs 2e place
      const winnersFinal = new Match({
        tournamentId,
        round: 3,
        roundType: RoundType.GROUP_WINNERS_FINAL,
        groupNumber,
        team1Id: firstPlace.teamId,
        team2Id: secondPlace.teamId,
        isTimedMatch: false,
        metadata: {
          finalType: 'winners',
          groupNumber,
          description: 'Finale des gagnants de groupe'
        }
      });

      await winnersFinal.save();
      console.log(`🏆 Finale des gagnants créée : ${firstPlace.teamId} vs ${secondPlace.teamId} (Groupe ${groupNumber})`);

      // Pour un groupe de 3, la 3e place est automatiquement qualifiée pour la finale des perdants
      await Team.findByIdAndUpdate(firstPlace.teamId, { 
        isQualified: true,
        qualificationRank: 1,
        originalGroup: groupNumber,
        qualificationType: 'winners_final'
      });

      await Team.findByIdAndUpdate(secondPlace.teamId, { 
        isQualified: true,
        qualificationRank: 2,
        originalGroup: groupNumber,
        qualificationType: 'winners_final'
      });

      await Team.findByIdAndUpdate(thirdPlace.teamId, { 
        isQualified: true,
        qualificationRank: 3,
        originalGroup: groupNumber,
        qualificationType: 'losers_final'
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

    // Créer le bracket winners et losers (pour l'ancien système)
    // Cette méthode est conservée pour la compatibilité avec l'ancien système knockout
    await this.generateWinnersAndLosersBrackets(tournamentId, qualifiedTeams);
  }

  // NOUVELLE MÉTHODE : Gérer les qualifications post-poules avec tirage au sort
  static async generateQualificationPhase(tournamentId: string): Promise<{ qualifiedTeams: ITeam[], eliminationMatches: IMatch[] }> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Vérifier que toutes les poules sont terminées
    const groupsCount = tournament.groupsCount || 0;
    const allGroupsCompleted = await this.checkAllGroupsCompleted(tournamentId, groupsCount);
    
    if (!allGroupsCompleted) {
      throw new Error('Toutes les poules doivent être terminées avant de lancer les qualifications');
    }

    // Récupérer toutes les équipes qualifiées
    const qualifiedTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      isQualified: true
    });

    if (qualifiedTeams.length < 4) {
      throw new Error('Pas assez d\'équipes qualifiées pour commencer les phases éliminatoires');
    }

    console.log(`✅ ${qualifiedTeams.length} équipes qualifiées issues de ${groupsCount} groupes`);

    // Séparer les équipes par type de qualification
    const winnersFinalTeams = qualifiedTeams.filter(team => team.qualificationType === 'winners_final');
    const losersFinalTeams = qualifiedTeams.filter(team => team.qualificationType === 'losers_final');

    console.log(`🏆 Équipes finale gagnants : ${winnersFinalTeams.length}`);
    console.log(`🥉 Équipes finale perdants : ${losersFinalTeams.length}`);

    // Créer les brackets séparés pour chaque type de finale
    const eliminationMatches: IMatch[] = [];

    // Bracket des gagnants de finale - COMPLÈTEMENT SÉPARÉ
    if (winnersFinalTeams.length >= 4) {
      const winnersBracket = await this.generateQualifiedTeamsBracket(tournamentId, winnersFinalTeams);
      eliminationMatches.push(...winnersBracket);
    }

    // Bracket des perdants de finale - COMPLÈTEMENT SÉPARÉ
    if (losersFinalTeams.length >= 4) {
      const losersBracket = await this.generateEliminatedTeamsBracket(tournamentId, losersFinalTeams);
      eliminationMatches.push(...losersBracket);
    }

    return {
      qualifiedTeams,
      eliminationMatches
    };
  }

  // Vérifier si tous les groupes sont terminés
  private static async checkAllGroupsCompleted(tournamentId: string, groupsCount: number): Promise<boolean> {
    for (let groupNumber = 1; groupNumber <= groupsCount; groupNumber++) {
      // Vérifier que tous les matchs de finale du groupe sont terminés
      const winnersFinalMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_WINNERS_FINAL,
        status: { $ne: MatchStatus.COMPLETED }
      });

      const losersFinalMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_LOSERS_FINAL,
        status: { $ne: MatchStatus.COMPLETED }
      });

      if (winnersFinalMatches.length > 0 || losersFinalMatches.length > 0) {
        return false;
      }

      // Vérifier aussi les matchs de qualification du groupe (ancien système)
      const qualificationMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_QUALIFICATION,
        status: { $ne: MatchStatus.COMPLETED }
      });

      if (qualificationMatches.length > 0) {
        return false;
      }

      // Vérifier aussi les matchs de groupe normaux
      const groupMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP,
        status: { $ne: MatchStatus.COMPLETED }
      });

      if (groupMatches.length > 0) {
        return false;
      }
    }
    
    return true;
  }

  // Générer le bracket des équipes qualifiées avec rounds adaptatifs
  private static async generateQualifiedTeamsBracket(tournamentId: string, qualifiedTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🏆 Génération du bracket des équipes qualifiées avec ${qualifiedTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(qualifiedTeams);
    
    // Déterminer les rounds nécessaires selon le nombre d'équipes
    const roundsInfo = this.calculateRoundsForTeams(qualifiedTeams.length);
    console.log(`📊 Rounds nécessaires pour ${qualifiedTeams.length} équipes qualifiées:`, roundsInfo);
    
    const matches: IMatch[] = [];
    let currentTeams = [...shuffledTeams];
    let currentRound = 1;

    // Générer tous les rounds nécessaires
    for (const roundInfo of roundsInfo) {
      console.log(`🎯 Génération du round ${currentRound}: ${roundInfo.name} avec ${currentTeams.length} équipes`);
      
      const roundMatches: IMatch[] = [];
      
      // Créer les matchs du round actuel
      for (let i = 0; i < currentTeams.length; i += 2) {
        if (i + 1 < currentTeams.length) {
          const match = new Match({
            tournamentId: new mongoose.Types.ObjectId(tournamentId),
            round: currentRound,
            roundType: RoundType.KNOCKOUT,
            team1Id: currentTeams[i]._id,
            team2Id: currentTeams[i + 1]._id,
            isTimedMatch: false,
            metadata: {
              eliminationRound: roundInfo.name,
              team1OriginalGroup: currentTeams[i].originalGroup,
              team2OriginalGroup: currentTeams[i + 1].originalGroup,
              bracketType: 'winners',
              bracketName: 'Qualifiés',
              roundNumber: currentRound,
              totalRounds: roundsInfo.length
            }
          });

          await match.save();
          roundMatches.push(match);
          console.log(`✅ Match qualifiés créé (Round ${currentRound}): ${currentTeams[i].name} vs ${currentTeams[i + 1].name}`);
        }
      }
      
      matches.push(...roundMatches);
      currentRound++;
      
      // Pour le prochain round, on aura la moitié d'équipes (les gagnants)
      currentTeams = currentTeams.slice(0, Math.floor(currentTeams.length / 2));
    }

    return matches;
  }

  // Générer le bracket des équipes éliminées avec rounds adaptatifs
  private static async generateEliminatedTeamsBracket(tournamentId: string, eliminatedTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🥉 Génération du bracket des équipes éliminées avec ${eliminatedTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(eliminatedTeams);
    
    // Déterminer les rounds nécessaires selon le nombre d'équipes
    const roundsInfo = this.calculateRoundsForTeams(eliminatedTeams.length);
    console.log(`📊 Rounds nécessaires pour ${eliminatedTeams.length} équipes éliminées:`, roundsInfo);
    
    const matches: IMatch[] = [];
    let currentTeams = [...shuffledTeams];
    let currentRound = 1;

    // Générer tous les rounds nécessaires
    for (const roundInfo of roundsInfo) {
      console.log(`🎯 Génération du round ${currentRound}: ${roundInfo.name} avec ${currentTeams.length} équipes`);
      
      const roundMatches: IMatch[] = [];
      
      // Créer les matchs du round actuel
      for (let i = 0; i < currentTeams.length; i += 2) {
        if (i + 1 < currentTeams.length) {
          const match = new Match({
            tournamentId: new mongoose.Types.ObjectId(tournamentId),
            round: currentRound,
            roundType: RoundType.KNOCKOUT,
            team1Id: currentTeams[i]._id,
            team2Id: currentTeams[i + 1]._id,
            isTimedMatch: false,
            metadata: {
              eliminationRound: roundInfo.name,
              team1OriginalGroup: currentTeams[i].originalGroup,
              team2OriginalGroup: currentTeams[i + 1].originalGroup,
              bracketType: 'losers',
              bracketName: 'Éliminés',
              roundNumber: currentRound,
              totalRounds: roundsInfo.length
            }
          });

          await match.save();
          roundMatches.push(match);
          console.log(`✅ Match éliminés créé (Round ${currentRound}): ${currentTeams[i].name} vs ${currentTeams[i + 1].name}`);
        }
      }
      
      matches.push(...roundMatches);
      currentRound++;
      
      // Pour le prochain round, on aura la moitié d'équipes (les gagnants)
      currentTeams = currentTeams.slice(0, Math.floor(currentTeams.length / 2));
    }

    return matches;
  }

  // Calculer les rounds nécessaires selon le nombre d'équipes
  private static calculateRoundsForTeams(teamCount: number): Array<{ name: string; matchCount: number }> {
    const rounds: Array<{ name: string; matchCount: number }> = [];
    let remainingTeams = teamCount;
    let roundNumber = 1;

    while (remainingTeams > 1) {
      const matchCount = Math.floor(remainingTeams / 2);
      let roundName = '';

      // Déterminer le nom du round selon le nombre d'équipes initial
      if (teamCount >= 32) {
        if (roundNumber === 1) roundName = '32ème de finale';
        else if (roundNumber === 2) roundName = '16ème de finale';
        else if (roundNumber === 3) roundName = '8ème de finale';
        else if (roundNumber === 4) roundName = 'Quart de finale';
        else if (roundNumber === 5) roundName = 'Demi-finale';
        else roundName = 'Finale';
      } else if (teamCount >= 16) {
        if (roundNumber === 1) roundName = '16ème de finale';
        else if (roundNumber === 2) roundName = '8ème de finale';
        else if (roundNumber === 3) roundName = 'Quart de finale';
        else if (roundNumber === 4) roundName = 'Demi-finale';
        else roundName = 'Finale';
      } else if (teamCount >= 8) {
        if (roundNumber === 1) roundName = '8ème de finale';
        else if (roundNumber === 2) roundName = 'Quart de finale';
        else if (roundNumber === 3) roundName = 'Demi-finale';
        else roundName = 'Finale';
      } else if (teamCount >= 4) {
        if (roundNumber === 1) roundName = 'Quart de finale';
        else if (roundNumber === 2) roundName = 'Demi-finale';
        else roundName = 'Finale';
      } else {
        if (roundNumber === 1) roundName = 'Demi-finale';
        else roundName = 'Finale';
      }

      rounds.push({
        name: roundName,
        matchCount: matchCount
      });

      remainingTeams = matchCount;
      roundNumber++;
    }

    return rounds;
  }

  // Mélanger les équipes en évitant les confrontations du même groupe avant la finale
  private static shuffleTeamsWithGroupConstraint(
    teams: ITeam[]
  ): ITeam[] {
    // Utiliser un algorithme de seeding pour garantir la séparation des groupes
    return this.seedTeamsByGroups(teams);
  }

  // Algorithme de seeding pour séparer les équipes du même groupe
  private static seedTeamsByGroups(
    teams: ITeam[]
  ): ITeam[] {
    const totalTeams = teams.length;
    const bracketSize = this.getNextPowerOfTwo(totalTeams);
    
    // Créer un tableau pour le bracket
    const bracket = new Array(bracketSize).fill(null);
    
    // Séparer les équipes par groupe
    const teamsByGroup = new Map<number, ITeam[]>();
    teams.forEach(team => {
      const group = team.originalGroup || 1;
      if (!teamsByGroup.has(group)) {
        teamsByGroup.set(group, []);
      }
      teamsByGroup.get(group)!.push(team);
    });

    const groups = Array.from(teamsByGroup.keys()).sort();
    console.log(`🏆 Seeding pour ${totalTeams} équipes issues de ${groups.length} groupes`);

    // Algorithme de seeding : placer les équipes dans des positions opposées
    let position = 0;
    let groupIndex = 0;

    // Première phase : placer une équipe de chaque groupe dans la première moitié
    for (let i = 0; i < Math.floor(bracketSize / 2); i++) {
      if (position >= totalTeams) break;
      
      const group = groups[groupIndex % groups.length];
      const groupTeams = teamsByGroup.get(group)!;
      
      if (groupTeams.length > 0) {
        bracket[i] = groupTeams.shift()!;
        position++;
      }
      
      groupIndex++;
    }

    // Deuxième phase : placer les équipes restantes dans la deuxième moitié
    // en commençant par le milieu pour éviter les rencontres précoces
    const secondHalfStart = Math.floor(bracketSize / 2);
    groupIndex = Math.floor(groups.length / 2); // Commencer par le milieu des groupes

    for (let i = 0; i < Math.floor(bracketSize / 2); i++) {
      if (position >= totalTeams) break;
      
      const group = groups[groupIndex % groups.length];
      const groupTeams = teamsByGroup.get(group)!;
      
      if (groupTeams.length > 0) {
        bracket[secondHalfStart + i] = groupTeams.shift()!;
        position++;
      }
      
      groupIndex++;
    }

    // Troisième phase : remplir les places restantes
    for (let i = 0; i < bracket.length; i++) {
      if (bracket[i] === null && position < totalTeams) {
        // Trouver une équipe qui n'est pas encore placée
        for (const group of groups) {
          const groupTeams = teamsByGroup.get(group)!;
          if (groupTeams.length > 0) {
            bracket[i] = groupTeams.shift()!;
            position++;
            break;
          }
        }
      }
    }

    // Filtrer les valeurs null et retourner le bracket
    const result = bracket.filter(team => team !== null);
    
    // Vérifier que la contrainte est respectée
    if (this.validateSeeding(result)) {
      console.log('✅ Seeding réussi : équipes du même groupe séparées');
      return result;
    } else {
      console.warn('⚠️ Seeding échoué, utilisation du mélange aléatoire');
      return this.shuffleArray([...teams]);
    }
  }

  // Valider que le seeding respecte les contraintes
  private static validateSeeding(teams: ITeam[]): boolean {
    // Vérifier chaque paire d'équipes consécutives
    for (let i = 0; i < teams.length - 1; i += 2) {
      const team1 = teams[i];
      const team2 = teams[i + 1];
      
      if (team1.originalGroup === team2.originalGroup) {
        console.log(`❌ Conflit détecté : ${team1.name} (G${team1.originalGroup}) vs ${team2.name} (G${team2.originalGroup})`);
        return false;
      }
    }
    
    return true;
  }

  // Obtenir la prochaine puissance de 2
  private static getNextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  // Obtenir le nom du round d'élimination
  private static getEliminationRoundName(totalTeams: number, currentRound: number): string {
    const roundNames: Record<number, string> = {
      1: totalTeams >= 64 ? '64ème de finale' : 
         totalTeams >= 32 ? '32ème de finale' :
         totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Quart de finale',
      2: totalTeams >= 32 ? '32ème de finale' :
         totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Demi-finale',
      3: totalTeams >= 16 ? '16ème de finale' :
         totalTeams >= 8 ? '8ème de finale' : 'Finale',
      4: totalTeams >= 8 ? '8ème de finale' : 'Finale',
      5: 'Quart de finale',
      6: 'Demi-finale',
      7: 'Finale'
    };
    
    return roundNames[currentRound] || `Round ${currentRound}`;
  }

  // Calculer la taille du premier round
  private static getFirstRoundSize(totalTeams: number): number {
    return Math.floor(totalTeams / 2);
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
  static async getTournamentRanking(tournamentId: string): Promise<ITeam[] | Array<{
    groupNumber: number;
    teams: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      wins: number;
      losses: number;
      matchesPlayed: number;
      pointsFor: number;
      pointsAgainst: number;
      pointsDifference: number;
      qualificationStatus: string;
      qualificationRank: number | null;
      groupRank?: number;
      isQualified?: boolean;
      originalGroup?: number;
    }>;
    status: string;
  }>> {
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
  static async getGroupTournamentRanking(tournamentId: string): Promise<Array<{
    groupNumber: number;
    teams: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      wins: number;
      losses: number;
      matchesPlayed: number;
      pointsFor: number;
      pointsAgainst: number;
      pointsDifference: number;
      qualificationStatus: string;
      qualificationRank: number | null;
      groupRank?: number;
      isQualified?: boolean;
      originalGroup?: number;
    }>;
    status: string;
  }>> {
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
      const teamsWithStats = groupTeams.map((team: any) => {
        const teamId = (team._id as mongoose.Types.ObjectId).toString();
        const teamMatches = groupMatches.filter((match: any) => 
          (match.team1Id as mongoose.Types.ObjectId).toString() === teamId || 
          (match.team2Id as mongoose.Types.ObjectId)?.toString() === teamId
        );

        const wins = teamMatches.filter((match: any) => 
          match.winnerTeamId && (match.winnerTeamId as mongoose.Types.ObjectId).toString() === teamId
        ).length;

        const losses = teamMatches.filter((match: any) => 
          match.winnerTeamId && (match.winnerTeamId as mongoose.Types.ObjectId).toString() !== teamId
        ).length;

        const matchesPlayed = teamMatches.length;

        // Calculer les points marqués et encaissés
        let pointsFor = 0;
        let pointsAgainst = 0;

        teamMatches.forEach((match: any) => {
          if ((match.team1Id as mongoose.Types.ObjectId).toString() === teamId) {
            pointsFor += (match.team1Score as number) || 0;
            pointsAgainst += (match.team2Score as number) || 0;
          } else {
            pointsFor += (match.team2Score as number) || 0;
            pointsAgainst += (match.team1Score as number) || 0;
          }
        });

        const pointsDifference = pointsFor - pointsAgainst;

        // Déterminer le statut de qualification
        let qualificationStatus = 'eliminated';
        let qualificationRank = null;

        if (team.isQualified) {
          qualificationStatus = 'qualified';
          qualificationRank = team.qualificationRank as number || 1;
        }

        return {
          _id: team._id as mongoose.Types.ObjectId,
          name: team.name as string,
          wins,
          losses,
          matchesPlayed,
          pointsFor,
          pointsAgainst,
          pointsDifference,
          qualificationStatus,
          qualificationRank,
          isQualified: team.isQualified as boolean,
          originalGroup: team.originalGroup as number,
          groupRank: 0 // Sera assigné plus tard
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
  private static getGroupStatus(teams: Array<{
    wins: number;
    losses: number;
    matchesPlayed: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDifference: number;
    qualificationStatus: string;
    qualificationRank: number | null;
    groupRank?: number;
    isQualified?: boolean;
  }>, matches: Record<string, unknown>[]): string {
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

  // Générer les brackets winners et losers (méthode restaurée)
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

    // Vérifier si on peut générer les finales de groupe
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
      const existingWinnersFinal = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_WINNERS_FINAL
      });

      const existingLosersFinal = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_LOSERS_FINAL
      });

      const existingQualificationMatches = await Match.find({
        tournamentId,
        groupNumber,
        roundType: RoundType.GROUP_QUALIFICATION
      });

      // Générer les finales si elles n'existent pas encore
      if (existingWinnersFinal.length === 0 && existingLosersFinal.length === 0 && existingQualificationMatches.length === 0) {
        await this.generateGroupQualificationMatch(tournamentId, groupNumber);
      }
    }
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

    // NOUVEAU : Générer automatiquement les matchs suivants pour l'élimination directe
    if (match.roundType === RoundType.KNOCKOUT) {
      const tournamentIdString = (tournament._id as mongoose.Types.ObjectId).toString();
      await this.generateNextEliminationRound(tournamentIdString, match);
    }

    return match;
  }

  // NOUVELLE MÉTHODE : Générer le prochain round d'élimination avec double finale
  private static async generateNextEliminationRound(tournamentId: string, completedMatch: IMatch): Promise<void> {
    const currentRound = completedMatch.round;
    const nextRound = currentRound + 1;
    const bracketType = (completedMatch.metadata as any)?.bracketType || 'general';
    const bracketName = (completedMatch.metadata as any)?.bracketName || '';
    
    // Vérifier si tous les matchs du round actuel du même bracket sont terminés
    const currentRoundMatches = await Match.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      round: currentRound,
      roundType: RoundType.KNOCKOUT,
      'metadata.bracketType': bracketType
    });

    const completedMatches = currentRoundMatches.filter(m => m.status === MatchStatus.COMPLETED);
    
    if (completedMatches.length < currentRoundMatches.length) {
      // Pas tous les matchs terminés, attendre
      return;
    }

    // VÉRIFIER SI LES MATCHS DU ROUND SUIVANT EXISTENT DÉJÀ
    const existingNextRoundMatches = await Match.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      round: nextRound,
      roundType: RoundType.KNOCKOUT,
      'metadata.bracketType': bracketType
    });

    if (existingNextRoundMatches.length > 0) {
      // Les matchs du round suivant existent déjà, ne pas les recréer
      console.log(`⚠️ Les matchs du round ${nextRound} pour le bracket ${bracketType} existent déjà, pas de duplication`);
      return;
    }

    // Récupérer les gagnants du round actuel
    const winners: mongoose.Types.ObjectId[] = [];
    completedMatches.forEach(match => {
      if (match.winnerTeamId) {
        winners.push(match.winnerTeamId);
      }
    });

    console.log(`🏆 Round ${currentRound} terminé pour le bracket ${bracketType} : ${winners.length} gagnants`);

    // Générer les matchs du round suivant selon le type de bracket
    if (winners.length >= 2) {
      if (bracketType === 'winners' || bracketName === 'Qualifiés') {
        // Bracket des qualifiés
        await this.generateQualifiedTeamsNextRound(tournamentId, winners, nextRound);
      } else if (bracketType === 'losers' || bracketName === 'Éliminés') {
        // Bracket des éliminés
        await this.generateEliminatedTeamsNextRound(tournamentId, winners, nextRound);
      } else {
        // Bracket général (ancien système)
        await this.generateWinnersBracket(tournamentId, winners, nextRound);
      }
    }
  }

  // Générer le prochain round pour le bracket des qualifiés
  private static async generateQualifiedTeamsNextRound(tournamentId: string, teams: mongoose.Types.ObjectId[], round: number): Promise<void> {
    if (teams.length < 2) return;

    const roundName = this.getQualifiedTeamsRoundName(teams.length, round);
    console.log(`🏆 Génération du bracket qualifiés : ${roundName} avec ${teams.length} équipes`);

    // Créer les matchs du bracket qualifiés
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round,
          roundType: RoundType.KNOCKOUT,
          team1Id: teams[i],
          team2Id: teams[i + 1],
          isTimedMatch: false,
          metadata: {
            eliminationRound: roundName,
            bracketType: 'winners',
            bracketName: 'Qualifiés',
            previousRound: round - 1
          }
        });

        await match.save();
        console.log(`✅ Match qualifiés créé : ${teams[i]} vs ${teams[i + 1]} (Round ${round})`);
      }
    }
  }

  // Générer le prochain round pour le bracket des éliminés
  private static async generateEliminatedTeamsNextRound(tournamentId: string, teams: mongoose.Types.ObjectId[], round: number): Promise<void> {
    if (teams.length < 2) return;

    const roundName = this.getEliminatedTeamsRoundName(teams.length, round);
    console.log(`🥉 Génération du bracket éliminés : ${roundName} avec ${teams.length} équipes`);

    // Créer les matchs du bracket éliminés
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round,
          roundType: RoundType.KNOCKOUT,
          team1Id: teams[i],
          team2Id: teams[i + 1],
          isTimedMatch: false,
          metadata: {
            eliminationRound: roundName,
            bracketType: 'losers',
            bracketName: 'Éliminés',
            previousRound: round - 1
          }
        });

        await match.save();
        console.log(`✅ Match éliminés créé : ${teams[i]} vs ${teams[i + 1]} (Round ${round})`);
      }
    }
  }

  // Obtenir le nom du round pour le bracket des qualifiés
  private static getQualifiedTeamsRoundName(totalTeams: number, currentRound: number): string {
    const roundNames: Record<number, string> = {
      1: 'Demi-finale des Qualifiés',
      2: 'Finale des Qualifiés',
      3: 'Finale des Qualifiés'
    };
    
    return roundNames[currentRound] || `Round ${currentRound} - Qualifiés`;
  }

  // Obtenir le nom du round pour le bracket des éliminés
  private static getEliminatedTeamsRoundName(totalTeams: number, currentRound: number): string {
    const roundNames: Record<number, string> = {
      1: 'Demi-finale des Éliminés',
      2: 'Finale des Éliminés',
      3: 'Finale des Éliminés'
    };
    
    return roundNames[currentRound] || `Round ${currentRound} - Éliminés`;
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

  // NOUVELLE MÉTHODE : Récupérer toutes les équipes qualifiées
  static async getQualifiedTeams(tournamentId: string): Promise<ITeam[]> {
    const qualifiedTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      isQualified: true
    }).sort({ qualificationRank: 1 });

    return qualifiedTeams;
  }

  // NOUVELLE MÉTHODE : Générer uniquement le bracket des gagnants
  static async generateWinnersBracketOnly(tournamentId: string, winnersTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🏆 Génération du bracket des gagnants avec ${winnersTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(winnersTeams);
    
    const eliminationMatches: IMatch[] = [];
    const currentRound = 1;

    // Créer les matchs du premier tour
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round: currentRound,
          roundType: RoundType.KNOCKOUT,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: false,
          metadata: {
            eliminationRound: this.getEliminationRoundName(shuffledTeams.length, currentRound),
            team1OriginalGroup: shuffledTeams[i].originalGroup,
            team2OriginalGroup: shuffledTeams[i + 1].originalGroup,
            bracketType: 'winners'
          }
        });

        await match.save();
        eliminationMatches.push(match);
        console.log(`✅ Match gagnants créé : ${shuffledTeams[i].name} vs ${shuffledTeams[i + 1].name}`);
      }
    }

    return eliminationMatches;
  }

  // NOUVELLE MÉTHODE : Générer uniquement le bracket des perdants
  static async generateLosersBracketOnly(tournamentId: string, losersTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🥉 Génération du bracket des perdants avec ${losersTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(losersTeams);
    
    const eliminationMatches: IMatch[] = [];
    const currentRound = 1;

    // Créer les matchs du premier tour
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round: currentRound,
          roundType: RoundType.KNOCKOUT,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: false,
          metadata: {
            eliminationRound: this.getEliminationRoundName(shuffledTeams.length, currentRound),
            team1OriginalGroup: shuffledTeams[i].originalGroup,
            team2OriginalGroup: shuffledTeams[i + 1].originalGroup,
            bracketType: 'losers'
          }
        });

        await match.save();
        eliminationMatches.push(match);
        console.log(`✅ Match perdants créé : ${shuffledTeams[i].name} vs ${shuffledTeams[i + 1].name}`);
      }
    }

    return eliminationMatches;
  }

  // NOUVELLE MÉTHODE : Générer la phase d'élimination avec deux brackets séparés
  static async generateKnockoutStage(tournamentId: string): Promise<{ winnersMatches: IMatch[], losersMatches: IMatch[] }> {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournoi non trouvé');
    }

    // Récupérer toutes les équipes du tournoi
    const allTeams = await Team.find({
      tournamentId: new mongoose.Types.ObjectId(tournamentId)
    });

    if (allTeams.length < 8) {
      throw new Error('Pas assez d\'équipes pour commencer les phases éliminatoires (minimum 8 équipes)');
    }

    // Séparer les équipes qualifiées et éliminées
    const qualifiedTeams = allTeams.filter(team => team.isQualified === true);
    const eliminatedTeams = allTeams.filter(team => team.isQualified === false);

    console.log(`🏆 Équipes qualifiées : ${qualifiedTeams.length}`);
    console.log(`🥉 Équipes éliminées : ${eliminatedTeams.length}`);

    const winnersMatches: IMatch[] = [];
    const losersMatches: IMatch[] = [];

    // Générer le bracket des équipes qualifiées (Demi-finale des qualifiés)
    if (qualifiedTeams.length >= 4) {
      const qualifiedBracket = await this.generateQualifiedTeamsBracket(tournamentId, qualifiedTeams);
      winnersMatches.push(...qualifiedBracket);
    }

    // Générer le bracket des équipes éliminées (Demi-finale des éliminés)
    if (eliminatedTeams.length >= 4) {
      const eliminatedBracket = await this.generateEliminatedTeamsBracket(tournamentId, eliminatedTeams);
      losersMatches.push(...eliminatedBracket);
    }

    return {
      winnersMatches,
      losersMatches
    };
  }

  // Générer le bracket des équipes qualifiées
  private static async generateQualifiedTeamsBracket(tournamentId: string, qualifiedTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🏆 Génération du bracket des équipes qualifiées avec ${qualifiedTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(qualifiedTeams);
    
    const matches: IMatch[] = [];
    const currentRound = 1;

    // Créer les matchs de demi-finale des qualifiés
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round: currentRound,
          roundType: RoundType.KNOCKOUT,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: false,
          metadata: {
            eliminationRound: 'Demi-finale des Qualifiés',
            team1OriginalGroup: shuffledTeams[i].originalGroup,
            team2OriginalGroup: shuffledTeams[i + 1].originalGroup,
            bracketType: 'winners',
            bracketName: 'Qualifiés'
          }
        });

        await match.save();
        matches.push(match);
        console.log(`✅ Match qualifiés créé : ${shuffledTeams[i].name} vs ${shuffledTeams[i + 1].name}`);
      }
    }

    return matches;
  }

  // Générer le bracket des équipes éliminées
  private static async generateEliminatedTeamsBracket(tournamentId: string, eliminatedTeams: ITeam[]): Promise<IMatch[]> {
    console.log(`🥉 Génération du bracket des équipes éliminées avec ${eliminatedTeams.length} équipes`);
    
    // Mélanger les équipes avec contrainte de groupes
    const shuffledTeams = this.shuffleTeamsWithGroupConstraint(eliminatedTeams);
    
    const matches: IMatch[] = [];
    const currentRound = 1;

    // Créer les matchs de demi-finale des éliminés
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round: currentRound,
          roundType: RoundType.KNOCKOUT,
          team1Id: shuffledTeams[i]._id,
          team2Id: shuffledTeams[i + 1]._id,
          isTimedMatch: false,
          metadata: {
            eliminationRound: 'Demi-finale des Éliminés',
            team1OriginalGroup: shuffledTeams[i].originalGroup,
            team2OriginalGroup: shuffledTeams[i + 1].originalGroup,
            bracketType: 'losers',
            bracketName: 'Éliminés'
          }
        });

        await match.save();
        matches.push(match);
        console.log(`✅ Match éliminés créé : ${shuffledTeams[i].name} vs ${shuffledTeams[i + 1].name}`);
      }
    }

    return matches;
  }

  // Générer le bracket des gagnants (méthode restaurée pour compatibilité)
  private static async generateWinnersBracket(tournamentId: string, teams: mongoose.Types.ObjectId[], round: number): Promise<void> {
    if (teams.length < 2) return;

    const roundName = this.getWinnersRoundName(teams.length, round);
    console.log(`🏆 Génération du bracket gagnants : ${roundName} avec ${teams.length} équipes`);

    // Créer les matchs du bracket gagnants
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = new Match({
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          round,
          roundType: RoundType.KNOCKOUT,
          team1Id: teams[i],
          team2Id: teams[i + 1],
          isTimedMatch: false,
          metadata: {
            eliminationRound: roundName,
            bracketType: 'winners',
            previousRound: round - 1
          }
        });

        await match.save();
        console.log(`✅ Match gagnants créé : ${teams[i]} vs ${teams[i + 1]} (Round ${round})`);
      }
    }
  }

  // Obtenir le nom du round pour le bracket gagnants (méthode restaurée)
  private static getWinnersRoundName(totalTeams: number, currentRound: number): string {
    const roundNames: Record<number, string> = {
      1: '8ème de finale',
      2: '4ème de finale', 
      3: 'Demi-finale',
      4: 'Finale Gagnants'
    };
    
    return roundNames[currentRound] || `Round ${currentRound} - Gagnants`;
  }
} 