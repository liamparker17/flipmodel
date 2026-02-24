"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// Dark theme colors
const c = {
  bg: "#0B0E13",
  card: "#12151C",
  cardBorder: "#1C2030",
  accent: "#3B82F6",
  text: "#E2E4E9",
  textDim: "#6B7280",
  input: "#161A24",
  inputBorder: "#252B3B",
};

interface SearchResult {
  id: string;
  type: "deal" | "contact" | "tool";
  title: string;
  subtitle?: string;
}

interface GroupedResults {
  Properties: SearchResult[];
  Contacts: SearchResult[];
  Tools: SearchResult[];
}

function groupResults(results: SearchResult[]): GroupedResults {
  const grouped: GroupedResults = { Properties: [], Contacts: [], Tools: [] };
  for (const r of results) {
    if (r.type === "deal") grouped.Properties.push(r);
    else if (r.type === "contact") grouped.Contacts.push(r);
    else if (r.type === "tool") grouped.Tools.push(r);
  }
  return grouped;
}

function getHref(result: SearchResult): string {
  if (result.type === "deal") return `/pipeline/${result.id}`;
  if (result.type === "contact") return `/contacts/${result.id}`;
  return "/tools";
}

export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "7px 10px",
        background: c.input,
        border: `1px solid ${c.inputBorder}`,
        borderRadius: 6,
        color: c.textDim,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 13, opacity: 0.6 }}>&#128269;</span>
      <span style={{ flex: 1 }}>Search...</span>
      <kbd
        style={{
          fontSize: 10,
          padding: "2px 5px",
          borderRadius: 4,
          background: c.card,
          border: `1px solid ${c.cardBorder}`,
          color: c.textDim,
          fontFamily: "inherit",
        }}
      >
        Ctrl+K
      </kbd>
    </button>
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? data ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    search(value);
  };

  const navigate = (result: SearchResult) => {
    setOpen(false);
    router.push(getHref(result));
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex]);
    }
  };

  if (!open) return null;

  const grouped = groupResults(results);
  let flatIndex = -1;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 540,
          background: c.card,
          border: `1px solid ${c.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${c.cardBorder}`,
          }}
        >
          <span style={{ color: c.textDim, fontSize: 15 }}>&#128269;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search properties, contacts, tools..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: c.text,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              background: c.bg,
              border: `1px solid ${c.cardBorder}`,
              color: c.textDim,
              fontFamily: "inherit",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {loading && (
            <div style={{ padding: "16px", color: c.textDim, fontSize: 13, textAlign: "center" }}>
              Searching...
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div style={{ padding: "16px", color: c.textDim, fontSize: 13, textAlign: "center" }}>
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading &&
            (Object.keys(grouped) as (keyof GroupedResults)[]).map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div
                    style={{
                      padding: "8px 16px 4px",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: c.textDim,
                    }}
                  >
                    {group}
                  </div>
                  {items.map((item) => {
                    flatIndex++;
                    const idx = flatIndex;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          padding: "8px 16px",
                          background: isActive ? `${c.accent}14` : "transparent",
                          border: "none",
                          borderLeft: isActive ? `2px solid ${c.accent}` : "2px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: 13, color: isActive ? c.text : c.text, fontWeight: 500 }}>
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span style={{ fontSize: 11, color: c.textDim }}>{item.subtitle}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

          {!loading && !query.trim() && (
            <div style={{ padding: "20px 16px", color: c.textDim, fontSize: 12, textAlign: "center" }}>
              Start typing to search across properties, contacts, and tools.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
