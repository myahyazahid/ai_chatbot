"use client";

import { Conversation } from "@/lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
}: Props) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  // Group conversations by time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; convs: Conversation[] }[] = [];
  const todayConvs = sorted.filter((c) => c.updatedAt >= today.getTime());
  const yesterdayConvs = sorted.filter(
    (c) => c.updatedAt >= yesterday.getTime() && c.updatedAt < today.getTime()
  );
  const weekConvs = sorted.filter(
    (c) =>
      c.updatedAt >= lastWeek.getTime() && c.updatedAt < yesterday.getTime()
  );
  const olderConvs = sorted.filter((c) => c.updatedAt < lastWeek.getTime());

  if (todayConvs.length) groups.push({ label: "Today", convs: todayConvs });
  if (yesterdayConvs.length)
    groups.push({ label: "Yesterday", convs: yesterdayConvs });
  if (weekConvs.length)
    groups.push({ label: "Previous 7 days", convs: weekConvs });
  if (olderConvs.length) groups.push({ label: "Older", convs: olderConvs });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed md:relative z-50 top-0 left-0 h-full flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: "260px",
          backgroundColor: "var(--color-bg-sidebar)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
            style={{ color: "var(--color-text-secondary)" }}
            title="Hide sidebar"
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
            onClick={onNew}
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

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {groups.length === 0 && (
            <p
              className="text-sm px-3 py-8 text-center"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              No conversations yet
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-2">
              <p
                className="text-xs font-medium px-3 pb-1"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {group.label}
              </p>
              {group.convs.map((conv) => (
                <div
                  key={conv.id}
                  className="group flex items-center rounded-lg cursor-pointer transition-colors mb-0.5 relative"
                  style={{
                    backgroundColor:
                      conv.id === activeId
                        ? "var(--color-bg-active)"
                        : "transparent",
                  }}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={(e) => {
                    if (conv.id !== activeId)
                      e.currentTarget.style.backgroundColor =
                        "var(--color-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (conv.id !== activeId)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex-1 min-w-0 px-3 py-2">
                    <p
                      className="text-[14px] truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {conv.title}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 mr-1.5 p-1 rounded transition-all hover:bg-[var(--color-bg-active)]"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-3 py-3 flex items-center gap-2.5"
          style={{ borderTop: "1px solid var(--color-border-secondary)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            U
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              User
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
