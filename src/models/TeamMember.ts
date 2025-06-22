import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember extends Document {
  name: string;
  teamId: mongoose.Types.ObjectId;
}

const teamMemberSchema = new Schema<ITeamMember>({
  name: {
    type: String,
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  }
});

export default mongoose.models.TeamMember || mongoose.model<ITeamMember>('TeamMember', teamMemberSchema); 