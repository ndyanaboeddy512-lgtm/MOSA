import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") || "tree"; // "tree" | "sectors" | "cells"
  const sectorName = searchParams.get("sector");

  try {
    if (level === "sectors") {
      const sectors = await prisma.geographicSector.findMany({
        include: {
          districtRel: {
            include: { province: true },
          },
          cells: {
            include: {
              localAreas: true,
              _count: { select: { businesses: true } },
            },
          },
          _count: { select: { businesses: true, agents: true, demands: true } },
        },
        orderBy: { name: "asc" },
      });
      
      // Format with clean property names
      const formatted = sectors.map((s: any) => ({
        id: s.id,
        name: s.name,
        nameRw: s.nameRw,
        district: {
          id: s.districtRel?.id,
          name: s.districtRel?.name,
          nameRw: s.districtRel?.nameRw,
          province: {
            id: s.districtRel?.province?.id,
            name: s.districtRel?.province?.name,
            nameRw: s.districtRel?.province?.nameRw,
          },
        },
        cells: (s.cells || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          nameRw: c.nameRw,
          localAreas: c.localAreas,
          _count: c._count,
        })),
        _count: s._count,
      }));

      return NextResponse.json({ success: true, sectors: formatted });
    }

    if (level === "cells" && sectorName) {
      const cells = await prisma.geographicCell.findMany({
        where: {
          sectorRel: { name: { equals: sectorName, mode: "insensitive" } },
        },
        include: {
          localAreas: true,
          _count: { select: { businesses: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, cells });
    }

    // Default: full tree of provinces -> districts -> sectors -> cells -> local areas
    const provinces = await prisma.geographicProvince.findMany({
      include: {
        districts: {
          include: {
            sectors: {
              include: {
                cells: {
                  include: {
                    localAreas: true,
                    _count: { select: { businesses: true } },
                  },
                },
                _count: { select: { businesses: true, agents: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const counts = {
      provinces: provinces.length,
      districts: provinces.reduce((acc, p) => acc + p.districts.length, 0),
      sectors: provinces.reduce((acc, p) => acc + p.districts.reduce((dAcc, d) => dAcc + d.sectors.length, 0), 0),
      cells: provinces.reduce((acc, p) => acc + p.districts.reduce((dAcc, d) => dAcc + d.sectors.reduce((sAcc, s) => sAcc + s.cells.length, 0), 0), 0),
    };

    return NextResponse.json({
      success: true,
      counts,
      provinces,
    });
  } catch (error) {
    console.error("[Geo API] Error loading geographic hierarchy:", error);
    return NextResponse.json(
      { error: "Failed to load geographic data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.COMMUNITY_ADMIN && user.role !== Role.COMMUNITY_AGENT)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sectorId, cellId, name, nameRw, type = "LANDMARK", addressNote, latitude, longitude } = body;

    let targetSectorId = sectorId;
    if (!targetSectorId && cellId) {
      const cell = await prisma.geographicCell.findUnique({ where: { id: cellId } });
      if (cell) targetSectorId = cell.sectorId;
    }

    if (!targetSectorId || !name) {
      return NextResponse.json(
        { error: "sectorId and name are required" },
        { status: 400 }
      );
    }

    const localArea = await prisma.localArea.create({
      data: {
        sectorId: targetSectorId,
        cellId: cellId || null,
        name,
        nameRw: nameRw || name,
        type,
        addressNote: addressNote || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      action: "CREATE_LOCAL_AREA",
      entityType: "LOCAL_AREA",
      entityId: localArea.id,
      metadata: { name, type, cellId, sectorId: targetSectorId },
    });

    return NextResponse.json({ success: true, localArea }, { status: 201 });
  } catch (error) {
    console.error("[Geo API] Error creating local area:", error);
    return NextResponse.json(
      { error: "Failed to create local area" },
      { status: 500 }
    );
  }
}
