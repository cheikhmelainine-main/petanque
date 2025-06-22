import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  tournamentId: mongoose.Types.ObjectId;
  groupNumber?: number;
  createdAt: Date;
  points: number;
  scoreDiff: number;
}

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  groupNumber: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  points: {
    type: Number,
    default: 0
  },
  scoreDiff: {
    type: Number,
    default: 0
  }
});

export default mongoose.models.Team || mongoose.model<ITeam>('Team', teamSchema); 