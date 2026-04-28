# Quick Start Guide - After Restructuring

## ✅ What's Been Done

The project has been completely restructured with:
- ✅ Feature-based organization
- ✅ Service layer created
- ✅ Types consolidated
- ✅ Constants extracted
- ✅ Route groups implemented
- ✅ Old duplicate routes removed

## 🚀 Starting the Application

```bash
# 1. Clear Next.js cache
rm -rf .next

# 2. Install dependencies (if needed)
npm install

# 3. Start development server
npm run dev
```

The app will run on [http://localhost:3001](http://localhost:3001)

## 🔧 Current Status

### Working:
- ✅ Project structure reorganized
- ✅ Route groups created (no duplicate routes)
- ✅ Types fixed (added 'Delivered' status)
- ✅ Service layer implemented
- ✅ Documentation created

### Known Issues:
⚠️ **Import paths need updating** - Many components still import from old paths

## 📝 Import Issues to Fix

Most components still have old import paths like:
```typescript
// ❌ Old (will cause errors)
import { Task } from '@/lib/types';
import { TaskCard } from '@/components/task-card';
import { AdminDashboard } from '@/components/admin-dashboard';
```

These need to be updated to:
```typescript
// ✅ New (correct)
import { Task } from '@/types';
import { TaskCard } from '@/features/tasks';
import { AdminDashboard } from '@/components/layout';
```

## 🛠️ How to Fix Import Errors

When you see an error like:
```
Cannot find module '@/components/task-card'
```

1. **Find the component** in the new structure:
   - Check `src/features/` first
   - Then check `src/components/layout/`
   - Finally check `src/components/shared/`

2. **Update the import** using the migration guide:
   - See `docs/MIGRATION-GUIDE.md` for complete reference

3. **Use barrel exports** when available:
   ```typescript
   import { TaskCard, CreateTaskDialog } from '@/features/tasks';
   ```

## 📂 Quick Reference

### Find Components By Feature:

| Feature | Location | Import From |
|---------|----------|-------------|
| Tasks | `src/features/tasks/components/` | `@/features/tasks` |
| Broadcasting | `src/features/broadcasting/components/` | `@/features/broadcasting` |
| Reports | `src/features/reports/components/` | `@/features/reports` |
| Team | `src/features/team/components/` | `@/features/team` |
| Performance | `src/features/performance/components/` | `@/features/performance` |
| Auth | `src/features/auth/components/` | `@/features/auth` |

### Layout Components:

| Component | Location | Import From |
|-----------|----------|-------------|
| AdminDashboard | `src/components/layout/` | `@/components/layout` |
| UserDashboard | `src/components/layout/` | `@/components/layout` |
| ClientDashboard | `src/components/layout/` | `@/components/layout` |
| Clock | `src/components/layout/` | `@/components/layout` |
| UserMenu | `src/components/layout/` | `@/components/layout` |

### Types & Constants:

```typescript
// Types
import { Task, User, TaskStatus } from '@/types';

// Constants
import { TASK_STATUSES, WORK_TYPES, COST_RATES } from '@/lib/constants';
import { API_ROUTES, DASHBOARD_ROUTES } from '@/lib/constants';

// Services
import { TaskService, UserService } from '@/services';
```

## 🔍 Debugging Tips

### Error: "Cannot find module"
1. Check if file exists in new location
2. Update import path according to migration guide
3. Clear `.next` cache: `rm -rf .next`

### Error: "Type X is not assignable"
1. Ensure importing from `@/types` not `@/lib/types`
2. Check type definitions in `src/types/index.ts`

### Error: "Module has no exported member"
1. Check barrel export (`index.ts`) in feature folder
2. Verify component actually exports that member

## 📚 Documentation

- **PROJECT-STRUCTURE.md** - Complete structure overview
- **docs/RESTRUCTURING.md** - Detailed restructuring info
- **docs/MIGRATION-GUIDE.md** - Step-by-step import migration
- **docs/SYSTEM-ARCHITECTURE.md** - System architecture

## ⚡ Next Steps

1. **Start dev server** and note any import errors
2. **Fix imports one by one** using the migration guide
3. **Test each feature** as you fix it
4. **Remove old duplicate files** once all imports are updated

## 🎯 Priority Fixes

Start with these files (they're used everywhere):

1. `src/components/layout/admin-dashboard.tsx` - Fix imports to use new paths
2. `src/components/layout/user-dashboard.tsx` - Fix imports to use new paths
3. `src/components/layout/client-dashboard.tsx` - Fix imports to use new paths
4. `src/app/(dashboard)/*/page.tsx` - Update dashboard page imports

Once these core layout files are fixed, most pages will start working.

## 💡 Pro Tips

- Use VS Code's "Find and Replace" across files
- Search for `@/lib/types` and replace with `@/types`
- Search for `@/components/task-` and update to `@/features/tasks`
- Use TypeScript errors as a guide - they'll show you what needs updating

---

**Need help?** Check `docs/MIGRATION-GUIDE.md` for detailed examples!
