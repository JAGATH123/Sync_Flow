# SyncFlow - System Architecture Documentation

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (Browser)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Admin     │  │     User     │  │    Client    │  │   Login      │    │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │  │    Page      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    │                               │                        │
│         ┌──────────▼──────────┐         ┌─────────▼────────┐               │
│         │   AuthContext       │         │  Real-time       │               │
│         │   - JWT Token       │         │  Event System    │               │
│         │   - User State      │         │  - localStorage  │               │
│         │   - Profile Mgmt    │         │  - BroadcastAPI  │               │
│         └──────────┬──────────┘         └─────────┬────────┘               │
│                    │                               │                        │
└────────────────────┼───────────────────────────────┼────────────────────────┘
                     │                               │
                     │        HTTPS/REST API         │
                     │                               │
┌────────────────────▼───────────────────────────────▼────────────────────────┐
│                        APPLICATION LAYER (Next.js 15)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          API Routes                                    │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                         │  │
│  │  /api/auth/*         /api/tasks          /api/broadcasts              │  │
│  │  ├─ login           ├─ GET (list)        ├─ GET (with avatars)        │  │
│  │  └─ logout          ├─ POST (create)     ├─ POST (create)             │  │
│  │                      ├─ PUT (update)      └─ DELETE (persistent)       │  │
│  │  /api/users          └─ DELETE                                         │  │
│  │  ├─ GET                                   /api/user/profile            │  │
│  │  ├─ POST             /api/projects        ├─ PUT (photo upload)        │  │
│  │  ├─ PUT              ├─ GET               ├─ PUT (email/password)      │  │
│  │  └─ DELETE           ├─ POST              └─ GET                       │  │
│  │                      └─ PUT                                            │  │
│  │  /api/notifications  /api/upload                                       │  │
│  │  ├─ GET              └─ POST (files)                                   │  │
│  │  └─ POST                                                               │  │
│  │                                                                         │  │
│  └─────────────────────────────┬───────────────────────────────────────────┘  │
│                                │                                              │
│  ┌─────────────────────────────▼───────────────────────────────────────┐    │
│  │                    Middleware Layer                                  │    │
│  ├───────────────────────────────────────────────────────────────────────┤    │
│  │  • getCurrentUser() - JWT Verification                               │    │
│  │  • Role-based Access Control (Admin/User/Client)                     │    │
│  │  • Request Validation                                                 │    │
│  └─────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                              │
└────────────────────────────────┼──────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼──────────────────────────────────────────────┐
│                        DATA ACCESS LAYER (Mongoose ODM)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   User   │  │   Task   │  │Broadcast │  │Notification│ │ Project  │      │
│  │  Model   │  │  Model   │  │  Model   │  │  Model   │  │  Model   │      │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤      │
│  │• name    │  │• title   │  │• message │  │• title   │  │• name    │      │
│  │• email   │  │• status  │  │• category│  │• type    │  │• vertex  │      │
│  │• password│  │• assignTo│  │• priority│  │• readBy  │  │• tasks[] │      │
│  │• role    │  │• workType│  │• readBy  │  │• createdAt│ │• status  │      │
│  │• empId   │  │• cost    │  │• vertex  │  └──────────┘  └──────────┘      │
│  │• avatar  │  │• review  │  │• avatar  │                                   │
│  │• vertex  │  │• deadline│  └──────────┘                                   │
│  └────┬─────┘  └────┬─────┘                                                 │
│       │             │                                                        │
└───────┼─────────────┼────────────────────────────────────────────────────────┘
        │             │
┌───────▼─────────────▼────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (MongoDB)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Collections:                                                    │        │
│  │  • users          - Authentication & Profiles                    │        │
│  │  • tasks          - Task Management (indexed: status, assignedTo)│        │
│  │  • broadcasts     - Team Messages (indexed: category, vertex)    │        │
│  │  • notifications  - User Alerts                                  │        │
│  │  • projects       - Project Organization                         │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                               │
│  Connection: mongoose.connect(MONGODB_URI)                                   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Google Genkit AI (v1.14.1) - AI-powered features                         │
│  • Google Fonts - Poppins, Orbitron, JetBrains Mono                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT HIERARCHY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

app/layout.tsx (Root)
├─ AuthContext Provider
│  └─ {children}
│
├─ Admin Dashboard
│  ├─ Sidebar Navigation
│  │  ├─ Dashboard Link
│  │  ├─ Task Management Link
│  │  ├─ My Team Link
│  │  ├─ Broadcasting Link
│  │  ├─ Reports Link
│  │  ├─ Employee Performance Link
│  │  └─ Footer (LOF Logo + "DEVELOPED BY")
│  │
│  ├─ Header
│  │  ├─ Clock Component (top-left, black text)
│  │  ├─ Live Users Indicator
│  │  ├─ Notifications Bell
│  │  └─ User Menu
│  │     ├─ Profile Display (with avatar)
│  │     ├─ Settings Dialog
│  │     │  ├─ Profile Photo Tab
│  │     │  ├─ Email Update Tab
│  │     │  └─ Password Change Tab
│  │     └─ Logout
│  │
│  └─ Main Content Area
│     ├─ Overview Page
│     ├─ Task Management Page
│     │  ├─ Create Task Dialog
│     │  ├─ Task Filters
│     │  └─ Task Cards
│     ├─ My Team Page
│     │  ├─ Add Vertex Dialog
│     │  └─ Delete Vertex Dialog
│     ├─ Broadcasting Page
│     │  ├─ Message Input
│     │  ├─ Category Filter
│     │  └─ Message List (with avatars)
│     ├─ Reports Page
│     │  ├─ PDF Export
│     │  └─ Excel Export
│     └─ Employee Performance Page
│        ├─ Performance Metrics
│        └─ Task Completion Charts
│
├─ User Dashboard
│  ├─ Sidebar Navigation
│  ├─ Header (Clock + Notifications + User Menu)
│  └─ Main Content
│     ├─ My Tasks
│     ├─ Task Details
│     └─ Broadcasting
│
└─ Client Dashboard
   ├─ Sidebar Navigation
   ├─ Header (Clock + Notifications + User Menu)
   └─ Main Content
      ├─ Project Overview
      ├─ Task Tracking (vertex-scoped)
      └─ Reports
```

---

## 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

User Login
    │
    ├─► POST /api/auth/login
    │       ├─ Validate credentials (bcrypt.compare)
    │       ├─ Generate JWT token (jsonwebtoken.sign)
    │       └─ Return { token, user }
    │
    ├─► Store in localStorage
    │       ├─ token
    │       └─ user (JSON)
    │
    ├─► AuthContext.setUser()
    │       └─ Global state update
    │
    └─► Redirect to Dashboard
            ├─ Admin → /admin
            ├─ User → /user
            └─ Client → /client


┌─────────────────────────────────────────────────────────────────────────────┐
│                          TASK LIFECYCLE FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. Task Creation (Admin)
    │
    ├─► Open Create Task Dialog
    │       ├─ Fill: Title, Description, Work Type
    │       ├─ Select: Assigned User (empId matching)
    │       ├─ Set: Deadline, Priority
    │       └─ Auto-calculate: Cost (₹85/hour)
    │
    ├─► POST /api/tasks
    │       ├─ Validate: Admin role
    │       ├─ Create: Task document
    │       ├─ Set: status = "Not Started"
    │       └─ Emit: task-created event
    │
    └─► Real-time Update
            └─ All dashboards refresh


2. Task Assignment & Execution (User)
    │
    ├─► User views assigned tasks
    │       └─ Filter: assignedTo === currentUser.empId
    │
    ├─► Update Status
    │       ├─ Not Started → In Progress
    │       ├─ In Progress → Review
    │       └─ Review → Delivered (READ-ONLY)
    │
    ├─► PUT /api/tasks/:id
    │       ├─ Validate: User permissions
    │       ├─ Update: Task fields
    │       ├─ If status = "Delivered":
    │       │   └─ Set completionDate = now()
    │       └─ Emit: task-updated event
    │
    └─► Performance Metrics Update
            └─ employee-performance-page fetches latest data


3. Task Delivered State (Read-Only)
    │
    ├─► canEdit() check
    │       └─ If status === "Delivered" → return false
    │
    ├─► UI Updates
    │       ├─ Disable all form fields
    │       ├─ Hide Edit button
    │       └─ Show "Task Completed" badge
    │
    └─► Completion tracking
            └─ completionDate stored in DB


┌─────────────────────────────────────────────────────────────────────────────┐
│                        BROADCASTING FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

1. Send Message
    │
    ├─► POST /api/broadcasts
    │       ├─ Create: Broadcast document
    │       ├─ Fields: message, category, priority, vertex
    │       ├─ Set: createdBy = currentUser.userId
    │       └─ Emit: broadcast-created event
    │
    └─► Real-time delivery to all users


2. Fetch Messages (with avatars)
    │
    ├─► GET /api/broadcasts
    │       ├─ Fetch: Broadcasts from DB
    │       ├─ Enrich: For each broadcast
    │       │   ├─ Lookup User.profileImage
    │       │   └─ Add createdByAvatar field
    │       └─ Return: enrichedBroadcasts[]
    │
    └─► Display in UI with profile avatars


3. Delete Message (Persistent)
    │
    ├─► DELETE /api/broadcasts?id=xxx
    │       ├─ Validate: Admin OR message creator
    │       ├─ Delete: Broadcast.findByIdAndDelete()
    │       └─ Return: { success: true }
    │
    └─► Update UI
            ├─ Remove from local state
            └─ fetchMessages() to refresh


┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROFILE MANAGEMENT FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. Update Profile Photo
    │
    ├─► User selects image file
    │       └─ Preview in modal
    │
    ├─► PUT /api/user/profile (multipart/form-data)
    │       ├─ Convert: File → Buffer → Base64
    │       ├─ Update: User.profileImage = base64String
    │       └─ Return: { imageUrl }
    │
    ├─► AuthContext.updateUser()
    │       ├─ Update: Local state
    │       └─ Update: localStorage
    │
    └─► Display everywhere
            ├─ User Menu (header)
            ├─ Broadcasting messages
            └─ Team lists


2. Update Email
    │
    ├─► PUT /api/user/profile (JSON)
    │       ├─ Validate: Email format
    │       ├─ Update: User.email
    │       └─ Return: updated user
    │
    └─► AuthContext.updateUser()


3. Change Password
    │
    ├─► PUT /api/user/profile (JSON)
    │       ├─ Verify: currentPassword (bcrypt.compare)
    │       ├─ Hash: newPassword (bcrypt.hash)
    │       ├─ Update: User.password
    │       └─ Return: success
    │
    └─► Show success toast


┌─────────────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME EVENT SYSTEM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Event Types:
    • task-created
    • task-updated
    • task-deleted
    • broadcast-created
    • notification-created
    • user-online
    • user-offline

Flow:
    1. Action occurs (e.g., task updated)
    2. API route emits event: RealtimeService.emit()
    3. Event stored in sessionStorage
    4. BroadcastChannel sends to all tabs
    5. Listeners in components receive event
    6. Components refresh data (fetchTasks, fetchMessages)
    7. UI updates automatically
```

---

## 4. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
    ├─ Password Hashing (bcryptjs, 10 rounds)
    ├─ JWT Token (secret key from .env)
    ├─ Token Expiration (24 hours)
    └─ Secure storage (localStorage - client-side)

Layer 2: Authorization
    ├─ getCurrentUser() middleware
    │  ├─ Verify JWT token
    │  ├─ Extract userId and role
    │  └─ Reject invalid tokens (401)
    │
    ├─ Role-based Access Control
    │  ├─ Admin: Full access
    │  ├─ User: Own tasks + team broadcasts
    │  └─ Client: Vertex-scoped read-only
    │
    └─ Resource-level permissions
       ├─ Tasks: Only assignee or admin can edit
       ├─ Broadcasts: Only creator or admin can delete
       └─ Profiles: Only own profile can update

Layer 3: Data Validation
    ├─ Request validation (Zod schemas)
    ├─ Email format validation
    ├─ Password strength requirements
    └─ File upload size limits

Layer 4: API Protection
    ├─ CORS configuration
    ├─ Rate limiting (planned)
    ├─ Input sanitization
    └─ SQL injection prevention (Mongoose escaping)
```

---

## 5. Database Schema Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────┘

users
├─ _id: ObjectId (PK)
├─ name: String (required)
├─ email: String (unique, required)
├─ password: String (hashed, required)
├─ role: Enum ['admin', 'user', 'client']
├─ empId: String (unique)
├─ designation: String
├─ vertex: String (department/team)
├─ profileImage: String (base64)
├─ lastLogin: Date
├─ createdAt: Date
└─ updatedAt: Date

tasks
├─ _id: ObjectId (PK)
├─ taskId: String (unique, auto-generated)
├─ name: String (required)
├─ description: String
├─ assignedTo: String (empId reference)
├─ assignedToName: String
├─ status: Enum ['Not Started', 'In Progress', 'On Hold', 'Review', 'Delivered']
├─ workType: Enum ['Design', 'Development', 'QA', 'Marketing']
├─ priority: Enum ['Urgent', 'High', 'Medium', 'Low']
├─ reviewStages: {
│  ├─ managerReview: Boolean
│  ├─ creativeReview: Boolean
│  ├─ verticesReview: Boolean
│  └─ signedOff: Boolean
│  }
├─ costEstimation: Number (auto-calculated)
├─ workingHours: Number
├─ deadline: Date
├─ completionDate: Date (set when status = Delivered)
├─ vertex: String
├─ createdBy: ObjectId (User reference)
├─ createdAt: Date
└─ updatedAt: Date

broadcasts
├─ _id: ObjectId (PK)
├─ message: String (required)
├─ category: Enum ['Announcement', 'Update', 'General', 'Alert']
├─ priority: Enum ['Low', 'Medium', 'High', 'Critical']
├─ vertex: String (target department)
├─ readBy: [ObjectId] (User references)
├─ createdBy: ObjectId (User reference)
├─ createdByName: String
├─ createdByAvatar: String (enriched from User)
├─ createdDate: Date
└─ updatedAt: Date

notifications
├─ _id: ObjectId (PK)
├─ userId: ObjectId (User reference)
├─ title: String (required)
├─ message: String
├─ type: Enum ['task', 'broadcast', 'system']
├─ read: Boolean (default: false)
├─ link: String (navigation URL)
├─ createdAt: Date
└─ updatedAt: Date

projects
├─ _id: ObjectId (PK)
├─ name: String (required)
├─ description: String
├─ vertex: String
├─ status: Enum ['Active', 'On Hold', 'Completed']
├─ tasks: [ObjectId] (Task references)
├─ startDate: Date
├─ endDate: Date
├─ createdBy: ObjectId (User reference)
├─ createdAt: Date
└─ updatedAt: Date


Indexes:
├─ users: { email: 1 }, { empId: 1 }
├─ tasks: { status: 1, assignedTo: 1, deadline: 1 }
├─ broadcasts: { category: 1, vertex: 1, createdBy: 1 }
└─ notifications: { userId: 1, read: 1, createdAt: -1 }
```

---

## 6. Technology Stack Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TECHNOLOGY STACK                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Frontend:
├─ Framework: Next.js 15.3.3 (App Router, React Server Components)
├─ UI Library: React 18.3.1
├─ Language: TypeScript 5
├─ Styling: Tailwind CSS 3.4.1
├─ Component Library: ShadCN UI (Radix UI primitives)
├─ Fonts: Poppins (primary), Orbitron (branding), JetBrains Mono (code)
├─ Icons: Lucide React
├─ Forms: React Hook Form + Zod validation
├─ Charts: Recharts 2.15.1
├─ Date: date-fns 3.6.0
└─ Build Tool: Turbopack

Backend:
├─ Runtime: Node.js
├─ Framework: Next.js API Routes
├─ Database: MongoDB 6.20.0
├─ ORM: Mongoose 8.18.2
├─ Authentication: JWT (jsonwebtoken 9.0.2)
├─ Password: bcryptjs 3.0.2
└─ AI: Google Genkit 1.14.1

Export & Reports:
├─ PDF: jsPDF 2.5.1 + jsPDF-AutoTable 3.8.2
└─ Excel: xlsx 0.18.5

Development:
├─ Package Manager: npm
├─ Dev Server: Port 9002
├─ Type Checking: TypeScript compiler
└─ Hot Reload: Turbopack HMR
```

This architecture documentation provides a complete technical overview of your SyncFlow project!
