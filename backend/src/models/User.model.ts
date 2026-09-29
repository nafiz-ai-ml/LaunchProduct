import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole } from '../shared/constants';

export interface IOAuthProvider {
  provider: 'google' | 'github';
  providerUserId: string;
  linkedAt: Date;
}

export interface IFounderProfile {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  githubHandle?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

export interface IUser {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  role: 'VISITOR' | 'HUNTER' | 'FOUNDER' | 'MODERATOR' | 'ADMIN';
  oauthProviders: IOAuthProvider[];
  founderProfile?: IFounderProfile;
  isBanned: boolean;
  banReason?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = IUser & Document<Types.ObjectId, object, IUser>;

const OAuthProviderSchema = new Schema<IOAuthProvider>(
  {
    provider: {
      type: String,
      enum: ['google', 'github'],
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const FounderProfileSchema = new Schema<IFounderProfile>(
  {
    displayName: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    twitterHandle: {
      type: String,
      trim: true,
      match: [/^@?[A-Za-z0-9_]{1,15}$/, 'Invalid Twitter/X handle format'],
    },
    githubHandle: {
      type: String,
      trim: true,
      maxlength: 39,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid RFC 5322 email address'],
    },
    passwordHash: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationCode: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.HUNTER,
      required: true,
    },
    oauthProviders: {
      type: [OAuthProviderSchema],
      default: [],
    },
    founderProfile: {
      type: FounderProfileSchema,
      default: () => ({}),
    },
    isBanned: {
      type: Boolean,
      default: false,
      required: true,
    },
    banReason: {
      type: String,
      maxlength: [500, 'Ban reason cannot exceed 500 characters'],
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

// Indexes
// 1. Unique email index (covered by schema definition + explicit definition)
UserSchema.index({ email: 1 }, { unique: true });

// 2. Role index for fast authorization queries
UserSchema.index({ role: 1 });

// 3. OAuth provider composite unique index (sparse to support users authenticated via magic links only)
UserSchema.index(
  { 'oauthProviders.provider': 1, 'oauthProviders.providerUserId': 1 },
  { unique: true, sparse: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
