import mongoose, { Schema, Document, Types } from 'mongoose';

export type CampaignTier =
  | 'LAUNCH_BOOST'
  | 'CATEGORY_FEATURED'
  | 'HOMEPAGE_SPOTLIGHT'
  | 'LAUNCH_PARTNER';

export type CampaignStatusType =
  | 'RESERVED'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PAUSED';

export interface ICampaignMetadata {
  targetCategorySlug?: string;
  displayLabel?: string;
}

export interface ICampaign {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  founderId: Types.ObjectId;
  tier: CampaignTier;
  status: CampaignStatusType;
  slotKey: string;
  startsAt: Date;
  endsAt: Date;
  amountCents: number;
  providerCheckoutUrl?: string;
  providerSessionId?: string;
  providerPaymentId?: string;
  expiresAt?: Date;
  metadata: ICampaignMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignDocument = ICampaign & Document<Types.ObjectId, object, ICampaign>;

const CampaignMetadataSchema = new Schema<ICampaignMetadata>(
  {
    targetCategorySlug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    displayLabel: {
      type: String,
      trim: true,
      maxlength: 60,
    },
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Founder reference is required'],
    },
    tier: {
      type: String,
      enum: ['LAUNCH_BOOST', 'CATEGORY_FEATURED', 'HOMEPAGE_SPOTLIGHT', 'LAUNCH_PARTNER'],
      required: [true, 'Sponsorship tier is required'],
    },
    status: {
      type: String,
      enum: ['RESERVED', 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED'],
      default: 'RESERVED',
      required: true,
    },
    slotKey: {
      type: String,
      required: [true, 'Slot key identifier is required (e.g. homepage:1)'],
      trim: true,
    },
    startsAt: {
      type: Date,
      required: [true, 'Campaign start date is required'],
    },
    endsAt: {
      type: Date,
      required: [true, 'Campaign end date is required'],
    },
    amountCents: {
      type: Number,
      required: [true, 'Amount in cents is required'],
      min: [0, 'Amount cannot be negative'],
    },
    providerCheckoutUrl: {
      type: String,
      trim: true,
    },
    providerSessionId: {
      type: String,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: CampaignMetadataSchema,
      default: () => ({}),
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
// 1. Product campaigns query index
CampaignSchema.index({ productId: 1, status: 1 });

// 2. Slot availability checking (prevent overlapping active bookings for the same inventory slot)
CampaignSchema.index({ slotKey: 1, status: 1, startsAt: 1, endsAt: 1 });

// 3. Founder campaigns history
CampaignSchema.index({ founderId: 1, createdAt: -1 });

// 4. Expiry worker evaluation (query active campaigns whose endsAt <= now)
CampaignSchema.index({ status: 1, endsAt: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
export default Campaign;
