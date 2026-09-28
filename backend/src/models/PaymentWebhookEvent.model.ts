import mongoose, { Schema, Document, Types } from 'mongoose';

export type WebhookProcessingStatus = 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';

export interface IPaymentWebhookEvent {
  _id: Types.ObjectId;
  provider: string;
  providerEventId: string;
  eventType: string;
  rawPayload: Record<string, unknown>;
  processingStatus: WebhookProcessingStatus;
  status?: WebhookProcessingStatus;
  processedAt?: Date;
  createdAt: Date;
}

export type PaymentWebhookEventDocument = IPaymentWebhookEvent &
  Document<Types.ObjectId, object, IPaymentWebhookEvent>;

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    provider: {
      type: String,
      required: [true, 'Webhook provider source is required'],
      trim: true,
    },
    providerEventId: {
      type: String,
      required: [true, 'Provider event ID is required'],
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Webhook event type is required'],
      trim: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: [true, 'Raw webhook payload is required for audit verification'],
    },
    processingStatus: {
      type: String,
      enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE'],
      default: 'RECEIVED',
      required: true,
    },
    status: {
      type: String,
      enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE'],
      default: 'RECEIVED',
    },
    processedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Explicitly managed immutable event log
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Strict webhook idempotency index: guarantees exactly-once processing per event ID
PaymentWebhookEventSchema.index({ providerEventId: 1 }, { unique: true });

// 2. Queue & dead-letter audit queries: lookup pending or failed webhook events
PaymentWebhookEventSchema.index({ processingStatus: 1, createdAt: -1 });

export const PaymentWebhookEvent = mongoose.model<IPaymentWebhookEvent>(
  'PaymentWebhookEvent',
  PaymentWebhookEventSchema
);

export default PaymentWebhookEvent;
