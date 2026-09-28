import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export interface IFounderReply {
  body: string;
  repliedAt: Date;
}

export interface IReviewFlag {
  userId: Types.ObjectId;
  reason: string;
  createdAt: Date;
}

export interface IReview {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  conflictOfInterestDisclosed: boolean;
  founderReply?: IFounderReply;
  moderationReason?: string;
  flags?: IReviewFlag[];
  flagCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = IReview & Document<Types.ObjectId, object, IReview>;

const FounderReplySchema = new Schema<IFounderReply>(
  {
    body: {
      type: String,
      required: [true, 'Reply content is required'],
      trim: true,
      maxlength: [1000, 'Founder reply cannot exceed 1000 characters'],
    },
    repliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review author reference is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Star rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    body: {
      type: String,
      required: [true, 'Review body is required'],
      trim: true,
      minlength: [50, 'Review body must be at least 50 characters to ensure thoughtful feedback'],
      maxlength: [2000, 'Review body cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'],
      default: 'PENDING',
      required: true,
    },
    conflictOfInterestDisclosed: {
      type: Boolean,
      default: false,
      required: true,
    },
    founderReply: {
      type: FounderReplySchema,
      default: null,
    },
    moderationReason: {
      type: String,
      maxlength: [500, 'Moderation reason cannot exceed 500 characters'],
      default: null,
    },
    flags: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          reason: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    flagCount: {
      type: Number,
      default: 0,
      min: 0,
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
// 1. Compound UNIQUE index: one review per user per product
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// 2. Compound index: product reviews filtered by approval status and sorted by recency
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
export default Review;
