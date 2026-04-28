import mongoose, { Document, Schema } from 'mongoose';

export interface IBroadcast extends Document {
  _id: string;
  title: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdBy: string;
  createdByName: string;
  createdDate: Date;
  targetUsers?: string[];
  readBy?: string[];
  vertex?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  createdBy: {
    type: String,
    required: [true, 'Creator ID is required']
  },
  createdByName: {
    type: String,
    required: [true, 'Creator name is required']
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  targetUsers: {
    type: [String],
    default: []
  },
  readBy: {
    type: [String],
    default: []
  },
  vertex: {
    type: String,
    trim: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
BroadcastSchema.index({ category: 1 });
BroadcastSchema.index({ vertex: 1 });
BroadcastSchema.index({ createdBy: 1 });
BroadcastSchema.index({ createdDate: -1 });
BroadcastSchema.index({ isArchived: 1 });

const Broadcast = mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema);

export default Broadcast;
