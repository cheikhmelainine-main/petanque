import mongoose, { Schema, Document } from 'mongoose';

export enum MatchStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}

export enum RoundType {
  SWISS = 'SWISS',
  WINNERS = 'WINNERS',
  LOSERS = 'LOSERS',
  GROUP = 'GROUP',
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
  winnerTeamId?: mongoose.Types.ObjectId;
  status: MatchStatus;
  startedAt?: Date;
  endedAt?: Date;
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Match || mongoose.model<IMatch>('Match', matchSchema); 