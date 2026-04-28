import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import type { IUser } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'client';
  name: string;
  iat?: number;
  exp?: number;
}

export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies as fallback
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  return null;
}

export async function getCurrentUser(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      console.log('⚠️  No token found in request');
      return null;
    }

    const payload = verifyToken(token);
    console.log('✅ Token verified for user:', payload.email, 'Role:', payload.role);
    return payload;
  } catch (error) {
    console.log('❌ Token verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export function isAuthorized(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// Role-based permissions
export const PERMISSIONS = {
  ADMIN: ['read', 'write', 'delete', 'manage_users', 'view_all_tasks', 'manage_tasks'],
  USER: ['read', 'write_own_tasks', 'update_task_progress'],
  CLIENT: ['read_own_tasks', 'view_reports']
} as const;

export function hasPermission(userRole: string, permission: string): boolean {
  switch (userRole) {
    case 'admin':
      return PERMISSIONS.ADMIN.includes(permission as any);
    case 'user':
      return PERMISSIONS.USER.includes(permission as any);
    case 'client':
      return PERMISSIONS.CLIENT.includes(permission as any);
    default:
      return false;
  }
}