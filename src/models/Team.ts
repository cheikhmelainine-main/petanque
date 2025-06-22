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
  tournamentId: mongoose.Types.ObjectId;
  points: number;
  scoreDiff: number;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    scoreDifference: number;
    gamesPlayed: number;
  };
  groupId?: mongoose.Types.ObjectId;
  groupNumber?: number;
  eliminated: boolean;
  qualified?: boolean;
  ranking?: number;
  
  // Nouvelles propriétés pour la logique améliorée
  tournamentPoints: number;  // Points de tournoi (swiss/marathon)
  wins: number;              // Nombre de victoires
  losses: number;            // Nombre de défaites
  draws: number;             // Nombre de matchs nuls
  isQualified?: boolean;     // Si l'équipe est qualifiée (groupes)
  qualificationRank?: number; // Rang de qualification dans le groupe (1er qualifié direct, 2ème en barrage)
  
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
    default: []
  },
  type: {
    type: String,
    enum: ['individual', 'doubles', 'triples'],
    default: 'doubles'
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  scoreDiff: {
    type: Number,
    default: 0
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
  groupNumber: {
    type: Number
  },
  eliminated: {
    type: Boolean,
    default: false
  },
  qualified: {
    type: Boolean,
    default: false
  },
  ranking: Number,
  tournamentPoints: {
    type: Number,
    default: 0
  },
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
  isQualified: {
    type: Boolean
  },
  qualificationRank: {
    type: Number
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
teamSchema.index({ tournamentId: 1 });
teamSchema.index({ groupId: 1 });
teamSchema.index({ points: -1, scoreDiff: -1 });
teamSchema.index({ 'stats.points': -1, 'stats.scoreDifference': -1 });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', teamSchema); 