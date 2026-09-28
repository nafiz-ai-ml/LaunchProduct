import mongoose, { Schema, Document, Types } from 'mongoose';

export type VerificationMethod = 'EMAIL_DOMAIN' | 'DNS_TXT' | 'HTML_META';
export type OwnershipVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REVOKED'
  | 'FAILED_EXPIRED';

export interface IOwnershipVerification {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  method: VerificationMethod;
  status: OwnershipVerificationStatus;
  tokenHash: string;
  expiresAt: Date;
  verifiedAt?: Date;
  revokedAt?: Date;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OwnershipVerificationDocument = IOwnershipVerification &
  Document<Types.ObjectId, object, IOwnershipVerification>;

const OwnershipVerificationSchema = new Schema<IOwnershipVerification>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    method: {
      type: String,
      enum: ['EMAIL_DOMAIN', 'DNS_TXT', 'HTML_META'],
      required: [true, 'Verification method is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REVOKED', 'FAILED_EXPIRED'],
      default: 'PENDING',
      required: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      default: () => new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from creation
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
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
// 1. Partial UNIQUE: only one verified claim per product at any time
OwnershipVerificationSchema.index(
  { productId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'VERIFIED' },
  }
);

// 2. User claims query by status
OwnershipVerificationSchema.index({ userId: 1, status: 1 });

// 3. Token lookup (unique & sparse)
OwnershipVerificationSchema.index({ tokenHash: 1 }, { unique: true, sparse: true });

// 4. TTL index: automatically remove expired pending claims after expiresAt
OwnershipVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OwnershipVerification = mongoose.model<IOwnershipVerification>(
  'OwnershipVerification',
  OwnershipVerificationSchema
);

export default OwnershipVerification;
