/**
 * /api/user/profile — current user's profile updates
 * (Prisma / lof_internal.syncflow). Migrated from Mongoose.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // ── Profile photo upload (multipart) ────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const profileImage = formData.get('profileImage') as File | null;
      if (!profileImage) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }

      // Inline base64 — for production swap to S3/CDN
      const bytes = await profileImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = `data:${profileImage.type};base64,${buffer.toString('base64')}`;

      const updated = await prisma.user.update({
        where: { id: currentUser.userId },
        data: { profileImage: base64Image },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          empId: true,
          designation: true,
          vertex: true,
          profileImage: true,
        },
      });

      return NextResponse.json({
        success: true,
        imageUrl: base64Image,
        user: updated,
        message: 'Profile photo updated successfully',
      });
    }

    // ── JSON: email or password update ──────────────────────────────────────
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Email update
    if (email) {
      const clash = await prisma.user.findFirst({
        where: { email, NOT: { id: currentUser.userId } },
      });
      if (clash) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      const updated = await prisma.user.update({
        where: { id: currentUser.userId },
        data: { email },
      });
      return NextResponse.json({
        success: true,
        message: 'Email updated successfully',
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          empId: updated.empId,
          designation: updated.designation,
          vertex: updated.vertex,
        },
      });
    }

    // Password update
    if (currentPassword && newPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: currentUser.userId },
        data: { password: hashed },
      });
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    }

    return NextResponse.json(
      { error: 'No update data provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('User profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
