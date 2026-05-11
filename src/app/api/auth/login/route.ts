/**
 * /api/auth/login — legacy email/password login (Prisma / lof_internal.syncflow)
 *
 * NOTE: SyncFlow's primary auth is the LOF Portal SSO flow (/api/auth/lof-sso).
 * This route remains as a fallback for local accounts created with a real
 * password. SSO-provisioned users have an unusable random hashed password
 * and cannot use this route.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/database/prisma';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact administrator.' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken(updated);

    const userData = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      empId: updated.empId,
      designation: updated.designation,
      vertex: updated.vertex,
      lastLogin: updated.lastLogin,
    };

    console.log('Login successful for user:', userData.email, 'Role:', userData.role);
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
