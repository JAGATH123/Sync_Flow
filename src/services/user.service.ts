import { User, TeamMember } from '@/types';
import { API_ROUTES } from '@/lib/constants';

export class UserService {
  static async getAllUsers(): Promise<TeamMember[]> {
    const response = await fetch(API_ROUTES.USERS);
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    return data.users || [];
  }

  static async getUserById(id: string): Promise<TeamMember> {
    const response = await fetch(`${API_ROUTES.USERS}?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    const data = await response.json();
    return data.user;
  }

  static async createUser(user: Partial<TeamMember>): Promise<TeamMember> {
    const response = await fetch(API_ROUTES.USERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to create user');
    const data = await response.json();
    return data.user;
  }

  static async updateUser(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const response = await fetch(API_ROUTES.USERS, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!response.ok) throw new Error('Failed to update user');
    const data = await response.json();
    return data.user;
  }

  static async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_ROUTES.USERS}?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
  }

  static async updateProfile(updates: FormData): Promise<any> {
    const response = await fetch(API_ROUTES.PROFILE, {
      method: 'PUT',
      body: updates,
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return await response.json();
  }
}
