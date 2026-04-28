import { API_ROUTES } from '@/lib/constants';

export interface Broadcast {
  _id: string;
  title: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  createdDate: string;
  vertex?: string;
  readBy?: string[];
}

export class BroadcastService {
  static async getAllBroadcasts(): Promise<Broadcast[]> {
    const response = await fetch(API_ROUTES.BROADCASTS);
    if (!response.ok) throw new Error('Failed to fetch broadcasts');
    const data = await response.json();
    return data.broadcasts || [];
  }

  static async createBroadcast(broadcast: Partial<Broadcast>): Promise<Broadcast> {
    const response = await fetch(API_ROUTES.BROADCASTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broadcast),
    });
    if (!response.ok) throw new Error('Failed to create broadcast');
    const data = await response.json();
    return data.broadcast;
  }

  static async deleteBroadcast(id: string): Promise<void> {
    const response = await fetch(`${API_ROUTES.BROADCASTS}?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete broadcast');
  }

  static async markAsRead(id: string, userId: string): Promise<void> {
    // Implement mark as read logic
    const response = await fetch(`${API_ROUTES.BROADCASTS}?id=${id}&action=markRead`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to mark broadcast as read');
  }
}
