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
  
  // Configuration pour les tournois GROUP
  groupSize?: number;  // 3 ou 4 équipes par groupe
  groupsCount?: number;  // Nombre de groupes
  qualifiersPerGroup?: number;  // Nombre de qualifiés par groupe (default: 2)
  
  // Configuration pour les matchs temporisés
  hasTimedMatches?: boolean;  // Si les matchs ont une limite de temps
  matchTimeLimit?: number;  // Limite de temps en minutes (default: 45)
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
  },
  
  // Configuration pour les tournois GROUP
  groupSize: {
    type: Number,
    default: 4,
    min: 3,
    max: 4
  },
  groupsCount: {
    type: Number
  },
  qualifiersPerGroup: {
    type: Number,
    default: 2
  },
  
  // Configuration pour les matchs temporisés
  hasTimedMatches: {
    type: Boolean,
    default: true
  },
  matchTimeLimit: {
    type: Number,
    default: 45
  }
});

export default mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema); 