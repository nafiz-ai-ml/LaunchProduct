import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentStatus } from '../shared/constants';

export type PaymentProvider = 'paddle' | 'lemonsqueezy';

export interface IPayment {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  founderId: Types.ObjectId;
  provider: PaymentProvider;
  providerCustomerId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerEventId?: string;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'DISPUTED';
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = IPayment & Document<Types.ObjectId, object, IPayment>;

const PaymentSchema = new Schema<IPayment>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Founder reference is required'],
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

// 3. Campaign payments lookup
PaymentSchema.index({ campaignId: 1 });

// 4. Founder payment history lookup
PaymentSchema.index({ founderId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
