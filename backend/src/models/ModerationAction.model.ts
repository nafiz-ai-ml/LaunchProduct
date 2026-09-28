import mongoose, { Schema, Document, Types } from 'mongoose';

export type ModerationTargetType = 'PRODUCT' | 'VOTE' | 'REVIEW' | 'USER' | 'CLAIM';

export interface IModerationAction {
  _id: Types.ObjectId;
  moderatorId: Types.ObjectId;
  targetType: ModerationTargetType;
  targetId: Types.ObjectId;
  action: string;
  reason?: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  createdAt: Date;
}

export type ModerationActionDocument = IModerationAction &
  Document<Types.ObjectId, object, IModerationAction>;

const ModerationActionSchema = new Schema<IModerationAction>(
  {
    moderatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Moderator user reference is required'],
    },
    targetType: {
      type: String,
      enum: ['PRODUCT', 'VOTE', 'REVIEW', 'USER', 'CLAIM'],
      required: [true, 'Target entity type is required'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target entity ID is required'],
    },
    action: {
      type: String,
      required: [true, 'Moderation action is required'],
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Moderation reason cannot exceed 1000 characters'],
      default: null,
    },
    previousState: {
      type: Schema.Types.Mixed,
      required: [true, 'Snapshot before action is required'],
      default: () => ({}),
    },
    newState: {
      type: Schema.Types.Mixed,
      required: [true, 'Snapshot after action is required'],
      default: () => ({}),
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Immutable governance audit log
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Target entity moderation history timeline
ModerationActionSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// 2. Moderator accountability & action audit log
ModerationActionSchema.index({ moderatorId: 1, createdAt: -1 });

// 3. Global moderation activity feed (recent actions across platform)
ModerationActionSchema.index({ createdAt: -1 });

export const ModerationAction = mongoose.model<IModerationAction>(
  'ModerationAction',
  ModerationActionSchema
);

export default ModerationAction;
