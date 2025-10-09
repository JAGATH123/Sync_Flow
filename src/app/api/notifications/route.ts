import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

interface Notification {
  _id?: string;
  title: string;
  message: string;
  type: 'task' | 'project' | 'broadcast' | 'system' | 'reminder';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  userId: string;
  relatedId?: string; // ID of related task, project, etc.
  createdBy?: string;
  createdDate: Date;
  readAt?: Date;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter for user's notifications
    let filter: any = { notificationUserId: currentUser.userId };

    if (type && type !== 'all') {
      filter.notificationType = type;
    }

    if (isRead !== null) {
      filter.notificationIsRead = isRead === 'true';
    }

    // Get notifications from database (using User collection with notification fields)
    const notifications = await User.aggregate([
      {
        $match: {
          notificationTitle: { $exists: true },
          notificationUserId: currentUser.userId,
          ...filter
        }
      },
      {
        $project: {
          _id: 1,
          title: '$notificationTitle',
          message: '$notificationMessage',
          type: '$notificationType',
          priority: '$notificationPriority',
          userId: '$notificationUserId',
          relatedId: '$notificationRelatedId',
          createdBy: '$notificationCreatedBy',
          createdDate: '$notificationCreatedDate',
          readAt: '$notificationReadAt',
          isRead: { $ifNull: ['$notificationIsRead', false] },
          actionUrl: '$notificationActionUrl',
          metadata: '$notificationMetadata'
        }
      },
      { $sort: { createdDate: -1 } },
      { $limit: limit }
    ]);

    // Get unread count
    const unreadCount = await User.countDocuments({
      notificationUserId: currentUser.userId,
      notificationIsRead: { $ne: true }
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationData = await request.json();

    // Create notification document
    const notificationId = new Date().getTime().toString();
    const newNotification = {
      _id: notificationId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'system',
      priority: notificationData.priority || 'Medium',
      userId: notificationData.userId || currentUser.userId,
      relatedId: notificationData.relatedId,
      createdBy: currentUser.userId,
      createdDate: new Date(),
      isRead: false,
      actionUrl: notificationData.actionUrl,
      metadata: notificationData.metadata
    };

    // Store notification using User collection with notification fields
    await User.create({
      email: `notification_${notificationId}@system.local`,
      name: `Notification_${notificationId}`,
      password: 'system123',
      role: 'system',
      notificationTitle: newNotification.title,
      notificationMessage: newNotification.message,
      notificationType: newNotification.type,
      notificationPriority: newNotification.priority,
      notificationUserId: newNotification.userId,
      notificationRelatedId: newNotification.relatedId,
      notificationCreatedBy: newNotification.createdBy,
      notificationCreatedDate: newNotification.createdDate,
      notificationIsRead: false,
      notificationActionUrl: newNotification.actionUrl,
      notificationMetadata: newNotification.metadata,
      isSystemDocument: true
    });

    return NextResponse.json({
      success: true,
      notification: newNotification,
      message: 'Notification created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, action, isRead } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Find the notification
    const notification = await User.findOne({
      email: `notification_${notificationId}@system.local`,
      isSystemDocument: true,
      notificationUserId: currentUser.userId
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Handle different actions
    const updateData: any = {};

    if (action === 'markAsRead' || isRead !== undefined) {
      updateData.notificationIsRead = isRead !== undefined ? isRead : true;
      if (updateData.notificationIsRead && !notification.notificationReadAt) {
        updateData.notificationReadAt = new Date();
      }
    }

    if (action === 'markAllAsRead') {
      // Mark all notifications for this user as read
      await User.updateMany(
        {
          notificationUserId: currentUser.userId,
          isSystemDocument: true,
          notificationIsRead: { $ne: true }
        },
        {
          notificationIsRead: true,
          notificationReadAt: new Date()
        }
      );

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    // Update single notification
    const updatedNotification = await User.findByIdAndUpdate(
      notification._id,
      updateData,
      { new: true }
    );

    const formattedNotification = {
      _id: notificationId,
      title: updatedNotification.notificationTitle,
      message: updatedNotification.notificationMessage,
      type: updatedNotification.notificationType,
      priority: updatedNotification.notificationPriority,
      userId: updatedNotification.notificationUserId,
      relatedId: updatedNotification.notificationRelatedId,
      createdBy: updatedNotification.notificationCreatedBy,
      createdDate: updatedNotification.notificationCreatedDate,
      readAt: updatedNotification.notificationReadAt,
      isRead: updatedNotification.notificationIsRead,
      actionUrl: updatedNotification.notificationActionUrl,
      metadata: updatedNotification.notificationMetadata
    };

    return NextResponse.json({
      success: true,
      notification: formattedNotification,
      message: 'Notification updated successfully'
    });

  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clearAll') {
      // Delete all read notifications for this user
      await User.deleteMany({
        notificationUserId: currentUser.userId,
        isSystemDocument: true,
        notificationIsRead: true
      });

      return NextResponse.json({
        success: true,
        message: 'All read notifications cleared'
      });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Delete specific notification
    const deletedNotification = await User.findOneAndDelete({
      email: `notification_${notificationId}@system.local`,
      isSystemDocument: true,
      notificationUserId: currentUser.userId
    });

    if (!deletedNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}