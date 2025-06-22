import mongoose, { Schema, Document } from 'mongoose';

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

export interface IMatch extends Document {
  tournamentId: mongoose.Types.ObjectId;
  round: number;
  roundType: RoundType;
  groupNumber?: number;
  team1Id: mongoose.Types.ObjectId;
  team2Id?: mongoose.Types.ObjectId;
  team1Score?: number;
  team2Score?: number;
  team1TournamentPoints?: number;  // Points de tournoi pour team1
  team2TournamentPoints?: number;  // Points de tournoi pour team2
  winnerTeamId?: mongoose.Types.ObjectId;
  status: MatchStatus;
  startedAt?: Date;
  endedAt?: Date;
  timeLimit?: number;  // Limite de temps en minutes (45 pour swiss/marathon)
  timerStartedAt?: Date;  // Quand le timer a été démarré
  finishedBeforeTimeLimit?: boolean;  // Si le match s'est fini avant la limite
  isTimedMatch?: boolean;  // Si c'est un match avec limite de temps
  metadata?: {
    eliminationRound?: string;  // Nom du round d'élimination (64e, 32e, etc.)
    team1OriginalGroup?: number;  // Groupe d'origine de l'équipe 1
    team2OriginalGroup?: number;  // Groupe d'origine de l'équipe 2
  };
  createdAt: Date;
}

const matchSchema = new Schema<IMatch>({
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  roundType: {
    type: String,
    enum: Object.values(RoundType),
    required: true
  },
  groupNumber: {
    type: Number
  },
  team1Id: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2Id: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  team1Score: {
    type: Number
  },
  team2Score: {
    type: Number
  },
  team1TournamentPoints: {
    type: Number,
    default: 0
  },
  team2TournamentPoints: {
    type: Number,
    default: 0
  },
  winnerTeamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  status: {
    type: String,
    enum: Object.values(MatchStatus),
    default: MatchStatus.PENDING
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  timeLimit: {
    type: Number,
    default: 45  // 45 minutes par défaut
  },
  timerStartedAt: {
    type: Date
  },
  finishedBeforeTimeLimit: {
    type: Boolean,
    default: false
  },
  isTimedMatch: {
    type: Boolean,
    default: false
  },
  metadata: {
    eliminationRound: {
      type: String
    },
    team1OriginalGroup: {
      type: Number
    },
    team2OriginalGroup: {
      type: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Match || mongoose.model<IMatch>('Match', matchSchema); 