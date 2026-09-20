"use client";

import { Message } from "@/lib/types";
import { useEffect, useRef } from "react";

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

// Claude's starburst icon
function ClaudeIcon({ isGenerating = false }: { isGenerating?: boolean }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 relative overflow-hidden"
      style={{ backgroundColor: "var(--color-accent)" }}
    >
      <img
        src="/favicon.png"
        alt="AI Assistant"
        className={`w-full h-full object-cover ${
          isGenerating ? "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" : ""
        }`}
      />
    </div>
  );
}

function formatContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
      return (
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-primary)" }}>
          {lang && (
            <div
              className="text-xs px-4 py-2 font-medium"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
                borderBottom: "1px solid var(--color-border-primary)",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            className="p-4 overflow-x-auto text-[13px] leading-relaxed"
            style={{
              backgroundColor: "var(--color-bg-code)",
              color: "#E8E6E1",
            }}
          >
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    // Handle inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith("`") && ip.endsWith("`")) {
            return (
              <code
                key={j}
                className="text-[13px] px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-accent)",
                }}
              >
                {ip.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{ip}</span>;
        })}
      </span>
    );
  });
}

export default function ChatMessage({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          <div className="mb-6 flex justify-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              <img src="/favicon.png" alt="AI Assistant" className="w-full h-full object-cover" />
            </div>
          </div>
          <h2
            className="text-2xl font-medium mb-2"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-serif)",
            }}
          >
            How can I help you today?
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Start a conversation with Claude.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {messages.map((msg, index) => {
          const isLast = index === messages.length - 1;
          const isGenerating = isStreaming && isLast && msg.role === "assistant";
          const isEmpty = msg.content === "";

          return (
            <div key={msg.id} className="mb-6 last:mb-0">
              {msg.role === "user" ? (
                /* User message - right aligned, warm tinted bubble */
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-3xl px-5 py-3"
                    style={{
                      backgroundColor: "var(--color-bg-user-msg)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : (
                /* Assistant message - left aligned with Claude icon */
                <div className="flex gap-3">
                  <ClaudeIcon isGenerating={isGenerating} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    {isGenerating && isEmpty ? (
                      /* Initial loading dots */
                      <div className="flex items-center gap-1.5 h-6">
                        <div
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        />
                        <div
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: "var(--color-accent)",
                            animationDelay: "0.15s",
                          }}
                        />
                        <div
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: "var(--color-accent)",
                            animationDelay: "0.3s",
                          }}
                        />
                      </div>
                    ) : (
                      /* Text output with blinking cursor */
                      <div
                        className="whitespace-pre-wrap break-words text-[15px] leading-[1.7]"
                        style={{
                          color: "var(--color-text-primary)",
                          fontFamily: "var(--font-serif)",
                        }}
                      >
                        {formatContent(msg.content)}
                        {isGenerating && (
                          <span
                            className="inline-block w-2 h-[1em] ml-1 align-middle animate-pulse"
                            style={{ backgroundColor: "var(--color-accent)" }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
