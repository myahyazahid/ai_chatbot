"use client";

import { Model } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface Props {
  models: Model[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  loading: boolean;
}

export default function ModelSelector({
  models,
  selectedModel,
  onSelect,
  loading,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = models.filter((m) =>
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  // Show a cleaner display name
  const getDisplayName = (id: string) => {
    const parts = id.split("/");
    return parts.length > 1 ? parts[parts.length - 1] : id;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-[var(--color-bg-secondary)]"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {loading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          <>
            <span className="truncate max-w-[160px]">
              {getDisplayName(selectedModel) || "Select model"}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-80 rounded-xl shadow-lg z-50 max-h-96 flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg-input)",
            border: "1px solid var(--color-border-primary)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="p-2.5"
            style={{ borderBottom: "1px solid var(--color-border-secondary)" }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
              }}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 && (
              <p
                className="text-sm p-4 text-center"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                No models found
              </p>
            )}
            {filtered.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onSelect(model.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-hover)] flex items-center gap-2"
                style={{
                  color:
                    model.id === selectedModel
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                }}
              >
                {model.id === selectedModel && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <div
                  className={`flex-1 min-w-0 ${
                    model.id === selectedModel ? "" : "pl-[22px]"
                  }`}
                >
                  <span className="block truncate text-[14px]">
                    {model.id}
                  </span>
                  {model.owned_by && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {model.owned_by}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
