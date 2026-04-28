# SyncFlow - Flowchart Documentation

## 1. User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOGIN FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────┘

                             START
                               │
                               ▼
                    ┌──────────────────────┐
                    │  User visits /login  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Enter credentials:  │
                    │  - Email             │
                    │  - Password          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Click "Login"       │
                    └──────────┬───────────┘
                               │
                               ▼
                    POST /api/auth/login
                    { email, password }
                               │
                               ▼
                  ┌────────────────────────┐
                  │  Find user by email    │
                  │  in MongoDB            │
                  └────────┬───────────────┘
                           │
                ┏━━━━━━━━━━┻━━━━━━━━━━┓
                ▼                      ▼
         ┌─────────────┐        ┌─────────────┐
         │ User found? │        │ User found? │
         │    NO       │        │    YES      │
         └──────┬──────┘        └──────┬──────┘
                │                      │
                ▼                      ▼
         ┌─────────────┐     ┌──────────────────┐
         │  Return:    │     │ Verify password  │
         │  401 Error  │     │ bcrypt.compare() │
         └──────┬──────┘     └────────┬─────────┘
                │                     │
                │          ┏━━━━━━━━━━┻━━━━━━━━━━┓
                │          ▼                      ▼
                │   ┌─────────────┐        ┌─────────────┐
                │   │  Password   │        │  Password   │
                │   │   match?    │        │   match?    │
                │   │     NO      │        │    YES      │
                │   └──────┬──────┘        └──────┬──────┘
                │          │                      │
                │          ▼                      ▼
                │   ┌─────────────┐     ┌──────────────────┐
                │   │  Return:    │     │ Generate JWT     │
                │   │  401 Error  │     │ token with:      │
                │   └──────┬──────┘     │ - userId         │
                │          │            │ - role           │
                │          │            │ - expiry (24h)   │
                │          │            └────────┬─────────┘
                │          │                     │
                │          │                     ▼
                │          │            ┌──────────────────┐
                │          │            │ Update lastLogin │
                │          │            │ in database      │
                │          │            └────────┬─────────┘
                │          │                     │
                │          │                     ▼
                │          │            ┌──────────────────┐
                │          │            │  Return:         │
                │          │            │  { success,      │
                │          │            │    token,        │
                │          │            │    user }        │
                │          │            └────────┬─────────┘
                │          │                     │
                ▼          ▼                     ▼
         ┌──────────────────────────────────────────┐
         │  Display error message in UI             │
         │  "Invalid credentials"                   │
         └──────────────────┬───────────────────────┘
                            │
                            ▼
                          END

                                                    │
                                                    ▼
                                         ┌──────────────────┐
                                         │ Store in browser:│
                                         │ localStorage:    │
                                         │ - token          │
                                         │ - user (JSON)    │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │ AuthContext      │
                                         │ setUser(user)    │
                                         └────────┬─────────┘
                                                  │
                                       ┏━━━━━━━━━━┻━━━━━━━━━━┓
                                       ▼                      ▼
                               ┌─────────────┐      ┌─────────────┐
                               │  role ===   │      │  role ===   │
                               │  'admin'?   │      │  'user'?    │
                               └──────┬──────┘      └──────┬──────┘
                                      │                    │
                                   YES│                 YES│
                                      ▼                    ▼
                            ┌──────────────┐     ┌──────────────┐
                            │ Redirect to  │     │ Redirect to  │
                            │   /admin     │     │    /user     │
                            └──────────────┘     └──────────────┘
                                                                 │
                                                              NO │
                                                                 ▼
                                                        ┌──────────────┐
                                                        │ Redirect to  │
                                                        │   /client    │
                                                        └──────────────┘
                                                                 │
                                                                 ▼
                                                               END
```

---

## 2. Task Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TASK CREATION & LIFECYCLE FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              START (Admin)
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Navigate to Task     │
                        │ Management Page      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Click "Create Task"  │
                        │ Button               │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Open Create Task     │
                        │ Dialog Modal         │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────────────┐
                        │ Fill Task Details:           │
                        │ • Task Name                  │
                        │ • Description                │
                        │ • Assign To (empId dropdown) │
                        │ • Work Type (Design/Dev/QA)  │
                        │ • Priority (Urgent/High/Med) │
                        │ • Deadline (date picker)     │
                        │ • Working Hours              │
                        │ • Vertex (department)        │
                        └──────────┬───────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────────┐
                        │ Auto-calculate Cost:         │
                        │ cost = hours × ₹85           │
                        └──────────┬───────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Click "Create Task"  │
                        └──────────┬───────────┘
                                   │
                                   ▼
                     POST /api/tasks
                     { name, assignedTo, workType, ... }
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Validate admin role  │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────────────┐
                        │ Create Task in MongoDB:      │
                        │ • Generate taskId            │
                        │ • Set status = "Not Started" │
                        │ • Set createdBy = admin._id  │
                        │ • Store all fields           │
                        └──────────┬───────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Create Notification  │
                        │ for assigned user    │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Emit real-time event:│
                        │ "task-created"       │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ All dashboards       │
                        │ refresh task lists   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                               TASK CREATED
                                   │
                                   │
┌──────────────────────────────────┼──────────────────────────────────┐
│            TASK EXECUTION FLOW (User)                                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ User logs in         │
                        │ Sees assigned tasks  │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Click on task card   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Navigate to          │
                        │ /task/[id] page      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ View task details    │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ Click "Edit Task"    │
                        │ (if allowed)         │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │ Check permissions:       │
                        │ canEdit(task)            │
                        └──────────┬───────────────┘
                                   │
                        ┏━━━━━━━━━━┻━━━━━━━━━━┓
                        ▼                      ▼
                ┌───────────────┐      ┌───────────────┐
                │ status ===    │      │ status !==    │
                │ "Delivered"?  │      │ "Delivered"   │
                └───────┬───────┘      └───────┬───────┘
                        │                      │
                     YES│                   NO │
                        ▼                      ▼
                ┌───────────────┐      ┌───────────────────┐
                │ Show message: │      │ Enable edit mode  │
                │ "Task is      │      │ Allow updates to: │
                │  completed    │      │ • Status          │
                │  (read-only)" │      │ • Progress        │
                └───────┬───────┘      │ • Review stages   │
                        │              │ • Comments        │
                        │              └───────┬───────────┘
                        │                      │
                        │                      ▼
                        │              ┌───────────────────┐
                        │              │ Update status:    │
                        │              │ Not Started →     │
                        │              │ In Progress →     │
                        │              │ Review →          │
                        │              │ Delivered         │
                        │              └───────┬───────────┘
                        │                      │
                        │                      ▼
                        │              ┌───────────────────┐
                        │              │ Click "Save"      │
                        │              └───────┬───────────┘
                        │                      │
                        │                      ▼
                        │              PUT /api/tasks/:id
                        │              { status, ... }
                        │                      │
                        │                      ▼
                        │              ┌───────────────────────┐
                        │              │ Validate permissions  │
                        │              └───────┬───────────────┘
                        │                      │
                        │                      ▼
                        │              ┌───────────────────────┐
                        │              │ Update task in DB     │
                        │              └───────┬───────────────┘
                        │                      │
                        │           ┏━━━━━━━━━┻━━━━━━━━━┓
                        │           ▼                    ▼
                        │   ┌───────────────┐    ┌───────────────────┐
                        │   │ status ===    │    │ status !==        │
                        │   │ "Delivered"?  │    │ "Delivered"       │
                        │   └───────┬───────┘    └───────┬───────────┘
                        │           │                    │
                        │        YES│                    │NO
                        │           ▼                    ▼
                        │   ┌───────────────────┐  ┌─────────────┐
                        │   │ Set:              │  │ Save task   │
                        │   │ completionDate    │  │ (no special │
                        │   │ = new Date()      │  │  handling)  │
                        │   └───────┬───────────┘  └──────┬──────┘
                        │           │                     │
                        │           └─────────┬───────────┘
                        │                     │
                        │                     ▼
                        │          ┌──────────────────────┐
                        │          │ Emit real-time event:│
                        │          │ "task-updated"       │
                        │          └──────────┬───────────┘
                        │                     │
                        │                     ▼
                        │          ┌──────────────────────┐
                        │          │ Performance page     │
                        │          │ refreshes metrics    │
                        │          └──────────┬───────────┘
                        │                     │
                        ▼                     ▼
                      END ◄──────────────── END
```

---

## 3. Broadcasting System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BROADCASTING MESSAGE FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
                     ┌──────────────────────┐
                     │ User navigates to    │
                     │ Broadcasting page    │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Load existing        │
                     │ messages             │
                     └──────────┬───────────┘
                                │
                                ▼
                     GET /api/broadcasts
                     ?category=...&vertex=...
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Fetch broadcasts from DB     │
                     │ sorted by createdDate DESC   │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ For each broadcast:          │
                     │ • Lookup User by createdBy   │
                     │ • Add profileImage as        │
                     │   createdByAvatar            │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Return enriched broadcasts   │
                     │ with avatar URLs             │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Display messages in UI:      │
                     │ • Profile avatar             │
                     │ • Author name                │
                     │ • Message content            │
                     │ • Timestamp                  │
                     │ • Category badge             │
                     └──────────┬───────────────────┘
                                │
                                │
┌───────────────────────────────┼───────────────────────────────┐
│               SEND MESSAGE FLOW                                │
└───────────────────────────────┼───────────────────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ User types message           │
                     │ in input field               │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Select options:              │
                     │ • Category (Announcement)    │
                     │ • Priority (High)            │
                     │ • Vertex (optional)          │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Click "Send"         │
                     └──────────┬───────────┘
                                │
                                ▼
                     POST /api/broadcasts
                     { message, category, priority, vertex }
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Validate authentication      │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Create Broadcast in DB:      │
                     │ • message                    │
                     │ • category                   │
                     │ • priority                   │
                     │ • vertex                     │
                     │ • createdBy = currentUser.id │
                     │ • createdByName              │
                     │ • readBy = []                │
                     │ • createdDate = now()        │
                     └──────────┬───────────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Emit real-time event:│
                     │ "broadcast-created"  │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ All users' Broadcasting      │
                     │ pages refresh messages       │
                     └──────────┬───────────────────┘
                                │
                                ▼
                              END


┌───────────────────────────────────────────────────────────────┐
│               DELETE MESSAGE FLOW                              │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ User hovers over     │
                     │ their message        │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Click delete icon    │
                     │ (trash button)       │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Confirm deletion     │
                     └──────────┬───────────┘
                                │
                                ▼
                     DELETE /api/broadcasts?id={messageId}
                                │
                                ▼
                     ┌──────────────────────────────┐
                     │ Validate permissions:        │
                     │ • Is admin? OR               │
                     │ • Is message creator?        │
                     └──────────┬───────────────────┘
                                │
                     ┏━━━━━━━━━━┻━━━━━━━━━━┓
                     ▼                      ▼
             ┌───────────────┐      ┌───────────────┐
             │ Authorized?   │      │ Authorized?   │
             │     NO        │      │     YES       │
             └───────┬───────┘      └───────┬───────┘
                     │                      │
                     ▼                      ▼
             ┌───────────────┐      ┌───────────────────┐
             │ Return 403    │      │ Delete broadcast  │
             │ Forbidden     │      │ from MongoDB      │
             └───────┬───────┘      └───────┬───────────┘
                     │                      │
                     │                      ▼
                     │              ┌───────────────────┐
                     │              │ Return success    │
                     │              └───────┬───────────┘
                     │                      │
                     │                      ▼
                     │              ┌───────────────────┐
                     │              │ Remove from local │
                     │              │ state array       │
                     │              └───────┬───────────┘
                     │                      │
                     │                      ▼
                     │              ┌───────────────────┐
                     │              │ fetchMessages()   │
                     │              │ to refresh from   │
                     │              │ server            │
                     │              └───────┬───────────┘
                     │                      │
                     ▼                      ▼
                   END ◄──────────────────END
```

---

## 4. Profile Settings Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PROFILE SETTINGS UPDATE FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              START
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Click user avatar    │
                     │ in header            │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Dropdown menu opens  │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Click "Settings"     │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ Open Settings Dialog │
                     │ (3 tabs)             │
                     └──────────┬───────────┘
                                │
                ┏━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━┓
                ▼                                ▼
┌───────────────────────┐            ┌───────────────────────┐
│   PROFILE PHOTO TAB   │            │    EMAIL TAB          │
└───────────┬───────────┘            └───────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────┐            ┌──────────────────────┐
 │ Click "Choose File"  │            │ Enter new email      │
 └──────────┬───────────┘            └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────┐            ┌──────────────────────┐
 │ Select image file    │            │ Validate email:      │
 │ from device          │            │ • Format check       │
 └──────────┬───────────┘            │ • Required check     │
            │                        └──────────┬───────────┘
            ▼                                    │
 ┌──────────────────────┐                       ▼
 │ Show preview of      │            ┌──────────────────────┐
 │ selected image       │            │ Click "Update Email" │
 └──────────┬───────────┘            └──────────┬───────────┘
            │                                    │
            ▼                                    │
 ┌──────────────────────┐                       │
 │ Click "Update Photo" │                       │
 └──────────┬───────────┘                       │
            │                                    │
            ▼                                    ▼
 PUT /api/user/profile               PUT /api/user/profile
 (multipart/form-data)               (application/json)
 FormData { profileImage: File }     { email: "new@email.com" }
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Extract file from form   │        │ Find user by ID      │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Convert to Buffer        │        │ Update user.email    │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Convert to Base64:       │        │ Save to database     │
 │ data:image/png;base64... │        └──────────┬───────────┘
 └──────────┬───────────────┘                   │
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Update User.profileImage │        │ Return updated user  │
 │ in database              │        └──────────┬───────────┘
 └──────────┬───────────────┘                   │
            │                                    │
            ▼                                    │
 ┌──────────────────────────┐                   │
 │ Return imageUrl          │                   │
 └──────────┬───────────────┘                   │
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ AuthContext.updateUser() │        │ AuthContext.updateUser()
 │ { profileImage: url }    │        │ { email: newEmail }  │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Update localStorage      │        │ Update localStorage  │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Show success toast       │        │ Show success toast   │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Wait 500ms, close dialog │        │ Close dialog         │
 └──────────┬───────────────┘        └──────────┬───────────┘
            │                                    │
            ▼                                    ▼
 ┌──────────────────────────┐        ┌──────────────────────┐
 │ Avatar updates in:       │        │ Email updates in UI  │
 │ • Header                 │        └──────────────────────┘
 │ • Broadcasting messages  │
 │ • User menu              │
 └──────────────────────────┘
            │
            ▼
          END


                ▼
┌───────────────────────┐
│   PASSWORD TAB        │
└───────────┬───────────┘
            │
            ▼
 ┌──────────────────────────┐
 │ Enter:                   │
 │ • Current Password       │
 │ • New Password           │
 │ • Confirm New Password   │
 └──────────┬───────────────┘
            │
            ▼
 ┌──────────────────────────┐
 │ Validate:                │
 │ • All fields required    │
 │ • New != Current         │
 │ • New === Confirm        │
 │ • Min length (6 chars)   │
 └──────────┬───────────────┘
            │
            ▼
 ┌──────────────────────┐
 │ Click "Update        │
 │  Password"           │
 └──────────┬───────────┘
            │
            ▼
 PUT /api/user/profile
 { currentPassword, newPassword }
            │
            ▼
 ┌──────────────────────────┐
 │ Find user by ID          │
 │ (select: '+password')    │
 └──────────┬───────────────┘
            │
            ▼
 ┌──────────────────────────┐
 │ Verify currentPassword   │
 │ bcrypt.compare()         │
 └──────────┬───────────────┘
            │
 ┏━━━━━━━━━┻━━━━━━━━━┓
 ▼                    ▼
┌─────────┐      ┌─────────┐
│ Valid?  │      │ Valid?  │
│   NO    │      │  YES    │
└────┬────┘      └────┬────┘
     │                │
     ▼                ▼
┌─────────┐      ┌──────────────────┐
│ Return  │      │ Hash new password│
│ 400     │      │ bcrypt.hash(10)  │
│ Error   │      └────┬─────────────┘
└────┬────┘           │
     │                ▼
     │         ┌──────────────────┐
     │         │ Update user:     │
     │         │ password = hash  │
     │         └────┬─────────────┘
     │              │
     │              ▼
     │         ┌──────────────────┐
     │         │ Save to database │
     │         └────┬─────────────┘
     │              │
     │              ▼
     │         ┌──────────────────┐
     │         │ Return success   │
     │         └────┬─────────────┘
     │              │
     ▼              ▼
 ┌──────────────────────┐
 │ Show error toast     │
 │ OR success toast     │
 └──────────┬───────────┘
            │
            ▼
          END
```

---

## 5. Real-Time Event System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REAL-TIME EVENT PROPAGATION                              │
└─────────────────────────────────────────────────────────────────────────────┘

                         EVENT TRIGGER
                         (e.g., task updated)
                                │
                                ▼
                    ┌───────────────────────┐
                    │ API Route completes   │
                    │ database operation    │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ RealtimeService       │
                    │ .emit(eventType, data)│
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────────┐
                    │ Check browser environment │
                    │ (typeof window !== undef) │
                    └───────────┬───────────────┘
                                │
                     ┏━━━━━━━━━━┻━━━━━━━━━━┓
                     ▼                      ▼
             ┌───────────────┐      ┌───────────────┐
             │ Server-side?  │      │ Client-side?  │
             │   (skip)      │      │  (continue)   │
             └───────┬───────┘      └───────┬───────┘
                     │                      │
                     ▼                      ▼
                   END          ┌───────────────────────┐
                                │ Create RealtimeEvent: │
                                │ • type                │
                                │ • data                │
                                │ • timestamp           │
                                │ • id (UUID)           │
                                └───────────┬───────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │ Store in sessionStorage│
                                │ (event history)       │
                                └───────────┬───────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │ BroadcastChannel.     │
                                │ postMessage(event)    │
                                └───────────┬───────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │     BROADCAST TO ALL TABS/WINDOWS             │
                    └───────────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │   Tab 1       │     │   Tab 2       │     │   Tab 3       │
            │ (Admin)       │     │ (User)        │     │ (Client)      │
            └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                    │                     │                     │
                    ▼                     ▼                     ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │ Event listener│     │ Event listener│     │ Event listener│
            │ receives event│     │ receives event│     │ receives event│
            └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                    │                     │                     │
                    ▼                     ▼                     ▼
            ┌───────────────────────────────────────────────────────────┐
            │ Switch on event.type:                                     │
            │ • task-created      → fetchTasks()                        │
            │ • task-updated      → fetchTasks(), updatePerformance()   │
            │ • task-deleted      → fetchTasks()                        │
            │ • broadcast-created → fetchMessages()                     │
            │ • notification-new  → fetchNotifications()                │
            │ • user-online       → updateLiveUsers()                   │
            └───────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ Component re-renders  │
                        │ with fresh data       │
                        └───────────────────────┘
                                    │
                                    ▼
                                  END


┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXAMPLE: Task Update Event Flow                          │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Save" on task
         │
         ▼
PUT /api/tasks/123 { status: "Delivered" }
         │
         ├─► Update task in MongoDB
         │   ├─ Set status = "Delivered"
         │   └─ Set completionDate = now()
         │
         ├─► RealtimeService.emit('task-updated', { taskId: '123' })
         │
         └─► Return success to client
                     │
    ┌────────────────┴────────────────┐
    │    BroadcastChannel sends       │
    │    to all open tabs             │
    └────────────────┬────────────────┘
                     │
    ┌────────────────┴────────────────┐
    ▼                                 ▼
Admin Dashboard                  User Dashboard
    │                                 │
    ├─► Task Management Page          ├─► My Tasks Page
    │   └─ fetchTasks()               │   └─ fetchTasks()
    │   └─ Refresh task list          │   └─ Update task card
    │                                 │
    └─► Employee Performance Page     └─► (No action needed)
        └─ fetchTasks()
        └─ Recalculate metrics
        └─ Update charts
```

This comprehensive flowchart documentation covers all major user journeys and system processes in your SyncFlow application!
