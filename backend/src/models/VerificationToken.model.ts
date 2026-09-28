import mongoose, { Schema, Document, Types } from 'mongoose';

export type VerificationTokenType = 'MAGIC_LINK' | 'EMAIL_VERIFY';

export interface IVerificationToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  type: VerificationTokenType;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export type VerificationTokenDocument = IVerificationToken & Document<Types.ObjectId, object, IVerificationToken>;

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['MAGIC_LINK', 'EMAIL_VERIFY'],
      required: [true, 'Verification token type is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isUsed: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Explicitly using createdAt & expiresAt TTL
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. TTL index: automatic document cleanup by MongoDB when expiresAt timestamp arrives
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 2. Token hash index: fast unique lookup during link consumption
VerificationTokenSchema.index({ tokenHash: 1 }, { unique: true });

// 3. Composite index: lookup active tokens by user and token purpose
VerificationTokenSchema.index({ userId: 1, type: 1 });

export const VerificationToken = mongoose.model<IVerificationToken>(
  'VerificationToken',
  VerificationTokenSchema
);

export default VerificationToken;
