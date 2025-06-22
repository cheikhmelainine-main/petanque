import mongoose from 'mongoose';

export interface IPlayer {
  name: string;
  email?: string;
  phone?: string;
}

export interface ITeam extends mongoose.Document {
  name: string;
  players: IPlayer[];
  type: 'individual' | 'doubles' | 'triples';
  tournament: mongoose.Types.ObjectId;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    scoreDifference: number;
    gamesPlayed: number;
  };
  groupId?: mongoose.Types.ObjectId;
  eliminated: boolean;
  ranking?: number;
  createdAt: Date;
  updatedAt: Date;
}

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  }
}, { _id: false });

const teamSchema = new mongoose.Schema<ITeam>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  players: {
    type: [playerSchema],
    required: true,
    validate: {
      validator: function(players: IPlayer[]) {
        return players.length >= 1 && players.length <= 3;
      },
      message: 'Une équipe doit avoir entre 1 et 3 joueurs'
    }
  },
  type: {
    type: String,
    enum: ['individual', 'doubles', 'triples'],
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  stats: {
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    scoreDifference: {
      type: Number,
      default: 0
    },
    gamesPlayed: {
      type: Number,
      default: 0
    }
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  eliminated: {
    type: Boolean,
    default: false
  },
  ranking: Number,
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
teamSchema.index({ tournament: 1 });
teamSchema.index({ groupId: 1 });
teamSchema.index({ 'stats.points': -1, 'stats.scoreDifference': -1 });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', teamSchema); 