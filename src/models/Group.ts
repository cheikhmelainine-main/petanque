import mongoose from 'mongoose';

export interface IGroup extends mongoose.Document {
  tournament: mongoose.Types.ObjectId;
  name: string;
  teams: mongoose.Types.ObjectId[];
  matches: mongoose.Types.ObjectId[];
  maxTeams: number; // 3 ou 4
  status: 'created' | 'in_progress' | 'completed';
  qualifiedTeams: mongoose.Types.ObjectId[]; // Équipes qualifiées pour la suite
  groupType: 'initial_random' | 'round_robin'; // Type de système dans le groupe
  currentRound: number;
  maxRounds: number;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new mongoose.Schema<IGroup>({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  maxTeams: {
    type: Number,
    min: 3,
    max: 4,
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'in_progress', 'completed'],
    default: 'created'
  },
  qualifiedTeams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  groupType: {
    type: String,
    enum: ['initial_random', 'round_robin'],
    required: true
  },
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
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
groupSchema.index({ tournament: 1 });
groupSchema.index({ status: 1 });

export default mongoose.models.Group || mongoose.model<IGroup>('Group', groupSchema); 