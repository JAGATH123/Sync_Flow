/**
 * /api/broadcasts — SyncFlow broadcasts CRUD (Prisma / lof_internal.syncflow)
 * Migrated from Mongoose. Same contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { getCurrentUser } from '@/lib/auth';
import { vertexCompanyWhere } from '@/lib/company-filter';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
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
      if (me?.vertex) {
        where.OR = [
          { targetUsers: { has: currentUser.userId } },
          { vertex: me.vertex },
          { targetUsers: { isEmpty: true } },
        ];
      }
    }

    if (category && category !== 'all') where.category = category;
    if (vertexParam && vertexParam !== 'all') where.vertex = vertexParam;

    const broadcasts = await prisma.broadcast.findMany({
      where,
      orderBy: { createdDate: 'desc' },
      take: 100,
    });

    // Enrich with creator profile image (createdById is a plain string here,
    // matching the old Mongoose schema)
    const creatorIds = Array.from(new Set(broadcasts.map((b) => b.createdById)));
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, profileImage: true },
    });
    const avatarById = new Map(creators.map((u) => [u.id, u.profileImage]));

    const enriched = broadcasts.map((b) => ({
      ...b,
      createdByAvatar: avatarById.get(b.createdById) ?? undefined,
    }));

    return NextResponse.json({ success: true, broadcasts: enriched });
  } catch (error) {
    console.error('Broadcasts GET error:', error);
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

    const data = await request.json();

    const creator = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { name: true, vertex: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 400 });
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title,
        message: data.message,
        category: data.category ?? 'general',
        priority: data.priority ?? 'Medium',
        createdById: currentUser.userId,
        createdByName: creator.name,
        targetUsers: data.targetUsers ?? [],
        readBy: [],
        vertex: data.vertex ?? creator.vertex ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Broadcast created successfully',
        broadcast,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Broadcasts POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message ?? 'Unknown error',
      },
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

    const { broadcastId, action } = await request.json();
    if (!broadcastId) {
      return NextResponse.json(
        { error: 'Broadcast ID is required' },
        { status: 400 }
      );
    }

    const b = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!b) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 });
    }

    let updated = b;

    if (action === 'markAsRead') {
      if (!b.readBy.includes(currentUser.userId)) {
        updated = await prisma.broadcast.update({
          where: { id: broadcastId },
          data: { readBy: { push: currentUser.userId } },
        });
      }
    } else if (action === 'archive') {
      if (currentUser.role !== 'admin' && b.createdById !== currentUser.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      updated = await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { isArchived: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast updated successfully',
      broadcast: updated,
    });
  } catch (error) {
    console.error('Broadcasts PUT error:', error);
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

    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get('id');
    if (!broadcastId) {
      return NextResponse.json(
        { error: 'Broadcast ID is required' },
        { status: 400 }
      );
    }

    const b = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
    if (!b) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }
    if (currentUser.role !== 'admin' && b.createdById !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own broadcasts' },
        { status: 403 }
      );
    }

    await prisma.broadcast.delete({ where: { id: broadcastId } });

    return NextResponse.json({
      success: true,
      message: 'Broadcast deleted successfully',
    });
  } catch (error) {
    console.error('Broadcasts DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
