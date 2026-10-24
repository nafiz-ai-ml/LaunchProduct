import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentStatus } from '../shared/constants';

export type PaymentProvider = 'paddle';

export interface IPayment {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  payerEmail?: string;
  contributionType?: 'INITIAL_ENTRY' | 'DAILY' | 'ALL_TIME_BOOST';
  paymentType: 'RANKING';
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
    payerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contributionType: {
      type: String,
      enum: ['INITIAL_ENTRY', 'DAILY', 'ALL_TIME_BOOST'],
      default: 'DAILY',
    },
    paymentType: {
      type: String,
      enum: ['RANKING', 'SPONSORSHIP'],
      default: 'RANKING',
      required: true,
    },
    provider: {
      type: String,
      enum: ['paddle'],
      required: [true, 'Payment provider is required'],
    },
    providerCustomerId: {
      type: String,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
    },
    providerEventId: {
      type: String,
      trim: true,
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
// 1. Provider payment reference lookup (unique partial index for string type)
PaymentSchema.index(
  { providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerPaymentId: { $type: 'string' } },
  }
);

// 2. Webhook idempotency payment lookup (unique partial index for string type)
PaymentSchema.index(
  { providerEventId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerEventId: { $type: 'string' } },
  }
);

// 3. Product payments lookup
PaymentSchema.index({ productId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
