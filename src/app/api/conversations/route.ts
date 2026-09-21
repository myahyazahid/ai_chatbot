import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const roles = new Set(["user", "assistant", "system"]);
type IncomingMessage = { id?: string; role: string; content: string };

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : null;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt.getTime(),
      updatedAt: conversation.updatedAt.getTime(),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.getTime(),
      })),
    }))
  );
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : null;
  const title = typeof body.title === "string" ? body.title : "New Chat";
  const model = typeof body.model === "string" ? body.model : null;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!id || !model) {
    return new NextResponse("Invalid conversation payload", { status: 400 });
  }

  const validMessages = (messages as unknown[]).filter(
    (message): message is IncomingMessage =>
      typeof message === "object" &&
      message !== null &&
      typeof (message as IncomingMessage).content === "string" &&
      typeof (message as IncomingMessage).role === "string" &&
      roles.has((message as IncomingMessage).role)
  );

  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (existing && existing.userId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const conversation = await prisma.conversation.upsert({
    where: { id },
    create: {
      id,
      title,
      model,
      userId,
      messages: {
        create: validMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      },
    },
    update: {
      title,
      model,
      messages: {
        deleteMany: {},
        create: validMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(conversation);
}
