export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface Model {
  id: string;
  name: string;
  owned_by?: string;
}
