import mongoose, { Schema, Document, Types } from 'mongoose';
import { ProductStatus } from '../shared/constants';

export type PricingModel = 'free' | 'freemium' | 'paid' | 'open_source';

export interface IProductPricing {
  model: PricingModel;
  startingPrice?: number;
  currency?: string;
}

export interface IProductMedia {
  logoUrl?: string;
  bannerUrl?: string;
  screenshotUrls: string[];
}

export interface IProduct {
  _id: Types.ObjectId;
  slug: string;
  canonicalDomain: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  founderId?: Types.ObjectId;
  submittedById: Types.ObjectId;
  categoryId: Types.ObjectId;
  pricing: IProductPricing;
  media: IProductMedia;
  status: ProductStatus;
  launchDate?: Date;
  rejectionReason?: string;
  initialVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = IProduct & Document<Types.ObjectId, object, IProduct>;

const ProductPricingSchema = new Schema<IProductPricing>(
  {
    model: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'open_source'],
      required: true,
      default: 'freemium',
    },
    startingPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
  },
  { _id: false }
);

const ProductMediaSchema = new Schema<IProductMedia>(
  {
    logoUrl: {
      type: String,
      trim: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    screenshotUrls: {
      type: [String],
      default: [],
      validate: [
        (val: string[]) => val.length <= 10,
        'Screenshot URLs cannot exceed 10 items',
      ],
    },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be valid lowercase alphanumeric with hyphens'],
    },
    canonicalDomain: {
      type: String,
      required: [true, 'Canonical domain is required'],
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    tagline: {
      type: String,
      required: [true, 'Product tagline is required'],
      trim: true,
      minlength: [10, 'Tagline must be at least 10 characters'],
      maxlength: [140, 'Tagline cannot exceed 140 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    websiteUrl: {
      type: String,
      required: [true, 'Website URL is required'],
      trim: true,
      maxlength: [2048, 'Website URL cannot exceed 2048 characters'],
    },
    founderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitting user reference is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
    },
    pricing: {
      type: ProductPricingSchema,
      required: true,
      default: () => ({ model: 'freemium', startingPrice: 0, currency: 'USD' }),
    },
    media: {
      type: ProductMediaSchema,
      required: true,
      default: () => ({ screenshotUrls: [] }),
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      required: true,
    },
    launchDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      default: null,
    },
    initialVersion: {
      type: Number,
      default: 1,
      min: 1,
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
// 1. Compound index: category page queries sorted by launchDate descending
ProductSchema.index({ categoryId: 1, status: 1, launchDate: -1 });

// 2. Compound index: leaderboard queries
ProductSchema.index({ status: 1, launchDate: 1 });

// 3. Compound index: founder dashboard queries
ProductSchema.index({ founderId: 1, status: 1 });

// 4. Compound index: user submissions history
ProductSchema.index({ submittedById: 1, createdAt: -1 });

// 5. Unique index: slug
ProductSchema.index({ slug: 1 }, { unique: true });

// 6. Unique index: canonicalDomain
ProductSchema.index({ canonicalDomain: 1 }, { unique: true });

// 7. Full-text search index with weighted fields
ProductSchema.index(
  { name: 'text', tagline: 'text', description: 'text' },
  {
    weights: {
      name: 10,
      tagline: 5,
      description: 1,
    },
    name: 'ProductTextSearchIndex',
  }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
