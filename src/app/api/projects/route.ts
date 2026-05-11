/**
 * /api/projects — SyncFlow projects (Prisma / lof_internal.syncflow)
 * Migrated from Mongoose. Schema is leaner than the old Mongoose code
 * (which referenced fields that weren't in the Mongoose model — see
 * src/models/Project.ts). Only fields actually defined in our Prisma
 * Project model are persisted.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/auth';
import { vertexCompanyWhere } from '@/lib/company-filter';

const userBrief = { select: { id: true, name: true, email: true } };

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vertexParam = searchParams.get('vertex');

    // ── Company filter (mirrors Horilla's CompanyMiddleware) ──────────────────
    const companySlug = searchParams.get('company');
    const where: any = { isArchived: false, ...vertexCompanyWhere(companySlug) };

    if (currentUser.role === 'client') {
      const me = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { vertex: true },
      });
      if (me?.vertex) where.vertex = me.vertex;
    } else if (currentUser.role === 'user') {
      const me = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { vertex: true },
      });
      const orFilters: any[] = [{ createdById: currentUser.userId }];
      if (me?.vertex) orFilters.push({ vertex: me.vertex });
      where.OR = orFilters;
    }

    if (status && status !== 'all') where.status = status;
    if (vertexParam && vertexParam !== 'all') where.vertex = vertexParam;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: userBrief,
        updatedBy: userBrief,
        clientUser: userBrief,
      },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const p = await request.json();

    const project = await prisma.project.create({
      data: {
        name: p.name,
        description: p.description ?? null,
        client: p.client ?? null,
        clientId: p.clientId ?? null,
        vertex: p.vertex ?? null,
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
        status: p.status ?? 'Not Started',
        typeOfWork: p.typeOfWork ?? null,
        estimatedHours: p.estimatedHours ?? null,
        actualHours: p.actualHours ?? null,
        budget: p.budget ?? null,
        createdById: currentUser.userId,
      },
      include: {
        createdBy: userBrief,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Project created successfully',
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, status, actualHours, estimatedHours, budget, name, description } =
      await request.json();
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (currentUser.role === 'user' && project.createdById !== currentUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: any = { updatedById: currentUser.userId };
    if (status !== undefined) data.status = status;
    if (actualHours !== undefined) data.actualHours = actualHours;
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours;
    if (budget !== undefined) data.budget = budget;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
      include: { createdBy: userBrief, updatedBy: userBrief },
    });

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      project: updated,
    });
  } catch (error) {
    console.error('Projects PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { isArchived: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully',
      project,
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.error('Projects DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
