import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScraperProduct {
  _id: Types.ObjectId;
  slug: string;
  canonicalDomain: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  submittedById: Types.ObjectId;
  categoryId?: Types.ObjectId;
  pricing: {
    model: string;
    startingPrice?: number;
    currency?: string;
  };
  media: {
    logoUrl?: string;
    bannerUrl?: string;
    screenshotUrls: string[];
  };
  status: string;
  initialVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScraperProductSchema = new Schema(
  {
    slug: { type: String, required: true },
    canonicalDomain: { type: String, required: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    websiteUrl: { type: String, required: true },
    submittedById: { type: Schema.Types.ObjectId, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    pricing: {
      model: { type: String, default: 'freemium' },
      startingPrice: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    media: {
      logoUrl: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
      screenshotUrls: { type: [String], default: [] },
    },
    status: { type: String, default: 'DRAFT', required: true },
    initialVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const ScraperCategorySchema = new Schema({
  slug: { type: String, required: true },
  name: { type: String, required: true },
});

export const ScraperProduct =
  mongoose.models.Product || mongoose.model<IScraperProduct>('Product', ScraperProductSchema);

export const ScraperCategory =
  mongoose.models.Category || mongoose.model('Category', ScraperCategorySchema);
