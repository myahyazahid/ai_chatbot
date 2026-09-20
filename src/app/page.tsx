"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ModelSelector from "@/components/ModelSelector";
import {
  getConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation,
  addMessage,
  updateLastAssistantMessage,
  deleteConversation,
  generateId,
} from "@/lib/store";
import { Conversation, Message, Model } from "@/lib/types";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversations from localStorage
  useEffect(() => {
    const convs = getConversations();
    setConversations(convs);
    const savedActive = getActiveConversationId();
    if (savedActive && convs.find((c) => c.id === savedActive)) {
      setActiveId(savedActive);
    }
  }, []);

  // Fetch models
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setModels(data.data);
          if (data.data.length > 0 && !selectedModel) {
            setSelectedModel(data.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  // Save active conversation id
  useEffect(() => {
    if (activeId) {
      setActiveConversationId(activeId);
    }
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId);

  const handleNewChat = useCallback(() => {
    const conv = createConversation(selectedModel);
    setConversations((prev) => [...prev, conv]);
    setActiveId(conv.id);
    setSidebarOpen(false);
  }, [selectedModel]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const updated = deleteConversation(prev, id);
        saveConversations(updated);
        return updated;
      });
      if (activeId === id) {
        setActiveId(null);
      }
    },
    [activeId]
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      if (activeId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, model: modelId } : c))
        );
      }
    },
    [activeId]
  );

  const handleSend = useCallback(
    async (content: string) => {
      let currentActiveId = activeId;
      let currentConversations = conversations;

      if (!currentActiveId) {
        const conv = createConversation(selectedModel);
        currentConversations = [...currentConversations, conv];
        currentActiveId = conv.id;
        setConversations(currentConversations);
        setActiveId(currentActiveId);
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      let updated = addMessage(currentConversations, currentActiveId, userMsg);

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      updated = addMessage(updated, currentActiveId, assistantMsg);
      setConversations(updated);
      setIsStreaming(true);

      const conv = updated.find((c) => c.id === currentActiveId);
      const apiMessages = conv
        ? conv.messages
            .filter((m) => m.id !== assistantMsg.id)
            .map((m) => ({ role: m.role, content: m.content }))
        : [];

      const model = conv?.model || selectedModel;

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
          setConversations((prev) =>
            updateLastAssistantMessage(
              prev,
              currentActiveId!,
              `Error: ${error}`
            )
          );
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulated += delta;
                  setConversations((prev) =>
                    updateLastAssistantMessage(
                      prev,
                      currentActiveId!,
                      accumulated
                    )
                  );
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setConversations((prev) =>
            updateLastAssistantMessage(
              prev,
              currentActiveId!,
              `Error: ${(err as Error).message}`
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeId, conversations, selectedModel]
  );

  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      {/* Sidebar */}
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center h-12 px-3"
          style={{ borderBottom: "1px solid var(--color-border-secondary)" }}
        >
          {/* Sidebar toggle (when closed) */}
          {!sidebarOpen && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                style={{ color: "var(--color-text-secondary)" }}
                title="Show sidebar"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          )}

          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Conversation title */}
          <div className="flex-1 flex justify-center">
            {activeConversation && (
              <span
                className="text-sm font-medium truncate max-w-xs"
                style={{ color: "var(--color-text-primary)" }}
              >
                {activeConversation.title}
              </span>
            )}
          </div>

          {/* Spacer for alignment */}
          <div className="w-20" />
        </header>

        {/* Messages */}
        <ChatMessage
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
        />

        {/* Input with model selector inside */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
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
