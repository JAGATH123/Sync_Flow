import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const profileImage = formData.get('profileImage') as File;

      if (!profileImage) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }

      // Convert file to base64 for storage (in production, use cloud storage like S3)
      const bytes = await profileImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = `data:${profileImage.type};base64,${buffer.toString('base64')}`;

      // Update user profile image
      const updatedUser = await User.findByIdAndUpdate(
        currentUser.userId,
        { profileImage: base64Image },
        { new: true, runValidators: true }
      ).select('-password');

      return NextResponse.json({
        success: true,
        imageUrl: base64Image,
        user: updatedUser,
        message: 'Profile photo updated successfully'
      });
    }

    // Handle JSON data (email/password updates)
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    // Need to explicitly select password field since it's excluded by default
    const user = await User.findById(currentUser.userId).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update email
    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: currentUser.userId } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      user.email = email;
      await user.save();

      return NextResponse.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          empId: user.empId,
          designation: user.designation,
          vertex: user.vertex,
        },
        message: 'Email updated successfully'
      });
    }

    // Update password
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    }

    return NextResponse.json({ error: 'No update data provided' }, { status: 400 });

  } catch (error) {
    console.error('User profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
