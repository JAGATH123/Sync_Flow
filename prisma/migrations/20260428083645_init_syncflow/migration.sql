-- CreateTable
CREATE TABLE "syncflow"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "empId" TEXT,
    "designation" TEXT,
    "vertex" TEXT,
    "profileImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncflow"."Task" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedToName" TEXT NOT NULL,
    "assigneeEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientId" TEXT,
    "vertex" TEXT NOT NULL,
    "typeOfWork" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "workingHours" DOUBLE PRECISION NOT NULL,
    "actualWorkingHours" DOUBLE PRECISION,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "completionDate" TIMESTAMP(3),
    "reviewStatus" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncflow"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "client" TEXT,
    "clientId" TEXT,
    "vertex" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'Not Started',
    "typeOfWork" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "budget" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncflow"."Broadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vertex" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncflow"."Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "syncflow"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_empId_key" ON "syncflow"."User"("empId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "syncflow"."User"("role");

-- CreateIndex
CREATE INDEX "User_vertex_idx" ON "syncflow"."User"("vertex");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "syncflow"."Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_vertex_idx" ON "syncflow"."Task"("vertex");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "syncflow"."Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "syncflow"."Task"("priority");

-- CreateIndex
CREATE INDEX "Task_startDate_endDate_idx" ON "syncflow"."Task"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "syncflow"."Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "syncflow"."Task"("clientId");

-- CreateIndex
CREATE INDEX "Task_isArchived_idx" ON "syncflow"."Task"("isArchived");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "syncflow"."Project"("name");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "syncflow"."Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_vertex_idx" ON "syncflow"."Project"("vertex");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "syncflow"."Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "syncflow"."Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_isArchived_idx" ON "syncflow"."Project"("isArchived");

-- CreateIndex
CREATE INDEX "Broadcast_category_idx" ON "syncflow"."Broadcast"("category");

-- CreateIndex
CREATE INDEX "Broadcast_vertex_idx" ON "syncflow"."Broadcast"("vertex");

-- CreateIndex
CREATE INDEX "Broadcast_createdById_idx" ON "syncflow"."Broadcast"("createdById");

-- CreateIndex
CREATE INDEX "Broadcast_createdDate_idx" ON "syncflow"."Broadcast"("createdDate");

-- CreateIndex
CREATE INDEX "Broadcast_isArchived_idx" ON "syncflow"."Broadcast"("isArchived");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "syncflow"."Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "syncflow"."Notification"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "syncflow"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_taskId_idx" ON "syncflow"."Notification"("taskId");

-- CreateIndex
CREATE INDEX "Notification_projectId_idx" ON "syncflow"."Notification"("projectId");

-- AddForeignKey
ALTER TABLE "syncflow"."Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "syncflow"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "syncflow"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Task" ADD CONSTRAINT "Task_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Task" ADD CONSTRAINT "Task_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "syncflow"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Project" ADD CONSTRAINT "Project_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "syncflow"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "syncflow"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Notification" ADD CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "syncflow"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncflow"."Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "syncflow"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
