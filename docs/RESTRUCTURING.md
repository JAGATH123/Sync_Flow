# Project Restructuring Documentation

## Overview
This document outlines the complete restructuring of the SyncFlow project for better maintainability, scalability, and organization.

## New Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth route group
│   │   └── login/
│   ├── (dashboard)/             # Protected route group
│   │   ├── admin/
│   │   ├── user/
│   │   └── client/
│   ├── api/                     # API routes (unchanged)
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── users/
│   │   ├── broadcasts/
│   │   ├── notifications/
│   │   ├── projects/
│   │   ├── upload/
│   │   └── user/profile/
│   ├── task/[id]/
│   ├── share/[id]/
│   ├── performance/[employeeName]/
│   ├── layout.tsx
│   └── page.tsx
│
├── features/                    # Feature-based organization ⭐
│   ├── auth/
│   │   ├── components/
│   │   │   ├── auth-wrapper.tsx
│   │   │   └── login-page.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── utils/
│   │   │   └── auth.utils.ts
│   │   └── index.ts
│   │
│   ├── tasks/
│   │   ├── components/
│   │   │   ├── task-card.tsx
│   │   │   ├── task-management-page.tsx
│   │   │   ├── task-flow-page.tsx
│   │   │   └── create-task-dialog.tsx
│   │   └── index.ts
│   │
│   ├── broadcasting/
│   │   ├── components/
│   │   │   ├── broadcasting-page.tsx
│   │   │   └── broadcast-messages.tsx
│   │   └── index.ts
│   │
│   ├── reports/
│   │   ├── components/
│   │   │   ├── reports-page.tsx
│   │   │   └── report-card-page.tsx
│   │   └── index.ts
│   │
│   ├── team/
│   │   ├── components/
│   │   │   ├── my-team-page.tsx
│   │   │   ├── add-vertex-dialog.tsx
│   │   │   └── delete-vertex-dialog.tsx
│   │   └── index.ts
│   │
│   └── performance/
│       ├── components/
│       │   └── employee-performance-page.tsx
│       └── index.ts
│
├── components/                  # Shared components
│   ├── ui/                     # ShadCN UI components
│   ├── layout/                 # Layout components
│   │   ├── admin-dashboard.tsx
│   │   ├── user-dashboard.tsx
│   │   ├── client-dashboard.tsx
│   │   ├── clock.tsx
│   │   ├── user-menu.tsx
│   │   ├── user-settings-dialog.tsx
│   │   ├── live-users-indicator.tsx
│   │   ├── notifications.tsx
│   │   └── index.ts
│   └── shared/                 # Reusable business components
│       ├── cost-estimation.tsx
│       ├── manual-cost-table.tsx
│       ├── image-upload.tsx
│       ├── user-switcher.tsx
│       ├── overview-page.tsx
│       ├── dashboard-page.tsx
│       ├── create-project-dialog.tsx
│       └── index.ts
│
├── services/                   # Business logic layer ⭐
│   ├── task.service.ts
│   ├── user.service.ts
│   ├── broadcast.service.ts
│   └── index.ts
│
├── lib/                        # Utilities & configs
│   ├── api/                    # API client helpers
│   ├── constants/              # App constants ⭐
│   │   ├── app.constants.ts
│   │   ├── task.constants.ts
│   │   ├── user.constants.ts
│   │   └── index.ts
│   ├── validations/            # Zod schemas (future)
│   ├── auth.ts
│   ├── database.ts
│   ├── realtime.ts
│   ├── mock-data.ts
│   └── utils.ts
│
├── types/                      # TypeScript types ⭐
│   └── index.ts
│
├── models/                     # Mongoose models
│   ├── User.ts
│   ├── Task.ts
│   ├── Broadcast.ts
│   ├── Notification.ts
│   └── Project.ts
│
├── contexts/                   # React contexts (legacy)
│   └── AuthContext.tsx (moved to features/auth)
│
├── hooks/                      # Custom hooks
│   ├── use-toast.ts
│   └── use-mobile.tsx
│
├── ai/                         # AI/Genkit features
│   ├── genkit.ts
│   └── dev.ts
│
├── scripts/                    # Build & DB scripts
│   ├── init-db.ts
│   ├── check-users.ts
│   └── create-admin.js
│
└── middleware.ts

root/
├── docs/                       # Documentation ⭐
│   ├── ARCHITECTURE.md
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── FLOWCHARTS.md
│   ├── DEPLOYMENT-PIPELINE.md
│   ├── WORKFLOW-DIAGRAM.md
│   └── RESTRUCTURING.md (this file)
│
├── public/                     # Static assets
├── scripts/                    # Root-level scripts
│   └── init-db.js
│
├── .env.local
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json (updated)
├── postcss.config.mjs
├── components.json
├── package.json
└── README.md
```

## Key Changes

### 1. Feature-Based Organization
- Moved from flat component structure to feature-based modules
- Each feature contains its own components, hooks, services, and utilities
- Better encapsulation and easier to locate related code

### 2. Service Layer
- Created dedicated service classes for API interactions
- Centralized business logic
- Easier testing and mocking

### 3. Type System
- Moved types from `lib/types.ts` to dedicated `types/` folder
- Cleaner separation of concerns

### 4. Constants
- Extracted all constants to `lib/constants/`
- Organized by domain (app, task, user)
- Easier to maintain and update

### 5. Route Groups
- Used Next.js 15 route groups `(auth)` and `(dashboard)`
- Better route organization without affecting URLs
- Easier to apply layout-specific logic

### 6. Documentation
- Moved all `.md` files to `docs/` folder
- Cleaner root directory

### 7. Barrel Exports
- Added `index.ts` files for each feature
- Simplified imports throughout the app

## Import Path Updates

Old:
```typescript
import { Task } from '@/lib/types';
import { AdminDashboard } from '@/components/admin-dashboard';
import { TaskCard } from '@/components/task-card';
```

New:
```typescript
import { Task } from '@/types';
import { AdminDashboard } from '@/components/layout';
import { TaskCard } from '@/features/tasks';
```

## Benefits

1. **Maintainability**: Easier to find and update related code
2. **Scalability**: Can add new features without cluttering existing structure
3. **Testability**: Service layer makes testing easier
4. **Team Collaboration**: Clear boundaries between features
5. **Code Reusability**: Shared components clearly separated from feature-specific ones
6. **Type Safety**: Improved with dedicated types folder
7. **Performance**: Better code splitting with feature-based organization

## Migration Status

✅ Directory structure created
✅ Types moved to `src/types/`
✅ Constants extracted to `src/lib/constants/`
✅ Service layer created in `src/services/`
✅ Components organized by feature in `src/features/`
✅ Layout components moved to `src/components/layout/`
✅ Shared components moved to `src/components/shared/`
✅ Documentation moved to `docs/`
✅ Barrel exports created
✅ Route groups created
⏳ Import paths need updating (next step)
⏳ Testing required

## Next Steps

1. Update all import statements throughout the codebase
2. Remove old duplicate files
3. Run TypeScript compiler to catch any issues
4. Test all features
5. Update documentation with new import patterns

## Notes

- Original files are still present in `src/components/` to maintain backwards compatibility during migration
- Once all imports are updated and tested, old files can be removed
- Service layer can be expanded with more business logic over time
- Consider adding validation schemas in `lib/validations/` using Zod
