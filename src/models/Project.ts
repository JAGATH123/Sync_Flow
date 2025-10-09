import mongoose, { Document, Schema } from 'mongoose';
import type { TaskStatus, WorkType, Vertices } from '@/lib/types';

export interface IProject extends Document {
  _id: string;
  name: string;
  description?: string;
  tasks: mongoose.Types.ObjectId[];
  client?: string;
  clientId?: mongoose.Types.ObjectId;
  vertex?: Vertices;
  startDate?: Date;
  endDate?: Date;
  status?: TaskStatus;
  typeOfWork?: WorkType;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  client: {
    type: String,
    trim: true,
    maxlength: [200, 'Client name cannot exceed 200 characters']
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  vertex: {
    type: String,
    enum: ['CMIS', 'LOF', 'TRI', 'TRG', 'VB World', 'CMG', 'Jahangir', 'LOF Curriculum']
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: IProject, value: Date) {
        return !this.startDate || !value || value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'On Hold', 'Delivered'],
    default: 'Not Started'
  },
  typeOfWork: {
    type: String,
    enum: ['Design', 'Development', 'QA', 'Marketing']
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  },
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ vertex: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ isArchived: 1 });
ProjectSchema.index({ 'name': 'text', 'description': 'text', 'client': 'text' }); // Text search

// Prevent duplicate model compilation
const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;