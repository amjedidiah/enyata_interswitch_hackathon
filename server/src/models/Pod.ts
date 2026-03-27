import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPodVirtualAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountPayableCode: string;
  currencyCode: string;
}

export interface IPod extends Document {
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  maxMembers: number;
  members: Types.ObjectId[];
  payoutQueue: Types.ObjectId[];
  paidOutMembers: Types.ObjectId[];
  status: "active" | "completed";
  walletId?: string;
  virtualAccount?: IPodVirtualAccount;
  walletPin: string;
  contributionTotal: number;
  currentCycle: number;
  resetCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const PodSchema = new Schema<IPod>(
  {
    name: { type: String, required: true, trim: true },
    contributionAmount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    maxMembers: { type: Number, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    payoutQueue: [{ type: Schema.Types.ObjectId, ref: "User" }],
    paidOutMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["active", "completed"], default: "active" },
    walletId: { type: String },
    virtualAccount: {
      type: new Schema(
        {
          id: Number,
          accountName: String,
          accountNumber: String,
          bankName: String,
          bankCode: String,
          accountPayableCode: String,
          currencyCode: String,
        },
        { _id: false },
      ),
      default: undefined,
    },
    walletPin: { type: String, required: true },
    contributionTotal: { type: Number, default: 0 },
    currentCycle: { type: Number, default: 1 },
    resetCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    // Prevents concurrent saves from silently overwriting each other.
    // If two payout requests race and both load the same pod, the second
    // pod.save() will throw a VersionError — caught in the route as a 409.
    // Note: this protects pod state but does not prevent a double Interswitch
    // disbursement call in the narrow window before either save() completes.
    // Full exactly-once protection requires an atomic pre-claim (Redis/BullMQ).
    optimisticConcurrency: true,
  },
);

export default mongoose.model<IPod>("Pod", PodSchema);
