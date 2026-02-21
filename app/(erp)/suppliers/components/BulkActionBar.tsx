"use client";
import { theme } from "../../../components/theme";
import { getSupplierUrl, trackOutboundClick } from "../../../utils/trackOutbound";

const SUPPLIERS = [
  { key: "leroymerlin" as const, label: "Leroy Merlin", color: "#78BE20" },
  { key: "builders" as const, label: "Builders", color: "#F97316" },
  { key: "cashbuild" as const, label: "Cashbuild", color: "#2563EB" },
];

type SupplierKey = "leroymerlin" | "builders" | "cashbuild";

export function BulkActionBar({ selectedCount, onMarkPurchased, onOpenAtSupplier, onClear, searchTerms }: {
  selectedCount: number;
  onMarkPurchased: () => void;
  onOpenAtSupplier: (supplier: SupplierKey) => void;
  onClear: () => void;
  searchTerms: string[];
}) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: "sticky", bottom: 16, zIndex: 50,
      background: theme.card, border: `1px solid ${theme.accent}40`,
      borderRadius: 10, padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
        &#10003; {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <div style={{ width: 1, height: 24, background: theme.cardBorder }} />

      <button onClick={onMarkPurchased} style={{
        background: theme.green, color: "#fff", border: "none", borderRadius: 6,
        padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
      }}>
        Mark Purchased
      </button>

      <div style={{ position: "relative", display: "inline-block" }}>
        <SupplierDropdown searchTerms={searchTerms} onOpenAtSupplier={onOpenAtSupplier} />
      </div>

      <button onClick={onClear} style={{
        background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`,
        borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer",
      }}>
        Clear
      </button>
    </div>
  );
}

function SupplierDropdown({ searchTerms, onOpenAtSupplier }: { searchTerms: string[]; onOpenAtSupplier: (supplier: SupplierKey) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {SUPPLIERS.map((s) => (
        <button key={s.key} onClick={() => onOpenAtSupplier(s.key)}
          style={{
            background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40`,
            borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
          Open at {s.label}
        </button>
      ))}
    </div>
  );
}
