import mongoose from 'mongoose';

export interface ITournament extends mongoose.Document {
  name: string;
  type: 'groups' | 'swiss' | 'marathon';
  status: 'created' | 'in_progress' | 'completed' | 'paused';
  settings: {
    playersPerGroup?: number; // 3 ou 4 pour les groupes
    rounds?: number; // 4 ou 5 pour swiss/marathon
    timeLimit?: number; // en minutes
    winningScore: number; // 13 ou 11
    maxTeams: number; // nombre max d'équipes
    teamType: 'individual' | 'doubles' | 'triples';
  };
  teams: mongoose.Types.ObjectId[];
  matches: mongoose.Types.ObjectId[];
  groups?: mongoose.Types.ObjectId[];
  currentRound: number;
  maxRounds: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const tournamentSchema = new mongoose.Schema<ITournament>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['groups', 'swiss', 'marathon'],
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'in_progress', 'completed', 'paused'],
    default: 'created'
  },
  settings: {
    playersPerGroup: {
      type: Number,
      min: 3,
      max: 4
    },
    rounds: {
      type: Number,
      min: 4,
      max: 5
    },
    timeLimit: {
      type: Number,
      min: 30,
      max: 120
    },
    winningScore: {
      type: Number,
      enum: [11, 13],
      default: 13
    },
    maxTeams: {
      type: Number,
      default: 128
    },
    teamType: {
      type: String,
      enum: ['individual', 'doubles', 'triples'],
      default: 'individual'
    }
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  currentRound: {
    type: Number,
    default: 0
  },
  maxRounds: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

export default mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema); 