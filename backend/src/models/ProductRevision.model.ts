import mongoose, { Schema, Document, Types } from 'mongoose';
import { IProductPricing, IProductMedia } from './Product.model';

export interface IProductRevisionSnapshot {
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  categoryId: Types.ObjectId;
  pricing: IProductPricing;
  media?: IProductMedia;
}

export interface IProductRevision {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  editorId: Types.ObjectId;
  versionNumber: number;
  snapshot: IProductRevisionSnapshot;
  changeReason?: string;
  createdAt: Date;
}

export type ProductRevisionDocument = IProductRevision & Document<Types.ObjectId, object, IProductRevision>;

const ProductRevisionSchema = new Schema<IProductRevision>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    editorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Editor user reference is required'],
    },
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version number must be at least 1'],
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: [true, 'Revision snapshot is required'],
    },
    changeReason: {
      type: String,
      maxlength: [500, 'Change reason cannot exceed 500 characters'],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, // Immutable revision audit records with explicit createdAt
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Compound UNIQUE index: guarantees strictly monotonic versionNumber per product
ProductRevisionSchema.index({ productId: 1, versionNumber: 1 }, { unique: true });

// 2. Index: fast historical revision audit timeline retrieval
ProductRevisionSchema.index({ productId: 1, createdAt: -1 });

export const ProductRevision = mongoose.model<IProductRevision>(
  'ProductRevision',
  ProductRevisionSchema
);

export default ProductRevision;
