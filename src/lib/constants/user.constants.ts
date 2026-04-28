import { Vertices } from '@/types';

export const VERTICES: Vertices[] = [
  'CMIS',
  'LOF',
  'TRI',
  'TRG',
  'VB World',
  'CMG',
  'Jahangir',
  'LOF Curriculum'
];

export const USER_ROLES = {
  ADMIN: 'admin' as const,
  USER: 'user' as const,
  CLIENT: 'client' as const,
  SYSTEM: 'system' as const,
};
