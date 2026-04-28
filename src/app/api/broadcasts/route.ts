import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import User from '@/models/User';
import Broadcast from '@/models/Broadcast';
import { getCurrentUser } from '@/lib/auth';

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
          { targetUsers: { $size: 0 } } // General broadcasts
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

    // Get broadcasts from database
    const broadcasts = await Broadcast.find(filter)
      .sort({ createdDate: -1 })
      .limit(100);

    // Enrich broadcasts with user profile images
    const enrichedBroadcasts = await Promise.all(
      broadcasts.map(async (broadcast) => {
        const broadcastObj = broadcast.toJSON();
        try {
          const user = await User.findById(broadcast.createdBy).select('profileImage');
          if (user && user.profileImage) {
            broadcastObj.createdByAvatar = user.profileImage;
          }
        } catch (error) {
          console.error('Error fetching user profile image:', error);
        }
        return broadcastObj;
      })
    );

    return NextResponse.json({ success: true, broadcasts: enrichedBroadcasts });

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
    const newBroadcast = await Broadcast.create({
      title: broadcastData.title,
      message: broadcastData.message,
      category: broadcastData.category || 'general',
      priority: broadcastData.priority || 'Medium',
      createdBy: currentUser.userId,
      createdByName: creator.name,
      createdDate: new Date(),
      targetUsers: broadcastData.targetUsers || [],
      readBy: [],
      vertex: broadcastData.vertex || creator.vertex,
      isArchived: false
    });

    return NextResponse.json({
      success: true,
      broadcast: newBroadcast,
      message: 'Broadcast created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Broadcasts POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { broadcastId, action } = await request.json();

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 });
    }

    // Find the broadcast
    const broadcast = await Broadcast.findById(broadcastId);

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'markAsRead') {
      // Add user to readBy array if not already present
      const readByArray = broadcast.readBy || [];
      if (!readByArray.includes(currentUser.userId)) {
        readByArray.push(currentUser.userId);
        await Broadcast.findByIdAndUpdate(broadcastId, {
          readBy: readByArray
        });
      }
    } else if (action === 'archive') {
      // Only creator or admin can archive
      if (currentUser.role !== 'admin' && broadcast.createdBy !== currentUser.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await Broadcast.findByIdAndUpdate(broadcastId, {
        isArchived: true
      });
    }

    // Get updated broadcast
    const updatedBroadcast = await Broadcast.findById(broadcastId);

    return NextResponse.json({
      success: true,
      broadcast: updatedBroadcast,
      message: 'Broadcast updated successfully'
    });

  } catch (error) {
    console.error('Broadcasts PUT error:', error);
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

    // Get broadcast ID from query parameters
    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get('id');

    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 });
    }

    // Find the broadcast
    const broadcast = await Broadcast.findById(broadcastId);
    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    // Only admins or the creator can delete broadcasts
    if (currentUser.role !== 'admin' && broadcast.createdBy !== currentUser.userId) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own broadcasts' }, { status: 403 });
    }

    // Delete the broadcast
    await Broadcast.findByIdAndDelete(broadcastId);

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully'
    });

  } catch (error) {
    console.error('Broadcasts DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
