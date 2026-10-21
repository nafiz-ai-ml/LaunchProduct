import mongoose, { Schema, Document, Types } from 'mongoose';

export type LeaderboardType = 'TODAY' | 'ALL_TIME' | 'CATEGORY' | 'LAUNCH_DAY' | 'TRENDING';

export interface IProductSnapshotData {
  name: string;
  slug: string;
  tagline: string;
  logoUrl?: string;
  websiteUrl: string;
  canonicalDomain: string;
  categoryId?: Types.ObjectId;
  categoryName?: string;
}

export interface IDailyLeaderboardSnapshot {
  _id: Types.ObjectId;
  snapshotDate: Date;
  leaderboardType: LeaderboardType;
  productId: Types.ObjectId;
  rank: number;
  score: number;
  paidAmountCents: number;
  productSnapshot?: IProductSnapshotData;
  algorithmVersion: string;
  voteCount: number;
  reviewCount: number;
  qualifiedClickCount: number;
  generatedAt: Date;
}

export type DailyLeaderboardSnapshotDocument = IDailyLeaderboardSnapshot &
  Document<Types.ObjectId, object, IDailyLeaderboardSnapshot>;

const ProductSnapshotSchema = new Schema<IProductSnapshotData>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    tagline: { type: String, default: '' },
    logoUrl: { type: String, default: null },
    websiteUrl: { type: String, default: '' },
    canonicalDomain: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    categoryName: { type: String, default: null },
  },
  { _id: false }
);

const DailyLeaderboardSnapshotSchema = new Schema<IDailyLeaderboardSnapshot>(
  {
    snapshotDate: {
      type: Date,
      required: [true, 'Snapshot date is required (UTC midnight)'],
    },
    leaderboardType: {
      type: String,
      enum: ['TODAY', 'ALL_TIME', 'CATEGORY', 'LAUNCH_DAY', 'TRENDING'],
      required: [true, 'Leaderboard type is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    rank: {
      type: Number,
      required: [true, 'Rank position is required'],
      min: [1, 'Rank must be at least 1'],
    },
    score: {
      type: Number,
      required: [true, 'Calculated score is required'],
      default: 0,
    },
    paidAmountCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    productSnapshot: {
      type: ProductSnapshotSchema,
      default: null,
    },
    algorithmVersion: {
      type: String,
      required: [true, 'Algorithm version is required'],
      default: 'pay-to-rank-1.0',
      trim: true,
    },
    voteCount: {
      type: Number,
      required: [true, 'Vote count is required'],
      default: 0,
      min: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    qualifiedClickCount: {
      type: Number,
      required: [true, 'Qualified click count is required'],
      default: 0,
      min: 0,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Immutable historical daily archive
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Compound UNIQUE: exactly one product per rank per leaderboard type on any date
DailyLeaderboardSnapshotSchema.index(
  { snapshotDate: 1, leaderboardType: 1, rank: 1 },
  { unique: true }
);

// 2. Score ranking retrieval index
DailyLeaderboardSnapshotSchema.index({ snapshotDate: 1, leaderboardType: 1, score: -1 });

// 3. Historical product rank trajectory lookup
DailyLeaderboardSnapshotSchema.index({ productId: 1, leaderboardType: 1, snapshotDate: -1 });

export const DailyLeaderboardSnapshot = mongoose.model<IDailyLeaderboardSnapshot>(
  'DailyLeaderboardSnapshot',
  DailyLeaderboardSnapshotSchema
);

export default DailyLeaderboardSnapshot;
