import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import User from '@/models/User';

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, empId, designation, vertex, profileImage } = await request.json();

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'user', 'client'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, user, or client' },
        { status: 400 }
      );
    }

    // Validate client-specific requirements
    if (role === 'client' && !vertex) {
      return NextResponse.json(
        { error: 'Vertex is required for client users' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Check if user already exists
    const queryConditions = [
      { email: email.toLowerCase() }
    ];

    // Only check empId if it's provided and not empty
    if (empId && empId.trim()) {
      queryConditions.push({ empId: empId.trim() });
    }

    const existingUser = await User.findOne({
      $or: queryConditions
    });

    if (existingUser) {
      const conflictField = existingUser.email === email.toLowerCase() ? 'email' : 'employee ID';
      return NextResponse.json(
        { error: `User with this ${conflictField} already exists` },
        { status: 409 }
      );
    }

    // Create new user
    const userData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      isActive: true
    };

    // Add optional fields if provided
    if (empId && empId.trim()) userData.empId = empId.trim();
    if (designation && designation.trim()) userData.designation = designation.trim();
    if (vertex && vertex.trim()) userData.vertex = vertex.trim();
    if (profileImage && profileImage.trim()) userData.profileImage = profileImage.trim();

    const user = new User(userData);
    await user.save();

    // Return user data (without password)
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      empId: user.empId,
      designation: user.designation,
      vertex: user.vertex,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: responseUser
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const { id, name, email, role, empId, designation, vertex, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for email conflicts (excluding current user)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update fields
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (role !== undefined) user.role = role;
    if (empId !== undefined) user.empId = empId?.trim() || null;
    if (designation !== undefined) user.designation = designation?.trim() || null;
    if (vertex !== undefined) user.vertex = vertex?.trim() || null;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Return updated user data (without password)
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      empId: user.empId,
      designation: user.designation,
      vertex: user.vertex,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: responseUser
    });

  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user completely from database
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Complete deletion from database
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}