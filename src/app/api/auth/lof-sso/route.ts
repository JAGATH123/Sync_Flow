/**
 * LOF Portal SSO Exchange — SyncFlow
 * ────────────────────────────────────
 * Accepts a LOF platform JWT, validates it against the platform backend
 * (/auth/me), syncs the user into SyncFlow's DB, and returns a
 * SyncFlow-scoped JWT.
 *
 * The platform backend returns FULL HR identity sourced from Horilla:
 *   email, employee_id, badge_id, department, job_role, job_position,
 *   manager_email, full_name
 *
 * These are written into SyncFlow's User row on every login so the
 * CRM always reflects the current HR record (department moves,
 * role changes, etc.) without any manual sync.
 *
 * Role mapping  (LOF platform → SyncFlow):
 *   super_admin  →  admin
 *   admin        →  admin
 *   manager      →  admin    (managers need full CRM access)
 *   trainer      →  user
 *   employee     →  user
 *   (client contacts are created manually, not via SSO)
 *
 * SyncFlow User fields filled from HR:
 *   empId       ← lofUser.employee_id  (Horilla employee table ID)
 *   designation ← lofUser.job_role     (e.g. "Senior Trainer")
 *   vertex      ← lofUser.department   (e.g. "TRG", "LOF Curriculum")
 *   email       ← lofUser.email        (real work email, NOT @lof.internal)
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/database/prisma';
import { generateToken } from '@/lib/auth';

const LOF_API =
  process.env.NEXT_PUBLIC_LOF_API_URL ?? 'http://localhost:8000';

function mapRole(lofRole?: string): 'admin' | 'user' | 'client' {
  switch ((lofRole ?? '').toLowerCase()) {
    case 'super_admin':
    case 'admin':
    case 'manager':
      return 'admin';
    case 'trainer':
    case 'employee':
    default:
      return 'user';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { lof_token } = await request.json();
    if (!lof_token) {
      return NextResponse.json(
        { success: false, error: 'lof_token is required' },
        { status: 400 },
      );
    }

    // ── 1. Validate the LOF platform token → get full HR identity ──────────
    const meRes = await fetch(`${LOF_API}/auth/me`, {
      headers: { Authorization: `Bearer ${lof_token}` },
      cache: 'no-store',
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid or expired LOF token (HTTP ${meRes.status})` },
        { status: 401 },
      );
    }

    /**
     * Platform /auth/me returns (all sourced from Horilla HR):
     * {
     *   id, username, role, full_name,
     *   email,         ← real work email
     *   employee_id,   ← hr.employee_employee.id
     *   badge_id,      ← LOF badge number
     *   department,    ← department name  (maps to SyncFlow `vertex`)
     *   job_role,      ← job role name    (maps to SyncFlow `designation`)
     *   job_position,  ← job position name
     *   manager_email  ← reporting manager's email
     * }
     */
    const lofUser = await meRes.json();

    const email       = lofUser.email ?? `${lofUser.username}@lof.internal`.toLowerCase();
    const name        = (lofUser.full_name ?? lofUser.username ?? 'LOF User').trim();
    const role        = mapRole(lofUser.role);
    const empId       = lofUser.employee_id ?? null;
    const designation = lofUser.job_role    ?? null;   // "Senior Trainer", "Manager" …
    const vertex      = lofUser.department  ?? null;   // "TRG", "LOF Curriculum" …
    // company_slug from platform JWT (e.g. "trg", "lof", "cmis")
    const companyId   = lofUser.company_slug ?? lofUser.company_id ?? null;

    // ── 2. Find or create / sync the SyncFlow user ─────────────────────────
    // Look up by empId first (most stable), then by email
    let user = empId
      ? await prisma.user.findUnique({ where: { empId } })
      : null;

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      const randomPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString('hex'),
        12,
      );
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: randomPassword,
          role,
          empId,
          designation,
          vertex,
          isActive: true,
          companyId,
        },
      });
    } else {
      if (!user.isActive) {
        return NextResponse.json(
          { success: false, error: 'Your SyncFlow account is deactivated. Contact an administrator.' },
          { status: 403 },
        );
      }

      // Sync ALL HR fields on every login — department moves, promotions etc.
      // are reflected immediately without any manual admin action.
      const updates: Record<string, unknown> = { lastLogin: new Date() };
      if (user.role        !== role)        updates.role        = role;
      if (user.name        !== name)        updates.name        = name;
      if (user.email       !== email)       updates.email       = email;
      if (user.empId       !== empId)       updates.empId       = empId;
      if (user.designation !== designation) updates.designation = designation;
      if (user.vertex      !== vertex)      updates.vertex      = vertex;
      if (user.companyId   !== companyId)   updates.companyId   = companyId;

      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }

    // ── 3. Issue a SyncFlow JWT ─────────────────────────────────────────────
    const token = generateToken(user);

    return NextResponse.json({
      success: true,
      message: 'SSO login successful',
      token,
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        isActive:    user.isActive,
        empId:       user.empId,
        designation: user.designation,
        vertex:      user.vertex,
        profileImage: user.profileImage,
      },
    });

  } catch (error: any) {
    console.error('[SyncFlow SSO] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? 'SSO authentication failed' },
      { status: 500 },
    );
  }
}
