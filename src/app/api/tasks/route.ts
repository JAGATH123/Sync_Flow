/**
 * /api/tasks — SyncFlow task CRUD (Prisma / lof_internal.syncflow)
 * Migrated from Mongoose. Same input/output contract.
 *
 * Field renames vs the old Mongoose API:
 *   assignedTo (ObjectId)  →  assignedToId (string)
 *   createdBy  (ObjectId)  →  createdById  (string)
 *   updatedBy  (ObjectId)  →  updatedById  (string)
 *   archivedBy (ObjectId)  →  archivedById (string)
 * The frontend still receives `assignedTo` and `createdBy` as nested user
 * objects (via `include`) so the UI doesn't change.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/auth';
import { vertexCompanyWhere } from '@/lib/company-filter';
import { emitTaskUpdated } from '@/lib/realtime';

const userBrief = { select: { id: true, name: true, email: true } };

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vertex = searchParams.get('vertex');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    // ── Company filter (mirrors Horilla's CompanyMiddleware) ──────────────────
    const companySlug = searchParams.get('company');
    const companyFilter = vertexCompanyWhere(companySlug);
    const where: any = { isArchived: false, ...companyFilter };

    if (currentUser.role === 'client') {
      const me = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { vertex: true, email: true, name: true },
      });
      const orFilters: any[] = [];
      if (me?.vertex) orFilters.push({ vertex: me.vertex });
      if (me?.email) orFilters.push({ clientEmail: me.email });
      if (me?.name)
        orFilters.push({ client: { contains: me.name, mode: 'insensitive' } });
      if (orFilters.length) where.OR = orFilters;
    }

    if (vertex && vertex !== 'all') where.vertex = vertex;
    if (status && status !== 'all') where.status = status;
    if (assignedTo) where.assignedToName = assignedTo;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: userBrief,
        createdBy: userBrief,
      },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const t = await request.json();

    // Find assignee by name OR email
    const assignee = await prisma.user.findFirst({
      where: {
        OR: [
          ...(t.assignedTo ? [{ name: t.assignedTo }] : []),
          ...(t.assigneeEmail ? [{ email: t.assigneeEmail }] : []),
        ],
      },
    });
    if (!assignee) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      );
    }

    const created = await prisma.task.create({
      data: {
        name: t.name,
        assignedToId: assignee.id,
        assignedToName: assignee.name,
        assigneeEmail: assignee.email,
        status: 'Not Started',
        progress: 0,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
        client: t.client,
        clientEmail: t.clientEmail ?? null,
        vertex: t.vertex,
        typeOfWork: t.typeOfWork,
        category: t.category,
        workingHours: t.workingHours,
        priority: t.priority ?? 'Medium',
        remarks: t.remarks ?? null,
        createdById: currentUser.userId,
      },
      include: {
        assignedTo: userBrief,
        createdBy: userBrief,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully',
        task: {
          ...created,
          _id: created.id, // legacy field for any code still expecting Mongoose shape
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          createdDate: created.createdDate.toISOString(),
          completionDate: created.completionDate
            ? created.completionDate.toISOString()
            : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      taskId,
      progress,
      actualWorkingHours,
      status,
      remarks,
      assignedTo,
      startDate,
      endDate,
      priority,
      reviewStatus,
    } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permissions
    if (currentUser.role === 'user' && task.assignedToId !== currentUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: any = { updatedById: currentUser.userId };

    if (progress !== undefined) {
      const p = Math.max(0, Math.min(100, progress));
      data.progress = p;
      if (p === 100) {
        data.status = 'Delivered';
        data.completionDate = new Date();
      } else if (p > 0) {
        data.status = 'In Progress';
      }
    }
    if (actualWorkingHours !== undefined) data.actualWorkingHours = actualWorkingHours;
    if (status) {
      data.status = status;
      if (status === 'Delivered' && !task.completionDate) {
        data.completionDate = new Date();
      }
    }
    if (remarks !== undefined) data.remarks = remarks;

    if (assignedTo && currentUser.role === 'admin') {
      const assignee = await prisma.user.findFirst({ where: { name: assignedTo } });
      if (assignee) {
        data.assignedToId = assignee.id;
        data.assignedToName = assignee.name;
        data.assigneeEmail = assignee.email;
      }
    }
    if (startDate && currentUser.role === 'admin') data.startDate = new Date(startDate);
    if (endDate && currentUser.role === 'admin') data.endDate = new Date(endDate);
    if (priority && currentUser.role === 'admin') data.priority = priority;
    if (reviewStatus && currentUser.role === 'admin') data.reviewStatus = reviewStatus;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignedTo: userBrief, createdBy: userBrief },
    });

    try {
      emitTaskUpdated(updated);
    } catch {
      /* realtime is best-effort */
    }

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      task: updated,
    });
  } catch (error) {
    console.error('Tasks PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const taskIds = searchParams.get('ids');
    if (!taskIds) {
      return NextResponse.json(
        { error: 'Task IDs are required' },
        { status: 400 }
      );
    }
    const ids = taskIds.split(',');

    const result = await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: currentUser.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} tasks deleted successfully`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Tasks DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
