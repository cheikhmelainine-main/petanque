import mongoose from 'mongoose';

export interface IMatch extends mongoose.Document {
  tournament: mongoose.Types.ObjectId;
  team1: mongoose.Types.ObjectId;
  team2: mongoose.Types.ObjectId;
  round: number;
  groupId?: mongoose.Types.ObjectId;
  bracketType?: 'winners' | 'losers';
  
  // Scores
  score1: number;
  score2: number;
  
  // Statut du match
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  // Gestion du temps
  timeLimit?: number; // en minutes
  startTime?: Date;
  endTime?: Date;
  timeExpired: boolean;
  
  // Points attribués (pour le système suisse/marathon)
  pointsTeam1: number; // 3 points si victoire avant limite temps, 2 points si victoire après limite, 1 point si nul
  pointsTeam2: number;
  
  // Résultat
  winner?: mongoose.Types.ObjectId;
  isDraw: boolean;
  
  // Match suivant (pour les brackets)
  nextMatch?: mongoose.Types.ObjectId;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

const matchSchema = new mongoose.Schema<IMatch>({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  round: {
    type: Number,
    required: true,
    min: 1
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  bracketType: {
    type: String,
    enum: ['winners', 'losers']
  },
  score1: {
    type: Number,
    default: 0,
    min: 0
  },
  score2: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  timeLimit: {
    type: Number,
    min: 30,
    max: 120
  },
  startTime: Date,
  endTime: Date,
  timeExpired: {
    type: Boolean,
    default: false
  },
  pointsTeam1: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  pointsTeam2: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  isDraw: {
    type: Boolean,
    default: false
  },
  nextMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
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
matchSchema.index({ tournament: 1, round: 1 });
matchSchema.index({ tournament: 1, status: 1 });
matchSchema.index({ groupId: 1 });
matchSchema.index({ team1: 1 });
matchSchema.index({ team2: 1 });

export default mongoose.models.Match || mongoose.model<IMatch>('Match', matchSchema); 