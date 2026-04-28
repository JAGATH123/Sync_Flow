import { WorkType, TaskStatus, TaskPriority, ReviewStatus } from '@/types';

export const WORK_TYPES: WorkType[] = ['Design', 'Development', 'QA', 'Marketing'];
export const TASK_STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'On Hold', 'Review', 'Delivered'];
export const TASK_PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low'];
export const REVIEW_STATUSES: ReviewStatus[] = ['Manager Review', 'Creative Review', 'Client Review', 'Delivered'];

// Represents the cost estimation data, mapping work type to hourly rate.
export const COST_RATES: Record<WorkType, number> = {
  'Design': 85,
  'Development': 85,
  'QA': 85,
  'Marketing': 85,
};
