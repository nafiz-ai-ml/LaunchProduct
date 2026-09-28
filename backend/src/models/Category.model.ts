import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  description?: string;
  parentId?: Types.ObjectId;
  iconUrl?: string;
  sortOrder: number;
  productCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = ICategory & Document<Types.ObjectId, object, ICategory>;

const CategorySchema = new Schema<ICategory>(
  {
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'],
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: null,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    iconUrl: {
      type: String,
      trim: true,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
      required: true,
    },
    productCount: {
      type: Number,
      default: 0,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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
// 1. Unique index on slug
CategorySchema.index({ slug: 1 }, { unique: true });

// 2. Compound index for taxonomy trees & active listings
CategorySchema.index({ parentId: 1, isActive: 1 });

// 3. Index for display sort order
CategorySchema.index({ sortOrder: 1 });

// 8 MVP Categories Seed Constant
export interface IMvpCategorySeed {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export const MVP_CATEGORIES: IMvpCategorySeed[] = [
  {
    name: 'AI Tools',
    slug: 'ai-tools',
    description: 'Artificial intelligence applications, LLMs, and machine learning utilities',
    sortOrder: 1,
  },
  {
    name: 'AI Agents',
    slug: 'ai-agents',
    description: 'Autonomous agents, workflow bots, and agentic task execution engines',
    sortOrder: 2,
  },
  {
    name: 'SaaS',
    slug: 'saas',
    description: 'Software-as-a-service platforms, cloud applications, and B2B solutions',
    sortOrder: 3,
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'APIs, SDKs, CLIs, libraries, databases, and engineering infrastructure',
    sortOrder: 4,
  },
  {
    name: 'Productivity',
    slug: 'productivity',
    description: 'Time tracking, task management, note-taking, and personal workflows',
    sortOrder: 5,
  },
  {
    name: 'Marketing Tools',
    slug: 'marketing-tools',
    description: 'Email marketing, growth automation, lead generation, and social scheduling',
    sortOrder: 6,
  },
  {
    name: 'SEO Tools',
    slug: 'seo-tools',
    description: 'Keyword research, backlink monitors, SERP analysis, and site auditing',
    sortOrder: 7,
  },
  {
    name: 'Design Tools',
    slug: 'design-tools',
    description: 'UI kits, prototyping platforms, illustration libraries, and asset tools',
    sortOrder: 8,
  },
];

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
