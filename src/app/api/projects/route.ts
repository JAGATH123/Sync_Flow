import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import Project from '@/models/Project';
import User from '@/models/User';
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
    const status = searchParams.get('status');
    const vertex = searchParams.get('vertex');
    const priority = searchParams.get('priority');

    // Build filter based on user role and query params
    let filter: any = { isArchived: false };

    // Role-based filtering
    if (currentUser.role === 'client') {
      // Clients can only see projects from their vertex
      const user = await User.findById(currentUser.userId);
      if (user?.vertex) {
        filter.vertex = user.vertex;
      }
    } else if (currentUser.role === 'user') {
      // Users can see projects they're assigned to or from their vertex
      const user = await User.findById(currentUser.userId);
      if (user?.vertex) {
        filter.$or = [
          { assignedTo: { $in: [currentUser.userId] } },
          { vertex: user.vertex },
          { createdBy: currentUser.userId }
        ];
      }
    }

    // Apply additional filters
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (vertex && vertex !== 'all') {
      filter.vertex = vertex;
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    const projects = await Project.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, projects });

  } catch (error) {
    console.error('Projects GET error:', error);
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

    // Only admins and users can create projects
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projectData = await request.json();

    // Find assigned users
    const assignedUsers = [];
    if (projectData.assignedTo && projectData.assignedTo.length > 0) {
      for (const userIdentifier of projectData.assignedTo) {
        const user = await User.findOne({
          $or: [
            { name: userIdentifier },
            { email: userIdentifier },
            { _id: userIdentifier }
          ]
        });
        if (user) {
          assignedUsers.push(user._id);
        }
      }
    }

    // Create the project
    const newProject = await Project.create({
      name: projectData.name,
      description: projectData.description,
      assignedTo: assignedUsers,
      status: projectData.status || 'Planning',
      priority: projectData.priority || 'Medium',
      startDate: new Date(projectData.startDate),
      endDate: new Date(projectData.endDate),
      createdDate: new Date(),
      client: projectData.client,
      clientEmail: projectData.clientEmail,
      vertex: projectData.vertex,
      budget: projectData.budget || 0,
      actualCost: 0,
      progress: 0,
      milestones: projectData.milestones || [],
      tags: projectData.tags || [],
      attachments: projectData.attachments || [],
      createdBy: currentUser.userId,
      isArchived: false
    });

    // Populate the created project
    const populatedProject = await Project.findById(newProject._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      project: populatedProject,
      message: 'Project created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Projects POST error:', error);
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

    const { projectId, progress, status, actualCost, milestones, attachments } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check permissions
    if (currentUser.role === 'user') {
      // Users can only update projects they're assigned to or created
      const isAssigned = project.assignedTo.some(userId => userId.toString() === currentUser.userId);
      const isCreator = project.createdBy.toString() === currentUser.userId;

      if (!isAssigned && !isCreator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update project fields
    const updateData: any = { updatedBy: currentUser.userId, updatedAt: new Date() };

    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));

      // Auto-update status based on progress
      if (updateData.progress === 100) {
        updateData.status = 'Completed';
        updateData.completionDate = new Date();
      } else if (updateData.progress > 0 && project.status === 'Planning') {
        updateData.status = 'In Progress';
      }
    }

    if (status) {
      updateData.status = status;
      if (status === 'Completed' && !project.completionDate) {
        updateData.completionDate = new Date();
        updateData.progress = 100;
      }
    }

    if (actualCost !== undefined) {
      updateData.actualCost = actualCost;
    }

    if (milestones) {
      updateData.milestones = milestones;
    }

    if (attachments) {
      updateData.attachments = attachments;
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Projects PUT error:', error);
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

    // Only admins can delete projects
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Archive the project instead of deleting
    const archivedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        isArchived: true,
        archivedBy: currentUser.userId,
        archivedAt: new Date()
      },
      { new: true }
    );

    if (!archivedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully'
    });

  } catch (error) {
    console.error('Projects DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}