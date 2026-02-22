"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const COLORS = {
  bg: "#0B0E13",
  card: "#12151C",
  cardBorder: "#1C2030",
  accent: "#3B82F6",
  text: "#E2E4E9",
  textDim: "#6B7280",
  red: "#EF4444",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", ids }),
      });
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    } catch {
      // silently ignore
    }
  };

  const handleNotificationClick = (id: string) => {
    markRead([id]);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markRead(notifications.map((n) => n.id));
    setLoading(false);
  };

  const unreadCount = notifications.length;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "6px",
          fontSize: "20px",
          lineHeight: 1,
          color: COLORS.text,
          borderRadius: "6px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = COLORS.card;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        {"\uD83D\uDD14"}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: COLORS.red,
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              lineHeight: 1,
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: `2px solid ${COLORS.bg}`,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "320px",
            maxHeight: "400px",
            background: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px 10px",
              borderBottom: `1px solid ${COLORS.cardBorder}`,
            }}
          >
            <span
              style={{
                color: COLORS.text,
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                    background: COLORS.red,
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "1px 7px",
                    borderRadius: "10px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.accent,
                  fontSize: "12px",
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  padding: "2px 4px",
                  fontWeight: 500,
                }}
              >
                {loading ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 14px",
                  textAlign: "center",
                  color: COLORS.textDim,
                  fontSize: "13px",
                }}
              >
                No unread notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${COLORS.cardBorder}`,
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(59,130,246,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: COLORS.text,
                        fontSize: "13px",
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        color: COLORS.textDim,
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: COLORS.textDim,
                      fontSize: "12px",
                      lineHeight: 1.4,
                      marginTop: "3px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {n.message}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
