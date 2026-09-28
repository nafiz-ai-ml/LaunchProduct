import mongoose, { Schema, Document, Types } from 'mongoose';
import { EventSource, EventSourceType } from '../shared/constants';

export interface IActivityEvent {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  productId?: Types.ObjectId;
  eventType: string;
  eventSource: EventSourceType;
  sessionHash?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type ActivityEventDocument = IActivityEvent &
  Document<Types.ObjectId, object, IActivityEvent>;

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    eventType: {
      type: String,
      required: [true, 'Event type identifier is required'],
      trim: true,
    },
    eventSource: {
      type: String,
      enum: Object.values(EventSource),
      required: [true, 'Event source is required'],
      default: EventSource.ORGANIC,
    },
    sessionHash: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Explicit append-only event log
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Analytics aggregation: product performance by source and event type over time
ActivityEventSchema.index({ productId: 1, eventSource: 1, eventType: 1, createdAt: -1 });

// 2. User activity stream timeline
ActivityEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });

// 3. TTL: automatically purge events older than 90 days (7,776,000 seconds)
ActivityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const ActivityEvent = mongoose.model<IActivityEvent>(
  'ActivityEvent',
  ActivityEventSchema
);

export default ActivityEvent;
