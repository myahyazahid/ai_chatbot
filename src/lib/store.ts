import { Conversation, Message } from "./types";

const STORAGE_KEY = "chatbot-conversations";
const ACTIVE_KEY = "chatbot-active-conversation";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function getActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveConversationId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function createConversation(model: string): Conversation {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function addMessage(
  conversations: Conversation[],
  conversationId: string,
  message: Message
): Conversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c;
    const updated = {
      ...c,
      messages: [...c.messages, message],
      updatedAt: Date.now(),
    };
    // Auto-title from first user message
    if (
      message.role === "user" &&
      c.messages.length === 0
    ) {
      updated.title = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
    }
    return updated;
  });
}

export function updateLastAssistantMessage(
  conversations: Conversation[],
  conversationId: string,
  content: string
): Conversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c;
    const msgs = [...c.messages];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") {
        msgs[i] = { ...msgs[i], content };
        break;
      }
    }
    return { ...c, messages: msgs, updatedAt: Date.now() };
  });
}

export function deleteConversation(
  conversations: Conversation[],
  conversationId: string
): Conversation[] {
  return conversations.filter((c) => c.id !== conversationId);
}
