# SyncFlow - Complete System Architecture

## 📐 Role-Based System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYNCFLOW SYSTEM OVERVIEW                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                ┌─────────────────┐
                                │   USERS         │
                                │  (3 Roles)      │
                                └────────┬────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
            ┌───────────────┐    ┌───────────────┐   ┌───────────────┐
            │     ADMIN     │    │     USER      │   │    CLIENT     │
            │   Dashboard   │    │   Dashboard   │   │   Dashboard   │
            └───────┬───────┘    └───────┬───────┘   └───────┬───────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │   BROWSER (React 18)   │
                            │   Next.js 15.3.3       │
                            └────────────┬───────────┘
                                         │
                                    HTTPS/REST
                                         │
                            ┌────────────▼───────────┐
                            │   API ROUTES (Next.js) │
                            │   Port 9002            │
                            └────────────┬───────────┘
                                         │
                            ┌────────────▼───────────┐
                            │   MongoDB Database     │
                            │   localhost:27017      │
                            └────────────────────────┘
```

---

## 🎯 ADMIN DASHBOARD Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN ROLE ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Admin)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Component: src/components/admin-dashboard.tsx                               │
│  Route: /admin                                                               │
│  Auth: Requires role = 'admin'                                               │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          SIDEBAR NAVIGATION                          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  🏠 Overview          → overview-page.tsx                           │    │
│  │  📊 Dashboard         → dashboard-page.tsx                          │    │
│  │  ✓  Task Management   → task-management-page.tsx                    │    │
│  │  👥 My Team           → my-team-page.tsx                            │    │
│  │  📢 Broadcasting      → broadcasting-page.tsx                       │    │
│  │  📑 Reports           → reports-page.tsx                            │    │
│  │  📈 Performance       → employee-performance-page.tsx               │    │
│  │  💰 Cost Estimation   → cost-estimation.tsx                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          HEADER COMPONENTS                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  🕐 Clock (top-left, black text)                                    │    │
│  │  👤 Live Users Indicator                                            │    │
│  │  🔔 Notifications Bell                                              │    │
│  │  ⚙️  User Menu (Profile + Settings + Logout)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       ADMIN CAPABILITIES                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  ✅ Create new tasks                                                 │    │
│  │  ✅ Assign tasks to users                                            │    │
│  │  ✅ Edit any task                                                    │    │
│  │  ✅ Delete tasks (soft delete)                                       │    │
│  │  ✅ Update task status & review status                               │    │
│  │  ✅ View all tasks across all vertices                               │    │
│  │  ✅ Manage team members                                              │    │
│  │  ✅ Add/delete vertices                                              │    │
│  │  ✅ Send broadcasts to all users                                     │    │
│  │  ✅ View performance analytics                                       │    │
│  │  ✅ Generate reports (PDF/Excel)                                     │    │
│  │  ✅ Cost estimation                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                  HTTPS/REST
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                             BACKEND (Admin APIs)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Middleware: src/lib/auth.ts → getCurrentUser()                             │
│  Check: role === 'admin'                                                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         API ENDPOINTS                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  POST   /api/tasks           → Create task (admin/user only)        │    │
│  │  GET    /api/tasks           → List all tasks                       │    │
│  │  PUT    /api/tasks           → Update task                          │    │
│  │  DELETE /api/tasks?ids=...   → Soft delete tasks (admin only)       │    │
│  │                                                                       │    │
│  │  GET    /api/users           → List all users (admin only)          │    │
│  │  POST   /api/users           → Create user (admin only)             │    │
│  │  PUT    /api/users           → Update user (admin only)             │    │
│  │  DELETE /api/users?id=...    → Delete user (admin only)             │    │
│  │                                                                       │    │
│  │  GET    /api/broadcasts      → Get all broadcasts                   │    │
│  │  POST   /api/broadcasts      → Send broadcast (admin/user)          │    │
│  │  DELETE /api/broadcasts?id=  → Delete broadcast (admin/creator)     │    │
│  │                                                                       │    │
│  │  GET    /api/projects        → List projects                        │    │
│  │  POST   /api/projects        → Create project (admin only)          │    │
│  │  PUT    /api/projects        → Update project (admin only)          │    │
│  │                                                                       │    │
│  │  GET    /api/notifications   → Get user notifications               │    │
│  │  POST   /api/notifications   → Create notification                  │    │
│  │                                                                       │    │
│  │  PUT    /api/user/profile    → Update own profile (all roles)       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       DATABASE MODELS                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  📄 User        → src/models/User.ts                                │    │
│  │  📄 Task        → src/models/Task.ts                                │    │
│  │  📄 Broadcast   → src/models/Broadcast.ts                           │    │
│  │  📄 Notification → src/models/Notification.ts                       │    │
│  │  📄 Project     → src/models/Project.ts                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👤 USER DASHBOARD Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER ROLE ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (User)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Component: src/components/user-dashboard.tsx                                │
│  Route: /user                                                                │
│  Auth: Requires role = 'user'                                                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          SIDEBAR NAVIGATION                          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  📋 My Tasks          → Task list assigned to user                  │    │
│  │  📊 My Progress       → Personal performance metrics                │    │
│  │  💬 Team Chat         → Broadcasting messages                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          HEADER COMPONENTS                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  🕐 Clock (top-left, black text)                                    │    │
│  │  🔔 Notifications Bell                                              │    │
│  │  ⚙️  User Menu (Profile + Settings + Logout)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       USER CAPABILITIES                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  ✅ View assigned tasks only                                         │    │
│  │  ✅ Update task progress (0-100%)                                    │    │
│  │  ✅ Update task status (Not Started → In Progress → Review)         │    │
│  │  ✅ Update actual working hours                                      │    │
│  │  ✅ View task details                                                │    │
│  │  ❌ Cannot edit tasks marked as "Delivered"                          │    │
│  │  ❌ Cannot create new tasks                                          │    │
│  │  ❌ Cannot delete tasks                                              │    │
│  │  ✅ Send/receive broadcasts                                          │    │
│  │  ✅ View own performance analytics                                   │    │
│  │  ✅ Update profile (photo, email, password)                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        MY TASKS VIEW                                 │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  • Filters: Status, Priority                                        │    │
│  │  • Search: By task name                                             │    │
│  │  • Quick Stats: Total, In Progress, Completed Today                 │    │
│  │  • Task Cards:                                                       │    │
│  │    - Task name & description                                        │    │
│  │    - Client info                                                     │    │
│  │    - Deadline with countdown                                        │    │
│  │    - Progress bar                                                    │    │
│  │    - Priority badge                                                  │    │
│  │    - Quick actions (View, Start, Update)                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      MY PROGRESS VIEW                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  • Task Completion Chart (Pie/Bar)                                  │    │
│  │  • Weekly Progress Trend (Line Chart)                               │    │
│  │  • On-Time Delivery Rate                                            │    │
│  │  • Average Task Duration                                            │    │
│  │  • Current Week Tasks                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                  HTTPS/REST
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                             BACKEND (User APIs)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Middleware: src/lib/auth.ts → getCurrentUser()                             │
│  Check: role === 'user'                                                      │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      FILTERED API ACCESS                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  GET  /api/tasks                                                     │    │
│  │       → Filter: assignedTo === currentUser.userId                    │    │
│  │       → Returns: Only tasks assigned to this user                    │    │
│  │                                                                       │    │
│  │  PUT  /api/tasks                                                     │    │
│  │       → Validation: Can only update own tasks                        │    │
│  │       → Cannot update if status === 'Delivered'                      │    │
│  │       → Can update: progress, actualWorkingHours, status             │    │
│  │       → Cannot update: assignedTo, priority, deadline                │    │
│  │                                                                       │    │
│  │  GET  /api/broadcasts                                                │    │
│  │       → Returns: All broadcasts (no filtering)                       │    │
│  │                                                                       │    │
│  │  POST /api/broadcasts                                                │    │
│  │       → Allowed: Users can send broadcasts                           │    │
│  │                                                                       │    │
│  │  PUT  /api/user/profile                                              │    │
│  │       → Update: Own profile only                                     │    │
│  │       → Fields: profileImage, email, password                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    PERMISSION CHECKS (User)                          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  if (currentUser.role === 'user') {                                 │    │
│  │    // Can only update their own tasks                               │    │
│  │    if (task.assignedTo !== currentUser.userId) {                    │    │
│  │      return 403 Forbidden;                                          │    │
│  │    }                                                                 │    │
│  │    // Cannot delete tasks                                           │    │
│  │    // Cannot create users                                           │    │
│  │    // Cannot create projects                                        │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ CLIENT DASHBOARD Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT ROLE ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (Client)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Component: src/components/client-dashboard.tsx                              │
│  Route: /client                                                              │
│  Auth: Requires role = 'client'                                              │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          SIDEBAR NAVIGATION                          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  📊 Project Overview  → Overview of client projects                 │    │
│  │  📋 My Tasks          → Tasks for this client                       │    │
│  │  💬 Broadcasting      → View team communications                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          HEADER COMPONENTS                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  🕐 Clock (top-left, black text)                                    │    │
│  │  🔔 Notifications Bell                                              │    │
│  │  ⚙️  User Menu (Profile + Settings + Logout)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      CLIENT CAPABILITIES                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  ✅ View tasks from own vertex only                                  │    │
│  │  ✅ View tasks with client name matching own name                    │    │
│  │  ✅ View tasks with clientEmail matching own email                   │    │
│  │  ✅ Read-only access to task details                                 │    │
│  │  ❌ Cannot create tasks                                              │    │
│  │  ❌ Cannot edit tasks                                                │    │
│  │  ❌ Cannot delete tasks                                              │    │
│  │  ❌ Cannot update task status or progress                            │    │
│  │  ✅ View broadcasts                                                  │    │
│  │  ❌ Cannot send broadcasts                                           │    │
│  │  ✅ View project timelines                                           │    │
│  │  ✅ Update profile (photo, email, password)                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PROJECT OVERVIEW                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  • Total Projects                                                    │    │
│  │  • Active Tasks Count                                               │    │
│  │  • Completed Tasks Count                                            │    │
│  │  • Overall Progress Percentage                                      │    │
│  │  • Project Timeline (Gantt-style)                                   │    │
│  │  • Task Status Distribution (Chart)                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         MY TASKS VIEW                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  • Filter by: Status, Priority                                      │    │
│  │  • Search: Task name, description                                   │    │
│  │  • Task Cards (Read-Only):                                          │    │
│  │    - Task name & full description                                   │    │
│  │    - Assigned team member                                           │    │
│  │    - Current status & progress                                      │    │
│  │    - Start/End dates                                                 │    │
│  │    - Priority level                                                  │    │
│  │    - Completion status badge                                        │    │
│  │  • View Details: Link to full task page                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                  HTTPS/REST
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            BACKEND (Client APIs)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Middleware: src/lib/auth.ts → getCurrentUser()                             │
│  Check: role === 'client'                                                    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   HEAVILY FILTERED API ACCESS                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  GET  /api/tasks                                                     │    │
│  │       → Filter logic:                                                │    │
│  │         const user = await User.findById(currentUser.userId);       │    │
│  │         filter.$or = [                                               │    │
│  │           { vertex: user.vertex },         // Same vertex           │    │
│  │           { clientEmail: user.email },      // Client email match   │    │
│  │           { client: { $regex: user.name } } // Client name match    │    │
│  │         ];                                                           │    │
│  │       → Returns: Only vertex-scoped or client-related tasks         │    │
│  │                                                                       │    │
│  │  POST /api/tasks                                                     │    │
│  │       → FORBIDDEN: return 403                                        │    │
│  │                                                                       │    │
│  │  PUT  /api/tasks                                                     │    │
│  │       → FORBIDDEN: return 403                                        │    │
│  │                                                                       │    │
│  │  DELETE /api/tasks                                                   │    │
│  │       → FORBIDDEN: return 403                                        │    │
│  │                                                                       │    │
│  │  GET  /api/broadcasts                                                │    │
│  │       → Returns: All broadcasts (read-only)                          │    │
│  │                                                                       │    │
│  │  PUT  /api/user/profile                                              │    │
│  │       → Update: Own profile only                                     │    │
│  │       → Fields: profileImage, email, password                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   PERMISSION CHECKS (Client)                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  if (currentUser.role === 'client') {                               │    │
│  │    // READ-ONLY access to tasks                                     │    │
│  │    // Cannot create, update, or delete tasks                        │    │
│  │    // Cannot send broadcasts                                        │    │
│  │    // Cannot access admin features                                  │    │
│  │    // Can only view vertex-scoped data                              │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Real-Time Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME EVENT SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────────┘

Admin creates task → API saves to MongoDB → Returns task
                                                    │
                                                    ▼
                                        addTask(newTask) in Admin Dashboard
                                                    │
                                                    ▼
                                        emitTaskCreated(newTask)
                                                    │
                            ┌───────────────────────┴───────────────────────┐
                            │      RealtimeManager (realtime.ts)            │
                            │      • Store in localStorage                  │
                            │      • Broadcast via BroadcastChannel         │
                            │      • Trigger storage events                 │
                            └───────────────────────┬───────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────┐
                    │                               │                           │
                    ▼                               ▼                           ▼
            ┌───────────────┐             ┌───────────────┐           ┌───────────────┐
            │  Admin Tab 1  │             │  User Tab 1   │           │  Client Tab 1 │
            │  (creator)    │             │               │           │               │
            └───────┬───────┘             └───────┬───────┘           └───────┬───────┘
                    │                             │                           │
                    ▼                             ▼                           ▼
            useRealtime Hook              useRealtime Hook            useRealtime Hook
            task_created event            task_created event          task_created event
                    │                             │                           │
                    ▼                             ▼                           ▼
            fetchTasks()                  fetchTasks()                fetchTasks()
                    │                             │                           │
                    ▼                             ▼                           ▼
            UI Updates ✨                 UI Updates ✨               UI Updates ✨
            Task appears instantly        Task appears instantly      Task appears instantly


Event Types:
├─ task_created        → New task added
├─ task_updated        → Task modified
├─ broadcast_sent      → New broadcast message
└─ user_status_changed → User online/offline
```

---

## 🗄️ Database Schema Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONGODB COLLECTIONS                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Collection: users                                                          │
├────────────────────────────────────────────────────────────────────────────┤
│  _id: ObjectId (PK)                                                         │
│  name: String ✓                                                             │
│  email: String (unique) ✓                                                   │
│  password: String (hashed) ✓                                                │
│  role: Enum ['admin', 'user', 'client'] ✓                                   │
│  empId: String (unique)                                                     │
│  designation: String                                                        │
│  vertex: String                                                             │
│  profileImage: String (base64)                                              │
│  lastLogin: Date                                                            │
│  createdAt: Date ✓                                                          │
│  updatedAt: Date ✓                                                          │
│                                                                              │
│  Indexes:                                                                   │
│  • { email: 1 } (unique)                                                    │
│  • { empId: 1 } (unique)                                                    │
│  • { role: 1 }                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Collection: tasks                                                          │
├────────────────────────────────────────────────────────────────────────────┤
│  _id: ObjectId (PK)                                                         │
│  name: String (max 500 chars) ✓                                            │
│  assignedTo: ObjectId → users._id ✓                                         │
│  assignedToName: String ✓                                                   │
│  assigneeEmail: String ✓                                                    │
│  status: Enum ['Not Started', 'In Progress', 'On Hold', 'Review',          │
│                'Delivered'] ✓ (default: 'Not Started')                      │
│  progress: Number (0-100) ✓ (default: 0)                                    │
│  startDate: Date ✓                                                          │
│  endDate: Date ✓ (must be >= startDate)                                     │
│  createdDate: Date ✓                                                        │
│  client: String (max 200 chars) ✓                                          │
│  clientEmail: String                                                        │
│  clientId: ObjectId → users._id                                             │
│  vertex: Enum ['CMIS', 'LOF', 'TRI', 'TRG', 'VB World', 'CMG',             │
│                'Jahangir', 'LOF Curriculum'] ✓                              │
│  typeOfWork: Enum ['Design', 'Development', 'QA', 'Marketing'] ✓            │
│  category: String (max 100 chars) ✓                                        │
│  workingHours: Number (>= 0) ✓                                              │
│  actualWorkingHours: Number (>= 0)                                          │
│  priority: Enum ['Urgent', 'High', 'Medium', 'Low'] ✓ (default: 'Medium')  │
│  completionDate: Date (auto-set when status → 'Delivered')                 │
│  reviewStatus: Enum ['Manager Review', 'Creative Review',                   │
│                      'Client Review', 'Delivered']                          │
│  remarks: String (max 1000 chars)                                          │
│  createdBy: ObjectId → users._id ✓                                          │
│  updatedBy: ObjectId → users._id                                            │
│  isArchived: Boolean (default: false)                                       │
│  archivedAt: Date                                                           │
│  archivedBy: ObjectId → users._id                                           │
│  createdAt: Date ✓                                                          │
│  updatedAt: Date ✓                                                          │
│                                                                              │
│  Indexes:                                                                   │
│  • { assignedTo: 1 }                                                        │
│  • { vertex: 1 }                                                            │
│  • { status: 1 }                                                            │
│  • { priority: 1 }                                                          │
│  • { startDate: 1, endDate: 1 }                                             │
│  • { createdBy: 1 }                                                         │
│  • { isArchived: 1 }                                                        │
│  • Text index on: name, client, category                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Collection: broadcasts                                                     │
├────────────────────────────────────────────────────────────────────────────┤
│  _id: ObjectId (PK)                                                         │
│  message: String ✓                                                          │
│  category: Enum ['Announcement', 'Update', 'General', 'Alert'] ✓            │
│  priority: Enum ['Low', 'Medium', 'High', 'Critical'] ✓                     │
│  vertex: String (target department)                                         │
│  readBy: [ObjectId] → users._id array                                       │
│  createdBy: ObjectId → users._id ✓                                          │
│  createdByName: String                                                      │
│  createdByAvatar: String (enriched from User.profileImage)                 │
│  createdDate: Date ✓                                                        │
│  updatedAt: Date                                                            │
│                                                                              │
│  Indexes:                                                                   │
│  • { category: 1 }                                                          │
│  • { vertex: 1 }                                                            │
│  • { createdBy: 1 }                                                         │
│  • { createdDate: -1 }                                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Collection: notifications                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  _id: ObjectId (PK)                                                         │
│  userId: ObjectId → users._id ✓                                             │
│  title: String ✓                                                            │
│  message: String                                                            │
│  type: Enum ['task', 'broadcast', 'system'] ✓                               │
│  read: Boolean (default: false)                                             │
│  link: String (navigation URL)                                              │
│  createdAt: Date ✓                                                          │
│  updatedAt: Date                                                            │
│                                                                              │
│  Indexes:                                                                   │
│  • { userId: 1, read: 1 }                                                   │
│  • { createdAt: -1 }                                                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Collection: projects                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│  _id: ObjectId (PK)                                                         │
│  name: String ✓                                                             │
│  description: String                                                        │
│  vertex: String                                                             │
│  status: Enum ['Active', 'On Hold', 'Completed']                            │
│  tasks: [ObjectId] → tasks._id array                                        │
│  startDate: Date                                                            │
│  endDate: Date                                                              │
│  createdBy: ObjectId → users._id ✓                                          │
│  createdAt: Date ✓                                                          │
│  updatedAt: Date ✓                                                          │
│                                                                              │
│  Indexes:                                                                   │
│  • { vertex: 1 }                                                            │
│  • { status: 1 }                                                            │
│  • { createdBy: 1 }                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION & AUTHORIZATION                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  1. LOGIN FLOW                                                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User enters credentials (email + password)                                 │
│         │                                                                    │
│         ▼                                                                    │
│  POST /api/auth/login                                                       │
│         │                                                                    │
│         ├─► Find user by email in MongoDB                                   │
│         │                                                                    │
│         ├─► bcrypt.compare(password, user.password)                         │
│         │                                                                    │
│         ├─► If invalid → return 401 Unauthorized                            │
│         │                                                                    │
│         └─► If valid:                                                       │
│             ├─ Generate JWT token                                           │
│             │  jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn })│
│             │                                                                │
│             ├─ Update user.lastLogin = now()                                │
│             │                                                                │
│             └─ Return { success: true, token, user }                        │
│                                                                              │
│  Browser stores:                                                            │
│  ├─ localStorage.setItem('token', token)                                    │
│  └─ localStorage.setItem('user', JSON.stringify(user))                      │
│                                                                              │
│  AuthContext.setUser(user)                                                  │
│         │                                                                    │
│         ▼                                                                    │
│  Redirect based on role:                                                    │
│  ├─ admin  → /admin                                                         │
│  ├─ user   → /user                                                          │
│  └─ client → /client                                                        │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  2. AUTHORIZATION MIDDLEWARE                                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Every API request includes: Authorization: Bearer <token>                  │
│         │                                                                    │
│         ▼                                                                    │
│  middleware.ts checks if route requires auth                                │
│         │                                                                    │
│         ▼                                                                    │
│  getCurrentUser(request) in auth.ts                                         │
│         │                                                                    │
│         ├─► Extract token from Authorization header                         │
│         │                                                                    │
│         ├─► jwt.verify(token, JWT_SECRET)                                   │
│         │                                                                    │
│         ├─► If invalid/expired → return null                                │
│         │                                                                    │
│         └─► If valid → return { userId, email, role }                       │
│                                                                              │
│  API route checks currentUser:                                              │
│  ├─ if (!currentUser) → return 401 Unauthorized                             │
│  │                                                                           │
│  └─ Check role permissions:                                                 │
│     ├─ Admin: Full access                                                   │
│     ├─ User: Limited access (own tasks only)                                │
│     └─ Client: Read-only access (vertex-scoped)                             │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  3. ROLE-BASED PERMISSIONS                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ADMIN PERMISSIONS                                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✅ Create/Read/Update/Delete tasks                                  │   │
│  │  ✅ Create/Read/Update/Delete users                                  │   │
│  │  ✅ Create/Read/Update projects                                      │   │
│  │  ✅ Send/Delete broadcasts                                           │   │
│  │  ✅ View all performance analytics                                   │   │
│  │  ✅ Generate reports                                                 │   │
│  │  ✅ Manage vertices                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  USER PERMISSIONS                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✅ Read own tasks only                                              │   │
│  │  ✅ Update own tasks (if not Delivered)                              │   │
│  │  ✅ Send broadcasts                                                  │   │
│  │  ✅ View own performance                                             │   │
│  │  ✅ Update own profile                                               │   │
│  │  ❌ Cannot create tasks                                              │   │
│  │  ❌ Cannot delete tasks                                              │   │
│  │  ❌ Cannot access admin features                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CLIENT PERMISSIONS                                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✅ Read tasks (vertex-scoped only)                                  │   │
│  │  ✅ View broadcasts (read-only)                                      │   │
│  │  ✅ Update own profile                                               │   │
│  │  ❌ Cannot create/update/delete tasks                                │   │
│  │  ❌ Cannot send broadcasts                                           │   │
│  │  ❌ Cannot access admin features                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                   │
└─────────────────────────────────────────────────────────────────────────────┘

FRONTEND
├─ Framework:        Next.js 15.3.3 (App Router, Server Components)
├─ UI Library:       React 18.3.1
├─ Language:         TypeScript 5
├─ Styling:          Tailwind CSS 3.4.1
├─ Components:       ShadCN UI (Radix UI primitives)
├─ Fonts:            Poppins, Orbitron, JetBrains Mono
├─ Icons:            Lucide React
├─ Forms:            React Hook Form + Zod validation
├─ Charts:           Recharts 2.15.1
├─ Date:             date-fns 3.6.0
└─ Build:            Turbopack

BACKEND
├─ Runtime:          Node.js
├─ Framework:        Next.js API Routes
├─ Database:         MongoDB 6.20.0
├─ ODM:              Mongoose 8.18.2
├─ Authentication:   JWT (jsonwebtoken 9.0.2)
├─ Password:         bcryptjs 3.0.2
└─ AI:               Google Genkit 1.14.1

REAL-TIME
├─ BroadcastChannel API (cross-tab communication)
├─ localStorage (persistent storage)
└─ Custom event system

EXPORT & REPORTS
├─ PDF:              jsPDF 2.5.1 + jsPDF-AutoTable 3.8.2
└─ Excel:            xlsx 0.18.5

DEVELOPMENT
├─ Package Manager:  npm
├─ Dev Server:       Port 9002
├─ Hot Reload:       Turbopack HMR
└─ Type Checking:    TypeScript compiler
```

This architecture supports **role-based access control**, **real-time updates**, and **scalable task management** for your organization! 🚀
