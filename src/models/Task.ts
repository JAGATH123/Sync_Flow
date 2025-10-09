import mongoose, { Document, Schema } from 'mongoose';
import type { TaskStatus, WorkType, TaskPriority, ReviewStatus, Vertices } from '@/lib/types';

export interface ITask extends Document {
  _id: string;
  name: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string; // Denormalized for easier queries
  assigneeEmail: string;
  status: TaskStatus;
  progress: number;
  startDate: Date;
  endDate: Date;
  createdDate: Date;
  client: string;
  clientEmail?: string;
  clientId?: mongoose.Types.ObjectId;
  vertex: Vertices;
  typeOfWork: WorkType;
  category: string;
  workingHours: number;
  actualWorkingHours?: number;
  priority: TaskPriority;
  completionDate?: Date;
  reviewStatus?: ReviewStatus;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true,
    maxlength: [500, 'Task name cannot exceed 500 characters']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned user is required']
  },
  assignedToName: {
    type: String,
    required: [true, 'Assigned user name is required'],
    trim: true
  },
  assigneeEmail: {
    type: String,
    required: [true, 'Assignee email is required'],
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'On Hold', 'Delivered'],
    required: [true, 'Status is required'],
    default: 'Not Started'
  },
  progress: {
    type: Number,
    required: [true, 'Progress is required'],
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: ITask, value: Date) {
        return value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  createdDate: {
    type: Date,
    required: [true, 'Created date is required'],
    default: Date.now
  },
  client: {
    type: String,
    required: [true, 'Client is required'],
    trim: true,
    maxlength: [200, 'Client name cannot exceed 200 characters']
  },
  clientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  vertex: {
    type: String,
    enum: ['CMIS', 'LOF', 'TRI', 'TRG', 'VB World', 'CMG', 'Jahangir', 'LOF Curriculum'],
    required: [true, 'Vertex is required']
  },
  typeOfWork: {
    type: String,
    enum: ['Design', 'Development', 'QA', 'Marketing'],
    required: [true, 'Type of work is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  workingHours: {
    type: Number,
    required: [true, 'Working hours is required'],
    min: [0, 'Working hours cannot be negative']
  },
  actualWorkingHours: {
    type: Number,
    min: [0, 'Actual working hours cannot be negative']
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: [true, 'Priority is required'],
    default: 'Medium'
  },
  completionDate: {
    type: Date
  },
  reviewStatus: {
    type: String,
    enum: ['Manager review', 'Creative review', 'Vertices Review', 'Signed off']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters']
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
  },
  archivedAt: {
    type: Date
  },
  archivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ vertex: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ startDate: 1, endDate: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ clientId: 1 });
TaskSchema.index({ isArchived: 1 });
TaskSchema.index({ 'name': 'text', 'client': 'text', 'category': 'text' }); // Text search

// Middleware to update completionDate when status changes to 'Delivered'
TaskSchema.pre<ITask>('save', function(next) {
  if (this.isModified('status') && this.status === 'Delivered' && !this.completionDate) {
    this.completionDate = new Date();
  }

  // Auto-update progress based on status
  if (this.isModified('status')) {
    switch (this.status) {
      case 'Not Started':
        this.progress = 0;
        break;
      case 'Delivered':
        this.progress = 100;
        break;
      // Don't auto-update for 'In Progress' and 'On Hold' to allow manual control
    }
  }

  next();
});

// Prevent duplicate model compilation
const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;