import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentStatus } from '../shared/constants';

export type PaymentProvider = 'paddle' | 'lemonsqueezy';

export interface IPayment {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  campaignId?: Types.ObjectId | null;
  founderId: Types.ObjectId;
  paymentType: 'RANKING' | 'SPONSORSHIP';
  provider: PaymentProvider;
  providerCustomerId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerEventId?: string;
  amountCents: number;
  rankingContributionCents: number;
  appliedToRanking: boolean;
  targetDailyDate?: string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'DISPUTED';
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = IPayment & Document<Types.ObjectId, object, IPayment>;

const PaymentSchema = new Schema<IPayment>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Founder reference is required'],
    },
    paymentType: {
      type: String,
      enum: ['RANKING', 'SPONSORSHIP'],
      default: 'RANKING',
      required: true,
    },
    provider: {
      type: String,
      enum: ['paddle', 'lemonsqueezy'],
      required: [true, 'Payment provider is required'],
    },
    providerCustomerId: {
      type: String,
      trim: true,
      default: null,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
    providerOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    providerEventId: {
      type: String,
      trim: true,
      default: null,
    },
    amountCents: {
      type: Number,
      required: [true, 'Payment amount in cents is required'],
      min: [0, 'Amount cannot be negative'],
    },
    rankingContributionCents: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    appliedToRanking: {
      type: Boolean,
      default: false,
      required: true,
    },
    targetDailyDate: {
      type: String,
      default: null,
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
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
// 1. Provider payment reference lookup (unique & sparse)
PaymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

// 2. Webhook idempotency payment lookup (unique & sparse)
PaymentSchema.index({ providerEventId: 1 }, { unique: true, sparse: true });

// 3. Campaign payments lookup (sparse since ranking payments do not have campaignId)
PaymentSchema.index({ campaignId: 1 }, { sparse: true });

// 4. Product payments lookup
PaymentSchema.index({ productId: 1, createdAt: -1 });

// 5. Founder payment history lookup
PaymentSchema.index({ founderId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
