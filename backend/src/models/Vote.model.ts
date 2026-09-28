import mongoose, { Schema, Document, Types } from 'mongoose';
import { VoteStatus } from '../shared/constants';

export interface IRiskAssessment {
  triggeredSignals: string[];
  notes?: string;
  ipHash?: string;
  subnetHash?: string;
  asnNumber?: number;
  accountAgeHours?: number;
  fingerprintHash?: string;
}

export interface IVote {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  status: VoteStatus;
  riskScore: number;
  riskAssessment: IRiskAssessment;
  ipHash: string;
  subnetHash: string;
  deviceFingerprint?: string;
  moderatorNote?: string;
  retractedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export type VoteDocument = IVote & Document<Types.ObjectId, object, IVote>;

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    triggeredSignals: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    ipHash: {
      type: String,
      trim: true,
    },
    subnetHash: {
      type: String,
      trim: true,
    },
    asnNumber: {
      type: Number,
    },
    accountAgeHours: {
      type: Number,
      min: 0,
    },
    fingerprintHash: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const VoteSchema = new Schema<IVote>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    status: {
      type: String,
      enum: Object.values(VoteStatus),
      default: VoteStatus.VALID,
      required: true,
    },
    riskScore: {
      type: Number,
      min: [0, 'Risk score cannot be less than 0'],
      max: [100, 'Risk score cannot exceed 100'],
      default: 0,
      required: true,
    },
    riskAssessment: {
      type: RiskAssessmentSchema,
      required: true,
      default: () => ({ triggeredSignals: [] }),
    },
    ipHash: {
      type: String,
      required: [true, 'HMAC-SHA256 IP hash is required'],
      trim: true,
    },
    subnetHash: {
      type: String,
      required: [true, '/24 subnet hash is required'],
      trim: true,
    },
    deviceFingerprint: {
      type: String,
      trim: true,
    },
    moderatorNote: {
      type: String,
      trim: true,
      default: null,
    },
    retractedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Compound UNIQUE index: one vote per user per product
VoteSchema.index({ productId: 1, userId: 1 }, { unique: true });

// 2. Compound index: leaderboard score aggregation filtered by status and sorted by recency
VoteSchema.index({ productId: 1, status: 1, createdAt: -1 });

// 3. Compound index: subnet concentration anti-fraud detection
VoteSchema.index({ subnetHash: 1, productId: 1, createdAt: -1 });

// 4. Index: moderation queue inspection for flagged & quarantined votes
VoteSchema.index({ status: 1, createdAt: -1 });

// 5. Index: user vote history lookup
VoteSchema.index({ userId: 1 });

export const Vote = mongoose.model<IVote>('Vote', VoteSchema);
export default Vote;
