import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITrustScore extends Document {
  user: Types.ObjectId;
  pod: Types.ObjectId;
  score: number;
  reasoning: string;
  riskFlag: boolean;
  evaluatedAt: Date;
}

const TrustScoreSchema = new Schema<ITrustScore>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pod: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    reasoning: { type: String, required: true },
    riskFlag: { type: Boolean, default: false },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ITrustScore>('TrustScore', TrustScoreSchema);
