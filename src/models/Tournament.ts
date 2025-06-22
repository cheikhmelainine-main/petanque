import mongoose, { Schema, Document } from 'mongoose';

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

export interface ITournament extends Document {
  name: string;
  type: TournamentType;
  format: TeamFormat;
  status: TournamentStatus;
  rounds?: number;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  createdById: mongoose.Types.ObjectId;
}

const tournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TournamentType),
    required: true
  },
  format: {
    type: String,
    enum: Object.values(TeamFormat),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TournamentStatus),
    default: TournamentStatus.UPCOMING
  },
  rounds: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

export default mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema); 