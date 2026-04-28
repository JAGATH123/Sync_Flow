import { Task } from '@/types';
import { API_ROUTES } from '@/lib/constants';

export class TaskService {
  static async getAllTasks(): Promise<Task[]> {
    const response = await fetch(API_ROUTES.TASKS);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const data = await response.json();
    return data.tasks || [];
  }

  static async getTaskById(id: string): Promise<Task> {
    const response = await fetch(`${API_ROUTES.TASKS}?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch task');
    const data = await response.json();
    return data.task;
  }

  static async createTask(task: Partial<Task>): Promise<Task> {
    const response = await fetch(API_ROUTES.TASKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to create task');
    const data = await response.json();
    return data.task;
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await fetch(API_ROUTES.TASKS, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!response.ok) throw new Error('Failed to update task');
    const data = await response.json();
    return data.task;
  }

  static async deleteTasks(ids: string[]): Promise<void> {
    const response = await fetch(`${API_ROUTES.TASKS}?ids=${ids.join(',')}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete tasks');
  }

  static async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(task => task.assignedTo === assigneeId);
  }

  static async getTasksByVertex(vertex: string): Promise<Task[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(task => task.vertex === vertex);
  }
}
