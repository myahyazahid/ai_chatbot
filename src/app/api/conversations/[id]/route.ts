import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(conversation);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const { title } = await request.json();
  if (typeof title !== "string" || !title.trim()) {
    return new NextResponse("Invalid title", { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id },
    data: { title: title.trim() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const result = await prisma.conversation.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(null, { status: 204 });
}
