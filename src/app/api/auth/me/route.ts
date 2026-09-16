import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      language: user.language,
      community: user.community,
      assignedCell: user.assignedCell,
      points: user.points,
      badges: user.badges,
      referralCode: user.referralCode,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { language, name } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(language ? { language } : {}),
        ...(name ? { name } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        language: updated.language,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
