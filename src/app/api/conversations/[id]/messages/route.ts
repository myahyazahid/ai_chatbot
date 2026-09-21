import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const roles = new Set(["user", "assistant", "system"]);

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(conversation.messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const { role, content } = await request.json();
  if (typeof content !== "string" || typeof role !== "string" || !roles.has(role)) {
    return new NextResponse("Invalid message", { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const message = await prisma.message.create({
    data: { role, content, conversationId: id },
  });
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message);
}
