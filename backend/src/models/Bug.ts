import { Schema, model, Document, Types } from 'mongoose';

export type BugSeverity = 'low' | 'med' | 'high';
export type BugStatus = 'open' | 'in-progress' | 'closed';

export interface IBug extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  imageKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BugSchema = new Schema<IBug>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Bug title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Bug description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    severity: {
      type: String,
      enum: {
        values: ['low', 'med', 'high'],
        message: '{VALUE} is not a valid severity level (must be low, med, or high)',
      },
      required: [true, 'Severity is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'closed'],
        message: '{VALUE} is not a valid status (must be open, in-progress, or closed)',
      },
      default: 'open',
    },
    imageKey: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

BugSchema.index({ userId: 1, createdAt: -1 });
BugSchema.index({ userId: 1, status: 1, createdAt: -1 });
BugSchema.index({ userId: 1, severity: 1, createdAt: -1 });
BugSchema.index({ title: 'text', description: 'text' }, { weights: { title: 3, description: 1 } });

export const Bug = model<IBug>('Bug', BugSchema);
