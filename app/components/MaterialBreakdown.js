"use client";
import { useState, useMemo } from "react";
import { theme, fmt, Card, SectionDivider, MetricBox } from "./theme";
import { estimateMaterials, calcSupplierTotal, SUPPLIER_MULTIPLIERS } from "../utils/materialEstimator";
import { trackOutboundClick, getSupplierUrl } from "../utils/trackOutbound";

const CATEGORY_ICONS = {
  tiles: "T", paint: "P", plumbing: "W", electrical: "E",
  flooring: "F", adhesives: "A", hardware: "H",
};

export default function MaterialBreakdown({ rooms, prop, mode, isMobile }) {
  const [expandedCats, setExpandedCats] = useState({});
  const [compareSuppliers, setCompareSuppliers] = useState(false);

  const materials = useMemo(() => estimateMaterials(rooms, prop, mode), [rooms, prop, mode]);

  const totalLeroyMerlin = useMemo(() => calcSupplierTotal(materials, "leroymerlin"), [materials]);
  const totalBuilders = useMemo(() => calcSupplierTotal(materials, "builders"), [materials]);
  const totalItems = materials.reduce((s, cat) => s + cat.items.length, 0);

  const toggleCat = (cat) => setExpandedCats((p) => ({ ...p, [cat]: !p[cat] }));

  const handleSupplierClick = (supplier, item, category) => {
    trackOutboundClick(
      supplier === "leroymerlin" ? "Leroy Merlin" : "Builders Warehouse",
      item.label,
      category
    );
    window.open(getSupplierUrl(supplier, item.searchTerm), "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Summary */}
      <Card title="Shop This Renovation" subtitle="Estimated material quantities and costs based on your room inputs. Click supplier buttons to search and buy.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <MetricBox label="Est. Material Cost" value={fmt(totalLeroyMerlin)} color={theme.accent} isMobile={isMobile} />
          <MetricBox label="Categories" value={String(materials.length)} isMobile={isMobile} />
          <MetricBox label="Items" value={String(totalItems)} isMobile={isMobile} />
        </div>

        {/* Compare toggle */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: theme.input, borderRadius: 8, marginBottom: 4,
        }}>
          <div onClick={() => setCompareSuppliers(!compareSuppliers)} style={{
            width: 48, height: 28, borderRadius: 14,
            background: compareSuppliers ? theme.accent : theme.inputBorder,
            cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11, background: "#fff",
              position: "absolute", top: 3, left: compareSuppliers ? 23 : 3, transition: "all 0.2s",
            }} />
          </div>
          <span style={{ fontSize: 13, color: theme.text }}>Compare Suppliers</span>
        </div>
      </Card>

      {/* Supplier Comparison */}
      {compareSuppliers && (
        <Card style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: 140, background: theme.input, borderRadius: 10, padding: 14,
              border: `2px solid ${theme.green}`,
            }}>
              <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Leroy Merlin</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalLeroyMerlin)}</div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>Baseline pricing</div>
            </div>
            <div style={{
              flex: 1, minWidth: 140, background: theme.input, borderRadius: 10, padding: 14,
              border: `2px solid ${theme.orange}`,
            }}>
              <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Builders Warehouse</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalBuilders)}</div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>~{Math.round((SUPPLIER_MULTIPLIERS.builders - 1) * 100)}% variance</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: theme.textDim, marginTop: 10, textAlign: "center" }}>
            Estimated difference: {fmt(Math.abs(totalBuilders - totalLeroyMerlin))} &middot; Pricing is indicative only
          </div>
        </Card>
      )}

      <SectionDivider label="Material Categories" />

      {/* Category cards */}
      {materials.map((cat) => {
        const isExpanded = expandedCats[cat.category] !== false; // default open
        const catTotal = cat.items.reduce((s, i) => s + i.totalCost, 0);

        return (
          <Card key={cat.category} style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
            {/* Category header - tap to expand/collapse */}
            <button
              onClick={() => toggleCat(cat.category)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                background: theme.input, border: "none", padding: "14px 16px",
                cursor: "pointer", minHeight: 50,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: theme.accentDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: theme.accent,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {CATEGORY_ICONS[cat.category] || "#"}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: theme.textDim }}>{cat.items.length} items</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
                  fontWeight: 700, color: theme.accent,
                }}>{fmt(catTotal)}</span>
                <span style={{
                  color: theme.textDim, fontSize: 14, transition: "transform 0.2s",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                }}>v</span>
              </div>
            </button>

            {/* Items grid */}
            {isExpanded && (
              <div style={{ padding: isMobile ? 12 : 16 }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}>
                  {cat.items.map((item) => (
                    <div key={item.key} style={{
                      background: theme.bg, border: `1px solid ${theme.cardBorder}`,
                      borderRadius: 10, padding: 14,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: theme.textDim }}>
                            {item.qty} {item.unit}{item.qty !== 1 ? "s" : ""} x {fmt(item.unitPrice)}
                          </div>
                        </div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
                          fontWeight: 700, color: theme.accent,
                        }}>{fmt(item.totalCost)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleSupplierClick("leroymerlin", item, cat.label)}
                          style={{
                            background: "#4CAF50", color: "#fff", border: "none", borderRadius: 6,
                            padding: "8px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            flex: 1, minHeight: 36,
                          }}
                        >
                          Leroy Merlin
                        </button>
                        <button
                          onClick={() => handleSupplierClick("builders", item, cat.label)}
                          style={{
                            background: "#FF6600", color: "#fff", border: "none", borderRadius: 6,
                            padding: "8px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            flex: 1, minHeight: 36,
                          }}
                        >
                          Builders
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Total summary */}
      <Card style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Estimated Material Cost</div>
            <div style={{ fontSize: 11, color: theme.textDim }}>
              {totalItems} items across {materials.length} categories &middot; Prices are indicative
            </div>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 22,
            fontWeight: 700, color: theme.accent,
          }}>{fmt(totalLeroyMerlin)}</div>
        </div>
      </Card>
    </div>
  );
}
