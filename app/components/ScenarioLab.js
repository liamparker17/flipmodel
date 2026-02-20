"use client";
import { useState, useMemo } from "react";
import { theme, fmt, pct, Card, SectionDivider, MetricBox, BarChart, SliderInput } from "./theme";
import { calcScenario, computeMetrics } from "../utils/calculations";

const DEFAULT_PRESETS = [
  { id: "base", label: "Base case", resaleAdjPct: 0, renoAdjPct: 0, constructionDelayMonths: 0, transferDelayMonths: 0 },
  { id: "resale-5", label: "Resale -5%", resaleAdjPct: -5, renoAdjPct: 0, constructionDelayMonths: 0, transferDelayMonths: 0 },
  { id: "resale-10", label: "Resale -10%", resaleAdjPct: -10, renoAdjPct: 0, constructionDelayMonths: 0, transferDelayMonths: 0 },
  { id: "reno+10", label: "Reno +10%", resaleAdjPct: 0, renoAdjPct: 10, constructionDelayMonths: 0, transferDelayMonths: 0 },
  { id: "reno+15", label: "Reno +15%", resaleAdjPct: 0, renoAdjPct: 15, constructionDelayMonths: 0, transferDelayMonths: 0 },
  { id: "delay2", label: "+2mo construction", resaleAdjPct: 0, renoAdjPct: 0, constructionDelayMonths: 2, transferDelayMonths: 0 },
  { id: "transfer2", label: "+2mo transfer delay", resaleAdjPct: 0, renoAdjPct: 0, constructionDelayMonths: 0, transferDelayMonths: 2 },
  { id: "worst", label: "Worst case", resaleAdjPct: -10, renoAdjPct: 15, constructionDelayMonths: 2, transferDelayMonths: 2 },
];

export default function ScenarioLab({
  baseInputs, customScenarios, setCustomScenarios,
  profiles, scenarioTab, setScenarioTab,
  // Sensitivity sliders (retained for quick-adjust)
  sensResaleAdj, setSensResaleAdj, sensRenoAdj, setSensRenoAdj,
  sensHoldAdj, setSensHoldAdj, sensCalc,
  isMobile,
}) {
  const [cashBurnSelection, setCashBurnSelection] = useState({});
  const [profileSelection, setProfileSelection] = useState({});
  const [sortKey, setSortKey] = useState("netProfit");
  const [sortAsc, setSortAsc] = useState(false);

  const activeTab = scenarioTab || "builder";

  // All scenarios = presets + custom
  const allScenarios = useMemo(() => [...DEFAULT_PRESETS, ...customScenarios], [customScenarios]);

  // Calculate results for all scenarios
  const scenarioResults = useMemo(() => {
    return allScenarios.map((s) => ({
      ...s,
      result: calcScenario(baseInputs, s),
    }));
  }, [allScenarios, baseInputs]);

  const addCustomScenario = () => {
    setCustomScenarios((prev) => [...prev, {
      id: String(Date.now()), label: "Custom scenario",
      resaleAdjPct: 0, renoAdjPct: 0, constructionDelayMonths: 0, transferDelayMonths: 0,
    }]);
  };

  const updateCustomScenario = (id, field, value) => {
    setCustomScenarios((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteCustomScenario = (id) => {
    setCustomScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  // Cross-profile metrics
  const profileMetrics = useMemo(() => {
    if (!profiles || profiles.length === 0) return [];
    return profiles.map((p) => {
      try {
        const m = computeMetrics(p);
        return { id: p.id, name: p.name, ...m, purchasePrice: p.acq.purchasePrice, expectedPrice: p.resale.expectedPrice, renovationMonths: p.holding.renovationMonths };
      } catch {
        return { id: p.id, name: p.name, netProfit: 0, roi: 0, annualizedRoi: 0, totalRenovation: 0, totalHoldingCost: 0, allInCost: 0, dealScore: { level: "risky", color: "#F87171" }, purchasePrice: 0, expectedPrice: 0, renovationMonths: 0 };
      }
    });
  }, [profiles]);

  const selectedProfileMetrics = useMemo(() => {
    const selected = profileMetrics.filter((p) => profileSelection[p.id]);
    const sorted = [...selected].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return sorted;
  }, [profileMetrics, profileSelection, sortKey, sortAsc]);

  const tabStyle = (tab) => ({
    background: activeTab === tab ? theme.accent : "transparent",
    color: activeTab === tab ? "#000" : theme.textDim,
    border: `1px solid ${activeTab === tab ? theme.accent : theme.cardBorder}`,
    borderRadius: 8, padding: isMobile ? "8px 12px" : "6px 16px",
    fontSize: 12, fontWeight: activeTab === tab ? 700 : 400,
    cursor: "pointer", whiteSpace: "nowrap",
  });

  const thStyle = { textAlign: "left", padding: "8px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 };
  const tdStyle = { padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 };
  const inputSmall = { background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "3px 6px", color: theme.text, fontSize: 12, width: 60, textAlign: "right", outline: "none", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
        <button onClick={() => setScenarioTab("builder")} style={tabStyle("builder")}>Scenario Builder</button>
        <button onClick={() => setScenarioTab("cashBurn")} style={tabStyle("cashBurn")}>Cash Burn</button>
        {profiles && profiles.length >= 2 && (
          <button onClick={() => setScenarioTab("crossProfile")} style={tabStyle("crossProfile")}>Compare Properties ({profiles.length})</button>
        )}
      </div>

      {/* ─── TAB 1: SCENARIO BUILDER ─── */}
      {activeTab === "builder" && (
        <div>
          {/* Quick-adjust sliders */}
          <Card title="Quick Adjust" subtitle="Drag sliders for real-time scenario modelling.">
            <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={setSensResaleAdj} min={-15} max={15} />
            <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={setSensRenoAdj} min={0} max={30} />
            <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={setSensHoldAdj} min={0} max={14} suffix=" mo" />
            <div style={{ background: theme.input, borderRadius: 10, padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Slider Result</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
                <MetricBox label="ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
                <MetricBox label="Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
              </div>
            </div>
          </Card>

          <SectionDivider label="Scenario Comparison" />

          {/* Scenario table */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: theme.textDim }}>{allScenarios.length} scenarios</span>
              <button onClick={addCustomScenario} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Scenario</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    <th style={thStyle}>Scenario</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Resale %</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Reno %</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Build +mo</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Xfer +mo</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Hold</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Net Profit</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>ROI</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Ann. ROI</th>
                    <th style={{ ...thStyle, width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResults.map((s) => {
                    const isCustom = !DEFAULT_PRESETS.find((p) => p.id === s.id);
                    const r = s.result;
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                        <td style={{ ...tdStyle, color: theme.text, fontFamily: "inherit" }}>
                          {isCustom ? (
                            <input value={s.label} onChange={(e) => updateCustomScenario(s.id, "label", e.target.value)} style={{ ...inputSmall, width: 140, textAlign: "left" }} />
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dealScore.color, flexShrink: 0 }} />
                              {s.label}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {isCustom ? <input type="number" value={s.resaleAdjPct} onChange={(e) => updateCustomScenario(s.id, "resaleAdjPct", Number(e.target.value))} style={inputSmall} /> : `${s.resaleAdjPct}%`}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {isCustom ? <input type="number" value={s.renoAdjPct} onChange={(e) => updateCustomScenario(s.id, "renoAdjPct", Number(e.target.value))} style={inputSmall} /> : `${s.renoAdjPct}%`}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {isCustom ? <input type="number" value={s.constructionDelayMonths} onChange={(e) => updateCustomScenario(s.id, "constructionDelayMonths", Number(e.target.value))} style={inputSmall} /> : s.constructionDelayMonths || "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {isCustom ? <input type="number" value={s.transferDelayMonths} onChange={(e) => updateCustomScenario(s.id, "transferDelayMonths", Number(e.target.value))} style={inputSmall} /> : s.transferDelayMonths || "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{r.totalHoldMonths}mo</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: r.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>{fmt(r.netProfit)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: r.roi >= 0.15 ? theme.green : r.roi >= 0 ? theme.orange : theme.red }}>{pct(r.roi)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: r.annRoi >= 0.3 ? theme.green : r.annRoi >= 0.15 ? theme.orange : theme.red }}>{pct(r.annRoi)}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {isCustom && (
                            <button onClick={() => deleteCustomScenario(s.id)} style={{ background: "none", border: "none", color: theme.red, cursor: "pointer", fontSize: 14 }}>x</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Net profit comparison chart */}
          <Card title="Net Profit Comparison">
            <BarChart
              data={scenarioResults.map((s) => ({ label: s.label, value: s.result.netProfit }))}
              maxVal={Math.max(...scenarioResults.map((s) => Math.abs(s.result.netProfit)))}
              isMobile={isMobile}
            />
          </Card>
        </div>
      )}

      {/* ─── TAB 2: CASH BURN ─── */}
      {activeTab === "cashBurn" && (
        <div>
          <Card title="Cash Burn Analysis" subtitle="Compare monthly holding cost burn rate across scenarios. Toggle scenarios to include.">
            {/* Scenario toggles */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {scenarioResults.map((s) => {
                const selected = cashBurnSelection[s.id] !== false; // default to selected for first 4
                const defaultSelected = DEFAULT_PRESETS.slice(0, 4).some((p) => p.id === s.id) || cashBurnSelection[s.id] === true;
                const isOn = cashBurnSelection[s.id] !== undefined ? cashBurnSelection[s.id] : defaultSelected;
                return (
                  <button key={s.id} onClick={() => setCashBurnSelection((p) => ({ ...p, [s.id]: !isOn }))} style={{
                    background: isOn ? theme.accentDim : theme.input,
                    border: `1px solid ${isOn ? theme.accent : theme.inputBorder}`,
                    borderRadius: 6, padding: "4px 10px", fontSize: 11,
                    color: isOn ? theme.accent : theme.textDim, cursor: "pointer",
                  }}>
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Cash burn summary table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    <th style={thStyle}>Scenario</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Monthly Burn</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Hold Months</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Total Burn</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Burn % of Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResults.filter((s) => {
                    const defaultSelected = DEFAULT_PRESETS.slice(0, 4).some((p) => p.id === s.id);
                    return cashBurnSelection[s.id] !== undefined ? cashBurnSelection[s.id] : defaultSelected;
                  }).map((s) => {
                    const r = s.result;
                    const totalBurn = r.monthlyBurn * r.totalHoldMonths;
                    const burnPct = r.netProfit > 0 ? totalBurn / r.netProfit : 0;
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                        <td style={{ ...tdStyle, color: theme.text, fontFamily: "inherit" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dealScore.color, flexShrink: 0 }} />
                            {s.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: theme.orange }}>{fmt(r.monthlyBurn)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{r.totalHoldMonths}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: theme.red, fontWeight: 700 }}>{fmt(totalBurn)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: burnPct > 1 ? theme.red : burnPct > 0.5 ? theme.orange : theme.textDim }}>
                          {r.netProfit > 0 ? pct(burnPct) : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Monthly burn visualization */}
          <Card title="Monthly Holding Outflow">
            {(() => {
              const selected = scenarioResults.filter((s) => {
                const defaultSelected = DEFAULT_PRESETS.slice(0, 4).some((p) => p.id === s.id);
                return cashBurnSelection[s.id] !== undefined ? cashBurnSelection[s.id] : defaultSelected;
              });
              const maxMonths = Math.max(...selected.map((s) => s.result.totalHoldMonths), 1);
              const maxBurn = baseInputs.monthlyHoldingTotal * maxMonths;
              const colors = [theme.accent, theme.green, theme.orange, theme.red, "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B"];

              return (
                <div>
                  {/* Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, fontSize: 11 }}>
                    {selected.map((s, idx) => (
                      <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, color: theme.textDim }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[idx % colors.length] }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                  {/* Grouped bar chart by month */}
                  <div style={{ display: "flex", gap: 2, height: 120, alignItems: "flex-end" }}>
                    {Array.from({ length: maxMonths }, (_, m) => (
                      <div key={m} style={{ flex: 1, display: "flex", gap: 1, alignItems: "flex-end", height: "100%" }}>
                        {selected.map((s, idx) => {
                          const r = s.result;
                          const cum = Math.min(m + 1, r.totalHoldMonths) * r.monthlyBurn;
                          const height = maxBurn > 0 ? (cum / maxBurn) * 100 : 0;
                          const active = m < r.totalHoldMonths;
                          return (
                            <div key={s.id} style={{
                              flex: 1, background: colors[idx % colors.length],
                              opacity: active ? 0.7 : 0.15,
                              height: `${height}%`, borderRadius: "2px 2px 0 0",
                              minHeight: active ? 2 : 0, transition: "height 0.3s",
                            }} title={`${s.label}: Month ${m + 1} — ${fmt(cum)} cumulative`} />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
                    <span>Month 1</span><span>Month {maxMonths}</span>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ─── TAB 3: CROSS-PROFILE COMPARISON ─── */}
      {activeTab === "crossProfile" && (
        <div>
          {(!profiles || profiles.length < 2) ? (
            <Card>
              <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
                Save at least 2 property profiles to compare them here.
              </div>
            </Card>
          ) : (
            <>
              <Card title="Select Properties to Compare" subtitle="Tick the properties you want to compare side by side.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {profileMetrics.map((p) => {
                    const selected = !!profileSelection[p.id];
                    return (
                      <button key={p.id} onClick={() => setProfileSelection((prev) => ({ ...prev, [p.id]: !selected }))} style={{
                        background: selected ? theme.accentDim : theme.input,
                        border: `1px solid ${selected ? theme.accent : theme.inputBorder}`,
                        borderRadius: 8, padding: "8px 14px", fontSize: 12,
                        color: selected ? theme.accent : theme.textDim, cursor: "pointer",
                        fontWeight: selected ? 600 : 400,
                      }}>
                        {selected ? "✓ " : ""}{p.name}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {selectedProfileMetrics.length >= 2 && (
                <>
                  <SectionDivider label="Property Comparison" />
                  <Card>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                            {[
                              { key: "name", label: "Property" },
                              { key: "purchasePrice", label: "Purchase" },
                              { key: "totalRenovation", label: "Reno" },
                              { key: "totalHoldingCost", label: "Holding" },
                              { key: "expectedPrice", label: "Resale" },
                              { key: "netProfit", label: "Net Profit" },
                              { key: "roi", label: "ROI" },
                              { key: "annualizedRoi", label: "Ann. ROI" },
                            ].map((col) => (
                              <th key={col.key} onClick={() => {
                                if (col.key === "name") return;
                                setSortKey(col.key);
                                setSortAsc(sortKey === col.key ? !sortAsc : false);
                              }} style={{
                                ...thStyle, cursor: col.key !== "name" ? "pointer" : "default",
                                textAlign: col.key === "name" ? "left" : "right",
                              }}>
                                {col.label} {sortKey === col.key ? (sortAsc ? "↑" : "↓") : ""}
                              </th>
                            ))}
                            <th style={{ ...thStyle, width: 24 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProfileMetrics.map((p) => (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                              <td style={{ ...tdStyle, color: theme.text, fontFamily: "inherit", fontWeight: 600 }}>{p.name}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{fmt(p.purchasePrice)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{fmt(p.totalRenovation)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{fmt(p.totalHoldingCost)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{fmt(p.expectedPrice)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: p.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>{fmt(p.netProfit)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: p.roi >= 0.15 ? theme.green : p.roi >= 0 ? theme.orange : theme.red }}>{pct(p.roi)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: p.annualizedRoi >= 0.3 ? theme.green : p.annualizedRoi >= 0.15 ? theme.orange : theme.red }}>{pct(p.annualizedRoi)}</td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.dealScore.color, display: "inline-block" }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card title="Net Profit Comparison">
                    <BarChart
                      data={selectedProfileMetrics.map((p) => ({ label: p.name, value: p.netProfit }))}
                      maxVal={Math.max(...selectedProfileMetrics.map((p) => Math.abs(p.netProfit)))}
                      isMobile={isMobile}
                    />
                  </Card>

                  <Card title="ROI Comparison">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {selectedProfileMetrics.map((p) => (
                        <MetricBox key={p.id} label={p.name} value={pct(p.roi)}
                          sub={`Ann: ${pct(p.annualizedRoi)} · ${p.renovationMonths}mo`}
                          color={p.roi >= 0.15 ? theme.green : p.roi >= 0 ? theme.orange : theme.red}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
