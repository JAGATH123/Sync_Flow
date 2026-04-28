# SyncFlow - Project Structure

## 📁 Complete Project Structure

```
sync-flow/
├── 📂 src/
│   ├── 📂 app/                           # Next.js 15 App Router
│   │   ├── 📂 (auth)/                   # Auth route group (doesn't affect URL)
│   │   │   └── 📂 login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── 📂 (dashboard)/              # Dashboard route group
│   │   │   ├── 📂 admin/               # /admin route
│   │   │   │   └── page.tsx
│   │   │   ├── 📂 user/                # /user route
│   │   │   │   └── page.tsx
│   │   │   └── 📂 client/              # /client route
│   │   │       └── page.tsx
│   │   │
│   │   ├── 📂 api/                      # API Routes
│   │   │   ├── 📂 auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── 📂 broadcasts/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 notifications/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 projects/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 tasks/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 upload/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 user/
│   │   │   │   └── 📂 profile/
│   │   │   │       └── route.ts
│   │   │   └── 📂 users/
│   │   │       └── route.ts
│   │   │
│   │   ├── 📂 task/[id]/               # Dynamic task detail route
│   │   │   └── page.tsx
│   │   ├── 📂 share/[id]/              # Dynamic share route
│   │   │   └── page.tsx
│   │   ├── 📂 performance/[employeeName]/
│   │   │   └── page.tsx
│   │   │
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Home page
│   │   ├── globals.css                  # Global styles
│   │   └── favicon.ico
│   │
│   ├── 📂 features/                     # ⭐ Feature-based modules
│   │   │
│   │   ├── 📂 auth/                     # Authentication feature
│   │   │   ├── 📂 components/
│   │   │   │   ├── auth-wrapper.tsx
│   │   │   │   └── login-page.tsx
│   │   │   ├── 📂 contexts/
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── 📂 utils/
│   │   │   │   └── auth.utils.ts
│   │   │   └── index.ts                # Barrel export
│   │   │
│   │   ├── 📂 tasks/                    # Task management feature
│   │   │   ├── 📂 components/
│   │   │   │   ├── task-card.tsx
│   │   │   │   ├── task-management-page.tsx
│   │   │   │   ├── task-flow-page.tsx
│   │   │   │   └── create-task-dialog.tsx
│   │   │   ├── 📂 hooks/
│   │   │   ├── 📂 services/
│   │   │   └── index.ts
│   │   │
│   │   ├── 📂 broadcasting/             # Broadcasting feature
│   │   │   ├── 📂 components/
│   │   │   │   ├── broadcasting-page.tsx
│   │   │   │   └── broadcast-messages.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📂 reports/                  # Reports feature
│   │   │   ├── 📂 components/
│   │   │   │   ├── reports-page.tsx
│   │   │   │   └── report-card-page.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── 📂 team/                     # Team management feature
│   │   │   ├── 📂 components/
│   │   │   │   ├── my-team-page.tsx
│   │   │   │   ├── add-vertex-dialog.tsx
│   │   │   │   └── delete-vertex-dialog.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── 📂 performance/              # Performance tracking feature
│   │       ├── 📂 components/
│   │       │   └── employee-performance-page.tsx
│   │       └── index.ts
│   │
│   ├── 📂 components/                   # Shared components
│   │   │
│   │   ├── 📂 ui/                       # ShadCN UI components (40+ files)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (36 more)
│   │   │
│   │   ├── 📂 layout/                   # Layout components
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── user-dashboard.tsx
│   │   │   ├── client-dashboard.tsx
│   │   │   ├── clock.tsx
│   │   │   ├── user-menu.tsx
│   │   │   ├── user-settings-dialog.tsx
│   │   │   ├── live-users-indicator.tsx
│   │   │   ├── notifications.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── 📂 shared/                   # Reusable business components
│   │       ├── cost-estimation.tsx
│   │       ├── manual-cost-table.tsx
│   │       ├── image-upload.tsx
│   │       ├── user-switcher.tsx
│   │       ├── overview-page.tsx
│   │       ├── dashboard-page.tsx
│   │       ├── create-project-dialog.tsx
│   │       └── index.ts
│   │
│   ├── 📂 services/                     # ⭐ Business logic layer
│   │   ├── task.service.ts              # Task-related API calls
│   │   ├── user.service.ts              # User-related API calls
│   │   ├── broadcast.service.ts         # Broadcast-related API calls
│   │   └── index.ts
│   │
│   ├── 📂 lib/                          # Utilities & configurations
│   │   ├── 📂 api/                      # API client helpers (future)
│   │   ├── 📂 constants/                # ⭐ Application constants
│   │   │   ├── app.constants.ts        # App-wide constants
│   │   │   ├── task.constants.ts       # Task-related constants
│   │   │   ├── user.constants.ts       # User-related constants
│   │   │   └── index.ts
│   │   ├── 📂 validations/              # Zod schemas (future)
│   │   ├── auth.ts                      # Auth utilities
│   │   ├── database.ts                  # Database connection
│   │   ├── realtime.ts                  # Real-time event system
│   │   ├── mock-data.ts                 # Mock data for testing
│   │   └── utils.ts                     # General utilities
│   │
│   ├── 📂 types/                        # ⭐ TypeScript type definitions
│   │   └── index.ts                     # All type exports
│   │
│   ├── 📂 models/                       # Mongoose models
│   │   ├── User.ts
│   │   ├── Task.ts
│   │   ├── Broadcast.ts
│   │   ├── Notification.ts
│   │   └── Project.ts
│   │
│   ├── 📂 contexts/                     # Legacy React contexts
│   │   └── AuthContext.tsx             # (moved to features/auth)
│   │
│   ├── 📂 hooks/                        # Custom React hooks
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   │
│   ├── 📂 ai/                           # AI/Genkit features
│   │   ├── genkit.ts
│   │   └── dev.ts
│   │
│   ├── 📂 scripts/                      # Database & utility scripts
│   │   ├── init-db.ts
│   │   ├── check-users.ts
│   │   └── create-admin.js
│   │
│   └── middleware.ts                    # Next.js middleware
│
├── 📂 docs/                             # ⭐ Documentation
│   ├── ARCHITECTURE.md                  # System architecture
│   ├── SYSTEM-ARCHITECTURE.md           # Detailed architecture
│   ├── FLOWCHARTS.md                    # Flow diagrams
│   ├── DEPLOYMENT-PIPELINE.md           # Deployment guide
│   ├── WORKFLOW-DIAGRAM.md              # Workflow documentation
│   ├── RESTRUCTURING.md                 # Restructuring details
│   ├── MIGRATION-GUIDE.md               # Import migration guide
│   └── blueprint.md
│
├── 📂 public/                           # Static assets
│   ├── logo_lof.png
│   ├── LOF_alternate.png
│   └── ...
│
├── 📂 scripts/                          # Root-level scripts
│   └── init-db.js
│
├── 📂 .claude/                          # Claude Code config
├── 📂 .git/                             # Git repository
├── 📂 .next/                            # Next.js build output
├── 📂 node_modules/                     # Dependencies
│
├── .env.local                           # Environment variables (local)
├── .env.example                         # Environment variables template
├── .gitignore                           # Git ignore rules
├── next.config.ts                       # Next.js configuration
├── tailwind.config.ts                   # Tailwind CSS configuration
├── tsconfig.json                        # TypeScript configuration ⭐ Updated
├── postcss.config.mjs                   # PostCSS configuration
├── components.json                      # ShadCN UI configuration
├── package.json                         # Dependencies & scripts
├── package-lock.json                    # Lock file
├── README.md                            # Project readme
└── PROJECT-STRUCTURE.md                 # This file
```

## 🎯 Key Improvements

### 1. **Feature-Based Organization** (`src/features/`)
- **Before**: 20+ components in flat `src/components/` folder
- **After**: Organized by feature domain (auth, tasks, broadcasting, reports, team, performance)
- **Benefit**: Related code is co-located, easier to find and maintain

### 2. **Service Layer** (`src/services/`)
- **Before**: API logic scattered in components
- **After**: Centralized service classes for business logic
- **Benefit**: Reusable, testable, single source of truth for API calls

### 3. **Type System** (`src/types/`)
- **Before**: Types mixed with constants in `src/lib/types.ts`
- **After**: Dedicated `src/types/` folder
- **Benefit**: Clear separation, easier imports

### 4. **Constants** (`src/lib/constants/`)
- **Before**: Constants mixed with types
- **After**: Organized by domain (app, task, user)
- **Benefit**: Easy to locate and update configuration values

### 5. **Route Groups** (`app/(auth)` and `app/(dashboard)`)
- **Before**: Flat route structure
- **After**: Logical grouping without affecting URLs
- **Benefit**: Shared layouts, better organization

### 6. **Documentation** (`docs/`)
- **Before**: 5 markdown files in root
- **After**: All docs in dedicated `docs/` folder
- **Benefit**: Cleaner root, easier to navigate

### 7. **Barrel Exports** (`index.ts` in each feature)
- **Before**: Individual component imports
- **After**: Clean barrel exports from features
- **Benefit**: Simplified imports, better encapsulation

## 📝 Import Examples

### Types
```typescript
import { Task, User, TaskStatus } from '@/types';
```

### Constants
```typescript
import { WORK_TYPES, TASK_STATUSES, COST_RATES } from '@/lib/constants';
```

### Feature Components
```typescript
import { TaskCard, TaskManagementPage } from '@/features/tasks';
import { BroadcastingPage } from '@/features/broadcasting';
import { ReportsPage } from '@/features/reports';
import { MyTeamPage } from '@/features/team';
```

### Layout Components
```typescript
import { AdminDashboard, Clock, UserMenu } from '@/components/layout';
```

### Shared Components
```typescript
import { CostEstimation, OverviewPage } from '@/components/shared';
```

### Services
```typescript
import { TaskService, UserService, BroadcastService } from '@/services';

// Usage
const tasks = await TaskService.getAllTasks();
await TaskService.createTask(newTask);
```

## 🔧 Configuration Updates

### `tsconfig.json`
Added path mappings for clean imports:
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/types": ["./src/types"],
    "@/components/*": ["./src/components/*"],
    "@/features/*": ["./src/features/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/services/*": ["./src/services/*"]
  }
}
```

## 📊 File Count Summary

```
Total TypeScript/TSX files: ~100
├── features/: 22 files
├── components/ui/: 40 files
├── components/layout/: 8 files
├── components/shared/: 7 files
├── app/api/: 13 routes
├── services/: 4 files
├── models/: 5 files
├── lib/: 8 files
└── types/: 1 file
```

## 🚀 Next Steps

1. ✅ **Structure Created**
2. ✅ **Types Fixed** (Added 'Delivered' status)
3. ✅ **Services Created**
4. ⏳ **Update Imports** (Use migration guide in `docs/MIGRATION-GUIDE.md`)
5. ⏳ **Test Application**
6. ⏳ **Remove Old Duplicates**

## 📚 Documentation

- **[RESTRUCTURING.md](./docs/RESTRUCTURING.md)** - Complete restructuring details
- **[MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md)** - Step-by-step import migration
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture overview
- **[SYSTEM-ARCHITECTURE.md](./docs/SYSTEM-ARCHITECTURE.md)** - Detailed architecture

## ✨ Benefits

1. **Maintainability** ⬆️ - Easier to find and update code
2. **Scalability** ⬆️ - Can add features without clutter
3. **Testability** ⬆️ - Service layer enables easy mocking
4. **Developer Experience** ⬆️ - Clear boundaries and organization
5. **Code Reusability** ⬆️ - Shared components clearly separated
6. **Type Safety** ⬆️ - Improved with dedicated types folder
7. **Performance** ⬆️ - Better code splitting with features

---

**Generated**: November 26, 2025
**Version**: 1.0.0
**Status**: ✅ Structure Complete, ⏳ Migration In Progress
