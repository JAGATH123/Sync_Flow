

export type Vertices = string;
export type UserRole = 'admin' | 'user' | 'client';
export type TaskStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Review' | 'Delivered';
export type WorkType = 'Design' | 'Development' | 'QA' | 'Marketing';
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type ReviewStatus = 'Manager Review' | 'Creative Review' | 'Client Review' | 'Delivered';
export type TaskCategory = string;


export const WORK_TYPES: WorkType[] = ['Design', 'Development', 'QA', 'Marketing'];
export const TASK_STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'On Hold', 'Review'];
export const TASK_PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low'];
export const REVIEW_STATUSES: ReviewStatus[] = ['Manager Review', 'Creative Review', 'Client Review', 'Delivered'];


// Represents the cost estimation data, mapping work type to hourly rate.
export const COST_RATES: Record<WorkType, number> = {
  'Design': 85,
  'Development': 85,
  'QA': 85,
  'Marketing': 85,
};


export interface User {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  empId?: string;
  designation?: string;
  vertex?: string;
  profileImage?: string;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMember {
    name: string;
    email: string;
    role: UserRole;
    empId: string;
    designation: string;
    profileImage?: string;
}

export interface ClientStakeholder {
  id: string;
  name: string;
  email: string;
  vertex: Vertices;
  designation: string;
}

export interface Task {
  id: string;
  _id?: string;
  name: string;
  assignedTo: string;
  assignedToName?: string;
  assigneeEmail?: string;
  status: TaskStatus;
  progress: number; // Percentage completion
  startDate: string;
  endDate: string;
  createdDate: string;
  client: string;
  clientEmail?: string;
  vertex: Vertices;
  typeOfWork: WorkType;
  category: TaskCategory;
  workingHours: number;
  actualWorkingHours?: number;
  estimatedCost?: number;
  priority: TaskPriority;
  completionDate?: string;
  reviewStatus?: ReviewStatus;
  remarks?: string;
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
  client?: string;
  vertex?: string;
  startDate?: string;
  endDate?: string;
  status?: TaskStatus;
  typeOfWork?: WorkType;
  workingHours?: number;
}

export interface CostEstimationItem {
  id: string;
  product: string;
  quantity: number;
  rangeFrom: number;
  rangeTo: number;
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}
