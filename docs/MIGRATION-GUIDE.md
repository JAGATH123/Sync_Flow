# Migration Guide - Project Restructuring

## Overview
This guide helps you update import paths after the project restructuring.

## Import Path Changes

### Types
```typescript
// ❌ Before
import { Task, User, TaskStatus } from '@/lib/types';

// ✅ After
import { Task, User, TaskStatus } from '@/types';
```

### Constants
```typescript
// ❌ Before
import { WORK_TYPES, TASK_STATUSES, COST_RATES } from '@/lib/types';

// ✅ After
import { WORK_TYPES, TASK_STATUSES } from '@/lib/constants/task.constants';
import { COST_RATES } from '@/lib/constants';
import { USER_ROLES, VERTICES } from '@/lib/constants/user.constants';
import { API_ROUTES, DASHBOARD_ROUTES } from '@/lib/constants/app.constants';
```

### Components by Feature
```typescript
// ❌ Before
import { TaskCard } from '@/components/task-card';
import { TaskManagementPage } from '@/components/task-management-page';
import { CreateTaskDialog } from '@/components/create-task-dialog';

// ✅ After
import { TaskCard, TaskManagementPage, CreateTaskDialog } from '@/features/tasks';

// ❌ Before
import { BroadcastingPage } from '@/components/broadcasting-page';
import { BroadcastMessages } from '@/components/broadcast-messages';

// ✅ After
import { BroadcastingPage, BroadcastMessages } from '@/features/broadcasting';

// ❌ Before
import { ReportsPage } from '@/components/reports-page';

// ✅ After
import { ReportsPage } from '@/features/reports';

// ❌ Before
import { MyTeamPage } from '@/components/my-team-page';
import { AddVertexDialog, DeleteVertexDialog } from '@/components/...';

// ✅ After
import { MyTeamPage, AddVertexDialog, DeleteVertexDialog } from '@/features/team';

// ❌ Before
import { EmployeePerformancePage } from '@/components/employee-performance-page';

// ✅ After
import { EmployeePerformancePage } from '@/features/performance';
```

### Layout Components
```typescript
// ❌ Before
import { AdminDashboard } from '@/components/admin-dashboard';
import { UserDashboard } from '@/components/user-dashboard';
import { Clock } from '@/components/clock';
import { UserMenu } from '@/components/user-menu';

// ✅ After
import { AdminDashboard, UserDashboard, Clock, UserMenu } from '@/components/layout';
```

### Shared Components
```typescript
// ❌ Before
import { CostEstimation } from '@/components/cost-estimation';
import { OverviewPage } from '@/components/overview-page';
import { DashboardPage } from '@/components/dashboard-page';

// ✅ After
import { CostEstimation, OverviewPage, DashboardPage } from '@/components/shared';
```

### Auth Components & Context
```typescript
// ❌ Before
import { AuthWrapper } from '@/components/auth-wrapper';
import { AuthContext, useAuth } from '@/contexts/AuthContext';

// ✅ After
import { AuthWrapper, AuthContext, useAuth } from '@/features/auth';
```

### Services (NEW!)
```typescript
// ✅ New Service Layer
import { TaskService } from '@/services/task.service';
import { UserService } from '@/services/user.service';
import { BroadcastService } from '@/services/broadcast.service';

// Or use barrel export
import { TaskService, UserService, BroadcastService } from '@/services';

// Example usage:
const tasks = await TaskService.getAllTasks();
const task = await TaskService.getTaskById(id);
await TaskService.createTask(newTask);
await TaskService.updateTask(id, updates);
```

## Component-Specific Updates

### Files that need import updates:

1. **src/components/layout/admin-dashboard.tsx**
   - Update imports from `../` to feature-based paths
   - Update UI imports to `../ui/...`

2. **src/components/layout/user-dashboard.tsx**
   - Update imports from `./` to feature-based paths
   - Update UI imports to `../ui/...`

3. **src/components/layout/client-dashboard.tsx**
   - Update imports from `./` to feature-based paths
   - Update UI imports to `../ui/...`

4. **All feature components in src/features/**
   - Update type imports from `@/lib/types` to `@/types`
   - Update UI component imports to `@/components/ui/...`

## Relative vs Absolute Imports

### For files in src/features/
```typescript
// ✅ Use absolute imports for cross-feature dependencies
import { TaskCard } from '@/features/tasks';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';

// ✅ Use relative imports within the same feature
import { TaskDialog } from './task-dialog';
import { useTaskForm } from '../hooks/useTaskForm';
```

### For files in src/components/layout/
```typescript
// ✅ Use absolute imports
import { Card } from '@/components/ui/card';
import { Task } from '@/types';
import { TaskService } from '@/services';

// ✅ Use relative for other layout components
import { Clock } from './clock';
```

## Common Patterns

### Old Pattern
```typescript
import { Task, User, TaskStatus, WORK_TYPES } from '@/lib/types';
import { TaskCard } from '@/components/task-card';
import { AdminDashboard } from '@/components/admin-dashboard';
import { Button } from '@/components/ui/button';
```

### New Pattern
```typescript
import { Task, User, TaskStatus } from '@/types';
import { WORK_TYPES } from '@/lib/constants';
import { TaskCard } from '@/features/tasks';
import { AdminDashboard } from '@/components/layout';
import { Button } from '@/components/ui/button';
```

## Step-by-Step Migration for Each File

1. **Identify imports** that reference old paths
2. **Check the source file location** in the new structure
3. **Update import path** according to patterns above
4. **Test the component** to ensure it still works

## Quick Reference Table

| Old Import | New Import |
|------------|------------|
| `@/lib/types` | `@/types` |
| `@/components/task-*` | `@/features/tasks` |
| `@/components/broadcast-*` | `@/features/broadcasting` |
| `@/components/report-*` | `@/features/reports` |
| `@/components/my-team-*` | `@/features/team` |
| `@/components/employee-performance-*` | `@/features/performance` |
| `@/components/admin-dashboard` | `@/components/layout` |
| `@/components/user-dashboard` | `@/components/layout` |
| `@/components/clock` | `@/components/layout` |
| `@/components/cost-estimation` | `@/components/shared` |
| `@/contexts/AuthContext` | `@/features/auth` |

## Testing After Migration

```bash
# 1. Type check
npm run typecheck

# 2. Build
npm run build

# 3. Dev server
npm run dev

# 4. Check for import errors in browser console
```

## Troubleshooting

### Error: Cannot find module
- Check if file exists in new location
- Verify tsconfig.json path mappings are correct
- Clear `.next` cache: `rm -rf .next`

### Error: Type X is not assignable
- Ensure you're importing from `@/types` not `@/lib/types`
- Check if type definitions are complete in `src/types/index.ts`

### Error: Module has no exported member
- Check barrel export (`index.ts`) includes the export
- Verify the component exports are correct

## Notes

- Original files still exist in `src/components/` during migration
- Once all imports are updated and tested, old files can be removed
- Services layer is optional but recommended for API calls
- Barrel exports make imports cleaner but are optional

## Next Steps After Migration

1. Remove duplicate files from `src/components/`
2. Add validation schemas in `src/lib/validations/`
3. Create API client helpers in `src/lib/api/`
4. Add unit tests in `tests/` folder
5. Update documentation with examples
