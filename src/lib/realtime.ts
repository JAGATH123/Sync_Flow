interface RealtimeEvent {
  type: 'task_created' | 'task_updated' | 'broadcast_sent' | 'user_status_changed';
  data: any;
  timestamp: string;
  userId?: string;
}

class RealtimeManager {
  private listeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();
  private connected: boolean = false;

  emit(type: RealtimeEvent['type'], data: any, userId?: string) {
    const event: RealtimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId
    };

    // Broadcast to all listeners of this event type
    const typeListeners = this.listeners.get(type) || [];
    typeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in realtime listener:', error);
      }
    });

    // Also broadcast to 'all' listeners
    const allListeners = this.listeners.get('all') || [];
    allListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in realtime listener:', error);
      }
    });

    // Store in sessionStorage for cross-tab sync
    this.storeEvent(event);
  }

  on(eventType: string, callback: (event: RealtimeEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private storeEvent(event: RealtimeEvent) {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return; // Skip storage on server side
      }

      const existingEvents = JSON.parse(localStorage.getItem('realtime_events') || '[]');
      const events = [...existingEvents, event].slice(-50); // Keep only last 50 events
      localStorage.setItem('realtime_events', JSON.stringify(events));

      // Broadcast using BroadcastChannel API for same-origin cross-tab communication
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('syncflow_realtime');
        channel.postMessage(event);
        channel.close();
      }

      // Also trigger storage event as fallback
      window.dispatchEvent(new Event('realtime_event'));
    } catch (error) {
      console.error('Error storing realtime event:', error);
    }
  }

  getRecentEvents(type?: string): RealtimeEvent[] {
    try {
      const events = JSON.parse(localStorage.getItem('realtime_events') || '[]');
      return type ? events.filter((e: RealtimeEvent) => e.type === type) : events;
    } catch (error) {
      console.error('Error getting recent events:', error);
      return [];
    }
  }

  initialize() {
    if (this.connected) return;

    // Listen for BroadcastChannel messages (cross-tab sync)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('syncflow_realtime');
      channel.addEventListener('message', (event) => {
        if (event.data) {
          console.log('BroadcastChannel message received:', event.data);
          this.notifyListeners(event.data);
        }
      });
    }

    // Listen for storage changes (fallback for cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'realtime_events' && e.newValue) {
        try {
          const events = JSON.parse(e.newValue);
          const latestEvent = events[events.length - 1];
          if (latestEvent) {
            console.log('Storage event received:', latestEvent);
            this.notifyListeners(latestEvent);
          }
        } catch (error) {
          console.error('Error processing storage event:', error);
        }
      }
    });

    // Listen for custom realtime events within the same tab
    window.addEventListener('realtime_event', () => {
      const events = this.getRecentEvents();
      const latestEvent = events[events.length - 1];
      if (latestEvent) {
        console.log('Custom realtime event received:', latestEvent);
      }
    });

    this.connected = true;
  }

  private notifyListeners(event: RealtimeEvent) {
    const typeListeners = this.listeners.get(event.type) || [];
    typeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in realtime listener:', error);
      }
    });

    const allListeners = this.listeners.get('all') || [];
    allListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in realtime listener:', error);
      }
    });
  }

  disconnect() {
    this.listeners.clear();
    this.connected = false;
  }
}

// Global instance
export const realtimeManager = new RealtimeManager();

// Auto-initialize
if (typeof window !== 'undefined') {
  realtimeManager.initialize();
}

// Helper functions for common operations
export const emitTaskCreated = (task: any) => {
  realtimeManager.emit('task_created', task);
};

export const emitTaskUpdated = (task: any) => {
  realtimeManager.emit('task_updated', task);
};

export const emitBroadcastSent = (broadcast: any) => {
  realtimeManager.emit('broadcast_sent', broadcast);
};

export const emitUserStatusChanged = (userId: string, status: string) => {
  realtimeManager.emit('user_status_changed', { userId, status }, userId);
};

// Hook for React components
export const useRealtime = (eventType: string | 'all', callback: (event: RealtimeEvent) => void) => {
  if (typeof window === 'undefined') return () => {};

  return realtimeManager.on(eventType, callback);
};