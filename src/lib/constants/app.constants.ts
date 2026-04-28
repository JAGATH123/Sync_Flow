export const APP_NAME = 'SyncFlow';
export const APP_VERSION = '1.0.0';

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },
  USERS: '/api/users',
  TASKS: '/api/tasks',
  BROADCASTS: '/api/broadcasts',
  NOTIFICATIONS: '/api/notifications',
  PROJECTS: '/api/projects',
  UPLOAD: '/api/upload',
  PROFILE: '/api/user/profile',
} as const;

export const DASHBOARD_ROUTES = {
  ADMIN: '/admin',
  USER: '/user',
  CLIENT: '/client',
} as const;

export const BROADCAST_CATEGORIES = [
  'Announcement',
  'Update',
  'General',
  'Alert'
] as const;

export const BROADCAST_PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical'
] as const;
