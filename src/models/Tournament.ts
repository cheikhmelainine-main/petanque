import mongoose from 'mongoose';

export interface ITournament extends mongoose.Document {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  currentParticipants: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  location: string;
  entryFee: number;
  prize: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du tournoi est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  startDate: {
    type: Date,
    required: [true, 'La date de début est requise']
  },
  endDate: {
    type: Date,
    required: [true, 'La date de fin est requise'],
    validate: {
      validator: function(this: ITournament, value: Date) {
        return value > this.startDate
      },
      message: 'La date de fin doit être après la date de début'
    }
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Le nombre maximum de participants est requis'],
    min: [2, 'Il faut au moins 2 participants'],
    max: [64, 'Maximum 64 participants']
  },
  currentParticipants: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre de participants ne peut pas être négatif']
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  location: {
    type: String,
    required: [true, 'Le lieu est requis'],
    trim: true
  },
  entryFee: {
    type: Number,
    default: 0,
    min: [0, 'Les frais d\'inscription ne peuvent pas être négatifs']
  },
  prize: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', TournamentSchema); 