import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

interface Broadcast {
  _id?: string;
  title: string;
  message: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdBy: string;
  createdByName: string;
  createdDate: Date;
  targetUsers?: string[];
  readBy?: string[];
  vertex?: string;
  isArchived: boolean;
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
    const category = searchParams.get('category');
    const vertex = searchParams.get('vertex');

    // Build filter based on user role
    let filter: any = { isArchived: false };

    // Role-based filtering
    if (currentUser.role === 'client') {
      // Clients can only see broadcasts targeted to their vertex
      const user = await User.findById(currentUser.userId);
      if (user?.vertex) {
        filter.vertex = user.vertex;
      }
    } else if (currentUser.role === 'user') {
      // Users can see all broadcasts or those targeted to them
      const user = await User.findById(currentUser.userId);
      if (user?.vertex) {
        filter.$or = [
          { targetUsers: { $in: [currentUser.userId] } },
          { vertex: user.vertex },
          { targetUsers: { $exists: false } } // General broadcasts
        ];
      }
    }

    // Apply additional filters
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (vertex && vertex !== 'all') {
      filter.vertex = vertex;
    }

    // Get broadcasts from database (we'll use User collection for now with broadcast-specific fields)
    const broadcasts = await User.aggregate([
      {
        $match: {
          broadcastTitle: { $exists: true },
          isArchived: { $ne: true }
        }
      },
      {
        $project: {
          _id: 1,
          title: '$broadcastTitle',
          message: '$broadcastMessage',
          category: '$broadcastCategory',
          priority: '$broadcastPriority',
          createdBy: '$_id',
          createdByName: '$name',
          createdDate: '$broadcastCreatedDate',
          targetUsers: '$broadcastTargetUsers',
          readBy: '$broadcastReadBy',
          vertex: '$broadcastVertex',
          isArchived: { $ifNull: ['$broadcastIsArchived', false] }
        }
      },
      { $sort: { createdDate: -1 } }
    ]);

    return NextResponse.json({ success: true, broadcasts });

  } catch (error) {
    console.error('Broadcasts GET error:', error);
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

    // Only admins and users can create broadcasts
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const broadcastData = await request.json();

    // Get creator info
    const creator = await User.findById(currentUser.userId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 400 });
    }

    // Create broadcast document
    const broadcastId = new Date().getTime().toString();
    const newBroadcast = {
      _id: broadcastId,
      title: broadcastData.title,
      message: broadcastData.message,
      category: broadcastData.category,
      priority: broadcastData.priority || 'Medium',
      createdBy: currentUser.userId,
      createdByName: creator.name,
      createdDate: new Date(),
      targetUsers: broadcastData.targetUsers || [],
      readBy: [],
      vertex: broadcastData.vertex,
      isArchived: false
    };

    // Store broadcast in a separate collection document
    // For now, we'll use a workaround by creating a document in User collection with broadcast data
    await User.create({
      email: `broadcast_${broadcastId}@system.local`,
      name: `Broadcast_${broadcastId}`,
      password: 'system123',
      role: 'system',
      broadcastTitle: newBroadcast.title,
      broadcastMessage: newBroadcast.message,
      broadcastCategory: newBroadcast.category,
      broadcastPriority: newBroadcast.priority,
      broadcastCreatedBy: newBroadcast.createdBy,
      broadcastCreatedByName: newBroadcast.createdByName,
      broadcastCreatedDate: newBroadcast.createdDate,
      broadcastTargetUsers: newBroadcast.targetUsers,
      broadcastReadBy: newBroadcast.readBy,
      broadcastVertex: newBroadcast.vertex,
      broadcastIsArchived: false,
      isSystemDocument: true
    });

    return NextResponse.json({
      success: true,
      broadcast: newBroadcast,
      message: 'Broadcast created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Broadcasts POST error:', error);
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

    const { broadcastId, action, readBy } = await request.json();

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 });
    }

    // Find the broadcast
    const broadcast = await User.findOne({
      email: `broadcast_${broadcastId}@system.local`,
      isSystemDocument: true
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'markAsRead') {
      // Add user to readBy array if not already present
      const readByArray = broadcast.broadcastReadBy || [];
      if (!readByArray.includes(currentUser.userId)) {
        readByArray.push(currentUser.userId);
        await User.findByIdAndUpdate(broadcast._id, {
          broadcastReadBy: readByArray
        });
      }
    } else if (action === 'archive') {
      // Only creator or admin can archive
      if (currentUser.role !== 'admin' && broadcast.broadcastCreatedBy !== currentUser.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await User.findByIdAndUpdate(broadcast._id, {
        broadcastIsArchived: true
      });
    }

    // Get updated broadcast
    const updatedBroadcast = await User.findById(broadcast._id);
    const formattedBroadcast = {
      _id: broadcastId,
      title: updatedBroadcast.broadcastTitle,
      message: updatedBroadcast.broadcastMessage,
      category: updatedBroadcast.broadcastCategory,
      priority: updatedBroadcast.broadcastPriority,
      createdBy: updatedBroadcast.broadcastCreatedBy,
      createdByName: updatedBroadcast.broadcastCreatedByName,
      createdDate: updatedBroadcast.broadcastCreatedDate,
      targetUsers: updatedBroadcast.broadcastTargetUsers,
      readBy: updatedBroadcast.broadcastReadBy,
      vertex: updatedBroadcast.broadcastVertex,
      isArchived: updatedBroadcast.broadcastIsArchived
    };

    return NextResponse.json({
      success: true,
      broadcast: formattedBroadcast,
      message: 'Broadcast updated successfully'
    });

  } catch (error) {
    console.error('Broadcasts PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}