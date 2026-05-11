/**
 * /api/users — SyncFlow user CRUD (Prisma / lof_internal.syncflow)
 * Migrated from Mongoose. Same input/output contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/database/prisma';

// GET — list users (omits password)
export async function GET(request: NextRequest) {
  try {
    // ── Admin scoping: fetch only users assigned to this admin ───────────────
    // Read caller's identity from platform token header if present.
    // If the caller is a scoped admin, only return their assigned employees.
    const where: any = {};
    // ── Company filter (same concept as Horilla's selected_company) ───────────
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company');
    if (companyFilter) {
      where.companyId = companyFilter;
    }
    const authHeader = request.headers.get('authorization');
    const callerEmail = request.headers.get('x-caller-email'); // set by SyncFlow middleware/SSO

    if (callerEmail && authHeader) {
      try {
        const platformUrl = process.env.NEXT_PUBLIC_LOF_API_URL ?? 'http://localhost:8000';
        const scopeRes = await fetch(
          `${platformUrl}/scope/users?admin_email=${encodeURIComponent(callerEmail)}`,
          {
            headers: { 'Authorization': authHeader },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (scopeRes.ok) {
          const scopeData = await scopeRes.json();
          if (scopeData.scope === 'scoped' && Array.isArray(scopeData.emails)) {
            if (scopeData.emails.length === 0) {
              return NextResponse.json({ success: true, users: [] });
            }
            where.email = { in: scopeData.emails };
          }
        }
      } catch (scopeErr) {
        // Platform unreachable — fail permissive
        console.warn('[syncflow] scope check failed (non-fatal):', scopeErr);
      }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        empId: true,
        designation: true,
        vertex: true,
        profileImage: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST — create new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, empId, designation, vertex, profileImage, companyId } =
      await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }
    if (!['admin', 'user', 'client'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, user, or client' },
        { status: 400 }
      );
    }
    if (role === 'client' && !vertex) {
      return NextResponse.json(
        { error: 'Vertex is required for client users' },
        { status: 400 }
      );
    }

    const normEmail = email.toLowerCase().trim();
    const normEmpId = empId?.trim() || undefined;

    // Conflict check
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normEmail },
          ...(normEmpId ? [{ empId: normEmpId }] : []),
        ],
      },
    });
    if (existing) {
      const conflictField =
        existing.email === normEmail ? 'email' : 'employee ID';
      return NextResponse.json(
        { error: `User with this ${conflictField} already exists` },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normEmail,
        password: hashed,
        role,
        empId: normEmpId,
        designation: designation?.trim() || undefined,
        vertex: vertex?.trim() || undefined,
        profileImage: profileImage?.trim() || undefined,
        isActive: true,
        companyId: companyId ?? null,
      },
    });

    // ── Register in Platform global employee directory (fire-and-forget) ──────
    // Non-blocking: SyncFlow user already created — platform sync failure
    // must never fail the local creation.
    // Skip client role — clients are external contacts, not platform employees.
    if (role !== 'client') {
      const platformRole = role === 'admin' ? 'admin' : 'employee';
      _syncToPlatform({
        full_name:       user.name,
        email:           user.email,
        role:            platformRole,
        designation:     user.designation ?? undefined,
        syncflow_user_id: user.id,
      }).catch(err => console.warn('[syncflow] platform sync failed (non-fatal):', err));
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          empId: user.empId,
          designation: user.designation,
          vertex: user.vertex,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

/**
 * Sync a locally-created SyncFlow user into the Platform global employee
 * directory. Called fire-and-forget after local creation succeeds.
 */
async function _syncToPlatform(data: {
  full_name: string;
  email: string;
  role: string;
  designation?: string;
  syncflow_user_id: string;
}): Promise<void> {
  const platformUrl = process.env.NEXT_PUBLIC_LOF_API_URL ?? 'http://localhost:8000';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const serviceToken = process.env.PLATFORM_SERVICE_TOKEN;
  if (serviceToken) headers['Authorization'] = `Bearer ${serviceToken}`;

  const res = await fetch(`${platformUrl}/employees`, {
    method:  'POST',
    headers,
    body: JSON.stringify({
      full_name:   data.full_name,
      email:       data.email,
      role:        data.role,
      designation: data.designation,
    }),
  });

  if (res.ok) {
    console.log(`[syncflow] Synced ${data.email} to platform.employees`);
    return;
  }

  if (res.status === 409) {
    // Already exists — link the syncflow_user_id
    const getRes = await fetch(
      `${platformUrl}/employees/by-email/${encodeURIComponent(data.email)}`,
      { headers }
    );
    if (getRes.ok) {
      const emp = await getRes.json();
      await fetch(`${platformUrl}/employees/${emp.id}`, {
        method:  'PUT',
        headers,
        body: JSON.stringify({ syncflow_user_id: data.syncflow_user_id }),
      });
      console.log(`[syncflow] Linked syncflow_user_id for existing employee ${data.email}`);
    }
    return;
  }

  console.warn(`[syncflow] platform sync returned ${res.status} for ${data.email}`);
}

// PUT — update user
export async function PUT(request: NextRequest) {
  try {
    const { id, name, email, role, empId, designation, vertex, isActive } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (email && email.toLowerCase() !== user.email) {
      const clash = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), NOT: { id } },
      });
      if (clash) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email.toLowerCase().trim() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(empId !== undefined ? { empId: empId?.trim() || null } : {}),
        ...(designation !== undefined
          ? { designation: designation?.trim() || null }
          : {}),
        ...(vertex !== undefined ? { vertex: vertex?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        empId: updated.empId,
        designation: updated.designation,
        vertex: updated.vertex,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE — hard delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
