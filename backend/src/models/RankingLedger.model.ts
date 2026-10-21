import mongoose, { Schema, Document, Types } from 'mongoose';

export type LedgerEntryStatus = 'APPLIED' | 'REVERSED';
export type RankingContributionType = 'INITIAL_ENTRY' | 'DAILY' | 'ALL_TIME_BOOST';

export interface IRankingLedger {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  productId: Types.ObjectId;
  founderId?: Types.ObjectId;
  payerEmail?: string;
  contributionType: RankingContributionType;
  amountCents: number;
  qualifyingAmountCents: number;
  targetDailyDate: string; // YYYY-MM-DD UTC date of contribution
  status: LedgerEntryStatus;
  reversalReason?: string;
  appliedAt: Date;
  reversedAt?: Date;
  previousAllTimeCents: number;
  newAllTimeCents: number;
  previousTodayCents: number;
  newTodayCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RankingLedgerDocument = IRankingLedger & Document<Types.ObjectId, object, IRankingLedger>;

const RankingLedgerSchema = new Schema<IRankingLedger>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required'],
      unique: true, // Exactly one ledger record per payment
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: false,
    },
    payerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    contributionType: {
      type: String,
      enum: ['INITIAL_ENTRY', 'DAILY', 'ALL_TIME_BOOST'],
      default: 'DAILY',
      required: true,
    },
    amountCents: {
      type: Number,
      required: [true, 'Amount in cents is required'],
      min: [0, 'Amount cannot be negative'],
    },
    qualifyingAmountCents: {
      type: Number,
      required: [true, 'Qualifying ranking amount in cents is required'],
      min: [0, 'Qualifying amount cannot be negative'],
    },
    targetDailyDate: {
      type: String,
      required: [true, 'Target daily date (YYYY-MM-DD) is required'],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'targetDailyDate must be formatted as YYYY-MM-DD'],
    },
    status: {
      type: String,
      enum: ['APPLIED', 'REVERSED'],
      default: 'APPLIED',
      required: true,
    },
    reversalReason: {
      type: String,
      default: null,
      maxlength: [500, 'Reversal reason cannot exceed 500 characters'],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    previousAllTimeCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    newAllTimeCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousTodayCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    newTodayCents: {
      type: Number,
      default: 0,
      min: 0,
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
// 1. Product ledger query index (audit trail descending)
RankingLedgerSchema.index({ productId: 1, appliedAt: -1 });

// 3. Daily date ledger query index
RankingLedgerSchema.index({ targetDailyDate: 1, status: 1 });

// 4. Founder audit query index
RankingLedgerSchema.index({ founderId: 1, appliedAt: -1 });

export const RankingLedger = mongoose.model<IRankingLedger>('RankingLedger', RankingLedgerSchema);
export default RankingLedger;
