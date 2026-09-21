"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ModelSelector from "@/components/ModelSelector";
import {
  createConversation,
  addMessage,
  updateLastAssistantMessage,
  generateId,
} from "@/lib/store";
import { Conversation, Message, Model } from "@/lib/types";

async function saveConversation(conversation: Conversation) {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conversation),
  });

  if (!response.ok) {
    throw new Error("Failed to save conversation");
  }
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load the signed-in user's conversations from MySQL.
  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch("/api/conversations");
        if (!response.ok) throw new Error("Failed to load conversations");

        const loaded = (await response.json()) as Conversation[];
        setConversations(loaded);
        if (loaded.length > 0) setActiveId(loaded[0].id);
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setHistoryLoading(false);
      }
    }

    fetchConversations();
  }, []);

  // Fetch models from 9router.
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setModels(data.data);
          if (data.data.length > 0) setSelectedModel(data.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setModelsLoading(false);
      }
    }

    fetchModels();
  }, []);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  const handleNewChat = useCallback(() => {
    const conversation = createConversation(selectedModel);
    setConversations((previous) => [conversation, ...previous]);
    setActiveId(conversation.id);
    setSidebarOpen(false);
  }, [selectedModel]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        console.error("Failed to delete conversation");
        return;
      }

      setConversations((previous) => previous.filter((conversation) => conversation.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      if (!activeId) return;

      setConversations((previous) => {
        const updated = previous.map((conversation) =>
          conversation.id === activeId
            ? { ...conversation, model: modelId, updatedAt: Date.now() }
            : conversation
        );
        const active = updated.find((conversation) => conversation.id === activeId);
        if (active) void saveConversation(active).catch(console.error);
        return updated;
      });
    },
    [activeId]
  );

  const handleSend = useCallback(
    async (content: string) => {
      let conversationId = activeId;
      let currentConversations = conversations;

      if (!conversationId) {
        const conversation = createConversation(selectedModel);
        currentConversations = [conversation, ...currentConversations];
        conversationId = conversation.id;
        setConversations(currentConversations);
        setActiveId(conversationId);
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        createdAt: Date.now(),
      };
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };

      let updated = addMessage(currentConversations, conversationId, userMessage);
      updated = addMessage(updated, conversationId, assistantMessage);
      setConversations(updated);
      setIsStreaming(true);

      const conversation = updated.find((item) => item.id === conversationId);
      if (!conversation) {
        setIsStreaming(false);
        return;
      }

      // Persist the prompt before requesting the model so it survives a reload.
      try {
        await saveConversation(conversation);
      } catch (error) {
        console.error("Failed to save prompt:", error);
      }

      const apiMessages = conversation.messages
        .filter((message) => message.id !== assistantMessage.id)
        .map((message) => ({ role: message.role, content: message.content }));
      const model = conversation.model || selectedModel;
      let finalConversations = updated;
      let accumulated = "";

      const persistFinalResponse = async () => {
        const finalConversation = finalConversations.find((item) => item.id === conversationId);
        if (!finalConversation) return;
        try {
          await saveConversation(finalConversation);
        } catch (error) {
          console.error("Failed to save assistant response:", error);
        }
      };

      try {
        abortRef.current = new AbortController();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, model }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.text();
          finalConversations = updateLastAssistantMessage(
            finalConversations,
            conversationId,
            `Error: ${error}`
          );
          setConversations(finalConversations);
          await persistFinalResponse();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (!delta) continue;

              accumulated += delta;
              finalConversations = updateLastAssistantMessage(
                finalConversations,
                conversationId,
                accumulated
              );
              setConversations(finalConversations);
            } catch {
              // Ignore provider SSE control events that are not JSON chunks.
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          finalConversations = updateLastAssistantMessage(
            finalConversations,
            conversationId,
            `Error: ${(error as Error).message}`
          );
          setConversations(finalConversations);
        }
      } finally {
        await persistFinalResponse();
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeId, conversations, selectedModel]
  );

  return (
    <div className="flex h-full" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      {sidebarOpen && (
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={handleDeleteConversation}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center h-12 px-3"
          style={{ borderBottom: "1px solid var(--color-border-secondary)" }}
        >
          {!sidebarOpen && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                style={{ color: "var(--color-text-secondary)" }}
                title="Show sidebar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
              <button
                onClick={handleNewChat}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                style={{ color: "var(--color-text-secondary)" }}
                title="New chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex-1 flex justify-center">
            {activeConversation && (
              <span className="text-sm font-medium truncate max-w-xs" style={{ color: "var(--color-text-primary)" }}>
                {activeConversation.title}
              </span>
            )}
          </div>
          <div className="w-20" />
        </header>

        <ChatMessage
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
        />

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming || historyLoading}
          modelSelector={
            <ModelSelector
              models={models}
              selectedModel={activeConversation?.model || selectedModel}
              onSelect={handleModelChange}
              loading={modelsLoading}
            />
          }
        />
      </div>
    </div>
  );
}
