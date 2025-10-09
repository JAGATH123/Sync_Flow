import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import Task from '@/models/Task';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { emitTaskUpdated } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const vertex = searchParams.get('vertex');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');

    // Build filter based on user role and query params
    let filter: any = { isArchived: false };

    // Role-based filtering
    if (currentUser.role === 'client') {
      // Clients can only see tasks from their vertex
      const user = await User.findById(currentUser.userId);
      if (user?.vertex) {
        filter.vertex = user.vertex;
      }
    } else if (currentUser.role === 'user') {
      // Users can see all tasks, but we might want to limit this in the future
    }

    // Apply additional filters
    if (vertex && vertex !== 'all') {
      filter.vertex = vertex;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (assignedTo) {
      filter.assignedToName = assignedTo;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, tasks });

  } catch (error) {
    console.error('Tasks GET error:', error);
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

    // Only admins and users can create tasks
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const taskData = await request.json();

    // Find the assigned user
    const assignedUser = await User.findOne({
      $or: [
        { name: taskData.assignedTo },
        { email: taskData.assigneeEmail }
      ]
    });

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
    }

    // Create the task
    const newTask = await Task.create({
      name: taskData.name,
      assignedTo: assignedUser._id,
      assignedToName: assignedUser.name,
      assigneeEmail: assignedUser.email,
      status: 'Not Started',
      progress: 0,
      startDate: new Date(taskData.startDate),
      endDate: new Date(taskData.endDate),
      createdDate: new Date(),
      client: taskData.client,
      clientEmail: taskData.clientEmail,
      vertex: taskData.vertex,
      typeOfWork: taskData.typeOfWork,
      category: taskData.category,
      workingHours: taskData.workingHours,
      estimatedCost: taskData.estimatedCost,
      priority: taskData.priority,
      remarks: taskData.remarks,
      createdBy: currentUser.userId,
      isArchived: false
    });

    // Populate the created task
    const populatedTask = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Format the response to ensure proper field mapping
    const responseTask = {
      ...populatedTask.toJSON(),
      _id: populatedTask._id,
      assignedToName: populatedTask.assignedToName,
      assignedTo: populatedTask.assignedTo,
      startDate: populatedTask.startDate.toISOString(),
      endDate: populatedTask.endDate.toISOString(),
      createdDate: populatedTask.createdDate.toISOString(),
      completionDate: populatedTask.completionDate ? populatedTask.completionDate.toISOString() : undefined,
    };

    return NextResponse.json({
      success: true,
      task: responseTask,
      message: 'Task created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Tasks POST error:', error);
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
      reviewStatus
    } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions
    if (currentUser.role === 'user') {
      // Users can only update their own tasks
      if (task.assignedTo.toString() !== currentUser.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update task fields
    const updateData: any = { updatedBy: currentUser.userId };

    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));

      // Auto-update status based on progress
      if (updateData.progress === 100) {
        updateData.status = 'Delivered';
        updateData.completionDate = new Date();
      } else if (updateData.progress > 0) {
        updateData.status = 'In Progress';
      }
    }

    if (actualWorkingHours !== undefined) {
      updateData.actualWorkingHours = actualWorkingHours;
    }

    if (status) {
      updateData.status = status;
    }

    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    if (assignedTo && currentUser.role === 'admin') {
      // Find the user by name to get their ID and email
      const assignedUser = await User.findOne({ name: assignedTo });
      if (assignedUser) {
        updateData.assignedTo = assignedUser._id;
        updateData.assignedToName = assignedUser.name;
        updateData.assigneeEmail = assignedUser.email;
      }
    }

    if (startDate && currentUser.role === 'admin') {
      updateData.startDate = new Date(startDate);
    }

    if (endDate && currentUser.role === 'admin') {
      updateData.endDate = new Date(endDate);
    }

    if (priority && currentUser.role === 'admin') {
      updateData.priority = priority;
    }

    if (reviewStatus && currentUser.role === 'admin') {
      updateData.reviewStatus = reviewStatus;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

    // Emit real-time event
    emitTaskUpdated(updatedTask);

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Tasks PUT error:', error);
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

    // Only admins can delete tasks
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const taskIds = searchParams.get('ids');

    if (!taskIds) {
      return NextResponse.json({ error: 'Task IDs are required' }, { status: 400 });
    }

    const idsArray = taskIds.split(',');

    // Instead of hard delete, mark as archived for data integrity
    const result = await Task.updateMany(
      { _id: { $in: idsArray } },
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: currentUser.userId
      }
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} tasks deleted successfully`,
      deletedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Tasks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}