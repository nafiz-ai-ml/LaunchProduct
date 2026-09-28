import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISystemSettings {
  _id: Types.ObjectId;
  key: string;
  value: any;
  description?: string;
  updatedById?: Types.ObjectId;
  updatedAt: Date;
}

export type SystemSettingsDocument = ISystemSettings &
  Document<Types.ObjectId, object, ISystemSettings>;

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: {
      type: String,
      required: [true, 'System setting key identifier is required'],
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Setting value is required'],
      default: () => ({}),
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },
    updatedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index: unique lookup by setting configuration key
SystemSettingsSchema.index({ key: 1 }, { unique: true });

export const SystemSettings = mongoose.model<ISystemSettings>(
  'SystemSettings',
  SystemSettingsSchema
);

export default SystemSettings;
