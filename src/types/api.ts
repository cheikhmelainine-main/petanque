// Types API centralisés pour le frontend
export enum TournamentType {
  GROUP = 'GROUP',
  SWISS = 'SWISS', 
  MARATHON = 'MARATHON'
}

export enum TournamentStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}

export enum TeamFormat {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES',
  TRIPLETS = 'TRIPLETS'
}

export enum MatchStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  TIMED_OUT = 'TIMED_OUT'
}

export enum RoundType {
  SWISS = 'SWISS',
  WINNERS = 'WINNERS',
  LOSERS = 'LOSERS',
  GROUP = 'GROUP',
  GROUP_QUALIFICATION = 'GROUP_QUALIFICATION',
  FINAL = 'FINAL',
  KNOCKOUT = 'KNOCKOUT'
}

export interface Player {
  name: string;
  email?: string;
  phone?: string;
}

export interface Tournament {
  _id: string;
  name: string;
  type: TournamentType;
  format: TeamFormat;
  status: TournamentStatus;
  rounds?: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  createdById: string;
  
  // Configuration pour les tournois GROUP
  groupSize?: number;
  groupsCount?: number;
  qualifiersPerGroup?: number;
  
  // Configuration pour les matchs temporisés
  hasTimedMatches?: boolean;
  matchTimeLimit?: number;
}

export interface Team {
  _id: string;
  name: string;
  players?: Player[];
  members?: Player[];
  type: 'individual' | 'doubles' | 'triples';
  tournament?: string;
  tournamentId?: string;
  points?: number;
  scoreDiff?: number;
  stats?: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    scoreDifference: number;
    gamesPlayed: number;
  };
  groupId?: string;
  groupNumber?: number;
  eliminated?: boolean;
  ranking?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  _id: string;
  tournamentId: string;
  round: number;
  roundType: RoundType;
  groupNumber?: number;
  team1Id: Team;
  team2Id?: Team;
  team1Score?: number;
  team2Score?: number;
  team1TournamentPoints?: number;
  team2TournamentPoints?: number;
  winnerTeamId?: string;
  status: MatchStatus;
  startedAt?: string;
  endedAt?: string;
  timeLimit?: number;
  timerStartedAt?: string;
  finishedBeforeTimeLimit?: boolean;
  isTimedMatch?: boolean;
  createdAt: string;
}

// Types pour les formulaires
export interface CreateTournamentData {
  name: string;
  type: TournamentType;
  format: TeamFormat;
  rounds?: number;
  startDate: string;
  createdById: string;
  groupSize?: number;
  hasTimedMatches?: boolean;
  matchTimeLimit?: number;
}

export interface CreateTeamData {
  name: string;
  tournamentId: string;
  memberNames: string[];
}

export interface UpdateMatchData {
  action: 'update_score' | 'start_timer' | 'end_timer';
  matchId: string;
  team1Score?: number;
  team2Score?: number;
  finishedBeforeTimeLimit?: boolean;
  timerStartedAt?: string;
}

// Types pour les responses API
export interface KnockoutResponse {
  winnersMatches: Match[];
  losersMatches: Match[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
} 