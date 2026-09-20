"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  modelSelector?: React.ReactNode;
}

export default function ChatInput({ onSend, disabled, modelSelector }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-2xl transition-colors"
          style={{
            backgroundColor: "var(--color-bg-input)",
            border: "1px solid var(--color-border-input)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          }}
        >
          {/* Textarea area */}
          <div className="px-4 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply to Claude..."
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-[200px]"
              style={{
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Bottom bar with model selector and send button */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              {/* Plus button */}
              <button
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg-secondary)]"
                style={{ color: "var(--color-text-tertiary)" }}
                title="Attach"
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              {modelSelector}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={disabled || !input.trim()}
              className="p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  input.trim() && !disabled
                    ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                color: "var(--color-bg-primary)",
              }}
              title="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p
          className="text-xs text-center mt-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Claude can make mistakes. Please double-check responses.
        </p>
      </div>
    </div>
  );
}
