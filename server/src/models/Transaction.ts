import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
  pod: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'manual';
  type: 'contribution' | 'disbursement';
  interswitchRef?: string;
  cycleNumber?: number;
  timestamp: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    pod: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'manual'], required: true },
    type: { type: String, enum: ['contribution', 'disbursement'], default: 'contribution' },
    interswitchRef: { type: String },
    cycleNumber: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
