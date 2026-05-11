/**
 * /api/notifications — SyncFlow notifications (Prisma / lof_internal.syncflow)
 *
 * The old Mongoose code stored notifications inside the User collection with
 * `notification*` prefixed fields (a hack to avoid creating a second model).
 * This Prisma version uses a proper, normalized `Notification` table.
 *
 * Frontend payload shape is preserved:
 *   { _id, title, message, type, priority?, userId, relatedId?,
 *     createdBy?, createdDate, readAt?, isRead, actionUrl?, metadata? }
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/auth';

// Reshape Prisma row → frontend "notification" shape
function shape(n: any) {
  return {
    _id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    userId: n.userId,
    relatedId: n.taskId ?? n.projectId ?? undefined,
    createdBy: n.createdById ?? undefined,
    createdDate: n.createdAt,
    readAt: n.readAt ?? undefined,
    isRead: n.isRead,
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isReadParam = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = { userId: currentUser.userId };
    if (type && type !== 'all') where.type = type;
    if (isReadParam !== null && isReadParam !== undefined && isReadParam !== '') {
      where.isRead = isReadParam === 'true';
    }

    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: currentUser.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications: rows.map(shape),
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
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

    const d = await request.json();
    const created = await prisma.notification.create({
      data: {
        title: d.title,
        message: d.message,
        type: d.type ?? 'info',
        userId: d.userId ?? currentUser.userId,
        taskId: d.taskId ?? null,
        projectId: d.projectId ?? null,
        createdById: currentUser.userId,
        isRead: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Notification created successfully',
        notification: shape(created),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Notifications POST error:', error);
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

    const { notificationId, action, isRead } = await request.json();

    // Bulk: mark all as read
    if (action === 'markAllAsRead') {
      const result = await prisma.notification.updateMany({
        where: { userId: currentUser.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} notifications as read`,
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const target = await prisma.notification.findFirst({
      where: { id: notificationId, userId: currentUser.userId },
    });
    if (!target) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const data: any = {};
    if (action === 'markAsRead' || isRead !== undefined) {
      data.isRead = isRead !== undefined ? isRead : true;
      if (data.isRead && !target.readAt) data.readAt = new Date();
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification updated successfully',
      notification: shape(updated),
    });
  } catch (error) {
    console.error('Notifications PUT error:', error);
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

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clearAll') {
      const result = await prisma.notification.deleteMany({
        where: { userId: currentUser.userId, isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: `Cleared ${result.count} read notifications`,
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const target = await prisma.notification.findFirst({
      where: { id: notificationId, userId: currentUser.userId },
    });
    if (!target) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
