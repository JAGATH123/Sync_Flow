/**
 * Auth utilities — re-exports from `@/lib/auth` so we have a single source
 * of truth for JWT helpers. Previously this file duplicated lib/auth.ts and
 * imported the Mongoose IUser type; now both files share the same Prisma-
 * agnostic implementation.
 */
export {
  generateToken,
  verifyToken,
  extractTokenFromRequest,
  getCurrentUser,
  isAuthorized,
  hasPermission,
  PERMISSIONS,
} from '@/lib/auth';
export type { JWTPayload } from '@/lib/auth';
