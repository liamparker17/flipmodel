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
  sensResaleAdj, setSensResaleAdj, sensRenoAdj, setSensRenoAdj,
  sensHoldAdj, setSensHoldAdj, sensCalc,
  isMobile,
}) {
  const [cashBurnSelection, setCashBurnSelection] = useState({});
  const [profileSelection, setProfileSelection] = useState({});
  const [sortKey, setSortKey] = useState("netProfit");
  const [sortAsc, setSortAsc] = useState(false);

  const activeTab = scenarioTab || "builder";
  const allScenarios = useMemo(() => [...DEFAULT_PRESETS, ...customScenarios], [customScenarios]);

  const scenarioResults = useMemo(() => {
    return allScenarios.map((s) => ({ ...s, result: calcScenario(baseInputs, s) }));
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
    return [...selected].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
  }, [profileMetrics, profileSelection, sortKey, sortAsc]);

  const tabStyle = (tab) => ({
    background: activeTab === tab ? theme.accent : "transparent",
    color: activeTab === tab ? "#000" : theme.textDim,
    border: `1px solid ${activeTab === tab ? theme.accent : theme.cardBorder}`,
    borderRadius: 8, padding: "10px 16px",
    fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
    cursor: "pointer", whiteSpace: "nowrap", minHeight: 44,
  });

  const inputSmall = {
    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
    padding: "8px 10px", color: theme.text, fontSize: 16, width: "100%", textAlign: "right",
    outline: "none", fontFamily: "'JetBrains Mono', monospace", minHeight: 40,
  };

  // Scenario card for mobile
  const ScenarioCard = ({ s, isCustom }) => {
    const r = s.result;
    return (
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.dealScore.color, flexShrink: 0 }} />
            {isCustom ? (
              <input value={s.label} onChange={(e) => updateCustomScenario(s.id, "label", e.target.value)}
                style={{ ...inputSmall, textAlign: "left", flex: 1 }} />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{s.label}</span>
            )}
          </div>
          {isCustom && (
            <button onClick={() => deleteCustomScenario(s.id)} style={{
              background: "none", border: `1px solid ${theme.red}40`, borderRadius: 6,
              color: theme.red, cursor: "pointer", width: 36, height: 36, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 8,
            }}>x</button>
          )}
        </div>
        {isCustom && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Resale %</label>
              <input type="number" value={s.resaleAdjPct} onChange={(e) => updateCustomScenario(s.id, "resaleAdjPct", Number(e.target.value))} style={inputSmall} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Reno %</label>
              <input type="number" value={s.renoAdjPct} onChange={(e) => updateCustomScenario(s.id, "renoAdjPct", Number(e.target.value))} style={inputSmall} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Build +mo</label>
              <input type="number" value={s.constructionDelayMonths} onChange={(e) => updateCustomScenario(s.id, "constructionDelayMonths", Number(e.target.value))} style={inputSmall} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Xfer +mo</label>
              <input type="number" value={s.transferDelayMonths} onChange={(e) => updateCustomScenario(s.id, "transferDelayMonths", Number(e.target.value))} style={inputSmall} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <MetricBox label="Net Profit" value={fmt(r.netProfit)} color={r.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
          <MetricBox label="ROI" value={pct(r.roi)} color={r.roi >= 0.15 ? theme.green : r.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Hold" value={`${r.totalHoldMonths}mo`} isMobile={isMobile} />
        </div>
      </Card>
    );
  };

  // Table row for desktop
  const thStyle = { textAlign: "left", padding: "8px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 };
  const tdStyle = { padding: "8px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 };

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setScenarioTab("builder")} style={tabStyle("builder")}>Scenarios</button>
        <button onClick={() => setScenarioTab("cashBurn")} style={tabStyle("cashBurn")}>Cash Burn</button>
        {profiles && profiles.length >= 2 && (
          <button onClick={() => setScenarioTab("crossProfile")} style={tabStyle("crossProfile")}>Compare ({profiles.length})</button>
        )}
      </div>

      {/* TAB 1: SCENARIO BUILDER */}
      {activeTab === "builder" && (
        <div>
          <Card title="Quick Adjust" subtitle="Drag sliders for real-time scenario modelling.">
            <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={setSensResaleAdj} min={-15} max={15} />
            <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={setSensRenoAdj} min={0} max={30} />
            <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={setSensHoldAdj} min={0} max={14} suffix=" mo" />
            <div style={{ background: theme.input, borderRadius: 10, padding: 14, marginTop: 8 }}>
              <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Slider Result</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MetricBox label="Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
                <MetricBox label="ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
                <MetricBox label="Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
              </div>
            </div>
          </Card>

          <SectionDivider label="Scenario Comparison" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: theme.textDim }}>{allScenarios.length} scenarios</span>
            <button onClick={addCustomScenario} style={{
              background: theme.accent, color: "#000", border: "none", borderRadius: 8,
              padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
            }}>+ Add Scenario</button>
          </div>

          {isMobile ? (
            // Mobile: card layout
            scenarioResults.map((s) => (
              <ScenarioCard key={s.id} s={s} isCustom={!DEFAULT_PRESETS.find((p) => p.id === s.id)} />
            ))
          ) : (
            // Desktop: table layout
            <Card>
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
                      <th style={{ ...thStyle, width: 44 }}></th>
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
                            {isCustom ? <input type="number" value={s.resaleAdjPct} onChange={(e) => updateCustomScenario(s.id, "resaleAdjPct", Number(e.target.value))} style={{ ...inputSmall, width: 70 }} /> : `${s.resaleAdjPct}%`}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {isCustom ? <input type="number" value={s.renoAdjPct} onChange={(e) => updateCustomScenario(s.id, "renoAdjPct", Number(e.target.value))} style={{ ...inputSmall, width: 70 }} /> : `${s.renoAdjPct}%`}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {isCustom ? <input type="number" value={s.constructionDelayMonths} onChange={(e) => updateCustomScenario(s.id, "constructionDelayMonths", Number(e.target.value))} style={{ ...inputSmall, width: 70 }} /> : s.constructionDelayMonths || "\u2014"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {isCustom ? <input type="number" value={s.transferDelayMonths} onChange={(e) => updateCustomScenario(s.id, "transferDelayMonths", Number(e.target.value))} style={{ ...inputSmall, width: 70 }} /> : s.transferDelayMonths || "\u2014"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: theme.textDim }}>{r.totalHoldMonths}mo</td>
                          <td style={{ ...tdStyle, textAlign: "right", color: r.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>{fmt(r.netProfit)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", color: r.roi >= 0.15 ? theme.green : r.roi >= 0 ? theme.orange : theme.red }}>{pct(r.roi)}</td>
                          <td style={{ ...tdStyle, textAlign: "right", color: r.annRoi >= 0.3 ? theme.green : r.annRoi >= 0.15 ? theme.orange : theme.red }}>{pct(r.annRoi)}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {isCustom && (
                              <button onClick={() => deleteCustomScenario(s.id)} style={{ background: "none", border: "none", color: theme.red, cursor: "pointer", fontSize: 16, minWidth: 44, minHeight: 44 }}>x</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card title="Net Profit Comparison">
            <BarChart
              data={scenarioResults.map((s) => ({ label: s.label, value: s.result.netProfit }))}
              maxVal={Math.max(...scenarioResults.map((s) => Math.abs(s.result.netProfit)))}
              isMobile={isMobile}
            />
          </Card>
        </div>
      )}

      {/* TAB 2: CASH BURN */}
      {activeTab === "cashBurn" && (
        <div>
          <Card title="Cash Burn Analysis" subtitle="Compare monthly holding cost burn rate across scenarios.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {scenarioResults.map((s) => {
                const defaultSelected = DEFAULT_PRESETS.slice(0, 4).some((p) => p.id === s.id);
                const isOn = cashBurnSelection[s.id] !== undefined ? cashBurnSelection[s.id] : defaultSelected;
                return (
                  <button key={s.id} onClick={() => setCashBurnSelection((p) => ({ ...p, [s.id]: !isOn }))} style={{
                    background: isOn ? theme.accentDim : theme.input,
                    border: `1px solid ${isOn ? theme.accent : theme.inputBorder}`,
                    borderRadius: 8, padding: "8px 14px", fontSize: 12,
                    color: isOn ? theme.accent : theme.textDim, cursor: "pointer", minHeight: 40,
                  }}>
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Cash burn items - card on mobile, table on desktop */}
            {isMobile ? (
              scenarioResults.filter((s) => {
                const defaultSelected = DEFAULT_PRESETS.slice(0, 4).some((p) => p.id === s.id);
                return cashBurnSelection[s.id] !== undefined ? cashBurnSelection[s.id] : defaultSelected;
              }).map((s) => {
                const r = s.result;
                const totalBurn = r.monthlyBurn * r.totalHoldMonths;
                const burnPct = r.netProfit > 0 ? totalBurn / r.netProfit : 0;
                return (
                  <div key={s.id} style={{ background: theme.input, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dealScore.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{s.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><span style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Monthly</span><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: theme.orange }}>{fmt(r.monthlyBurn)}</div></div>
                      <div><span style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Hold</span><div style={{ fontSize: 13, color: theme.textDim }}>{r.totalHoldMonths} months</div></div>
                      <div><span style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Total Burn</span><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: theme.red, fontWeight: 700 }}>{fmt(totalBurn)}</div></div>
                      <div><span style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Burn % of Profit</span><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: burnPct > 1 ? theme.red : burnPct > 0.5 ? theme.orange : theme.textDim }}>{r.netProfit > 0 ? pct(burnPct) : "N/A"}</div></div>
                    </div>
                  </div>
                );
              })
            ) : (
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
            )}
          </Card>

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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, fontSize: 11 }}>
                    {selected.map((s, idx) => (
                      <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, color: theme.textDim }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[idx % colors.length] }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
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
                            }} title={`${s.label}: Month ${m + 1} \u2014 ${fmt(cum)} cumulative`} />
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

      {/* TAB 3: CROSS-PROFILE */}
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
              <Card title="Select Properties" subtitle="Tick the properties you want to compare.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {profileMetrics.map((p) => {
                    const selected = !!profileSelection[p.id];
                    return (
                      <button key={p.id} onClick={() => setProfileSelection((prev) => ({ ...prev, [p.id]: !selected }))} style={{
                        background: selected ? theme.accentDim : theme.input,
                        border: `1px solid ${selected ? theme.accent : theme.inputBorder}`,
                        borderRadius: 8, padding: "10px 16px", fontSize: 13,
                        color: selected ? theme.accent : theme.textDim, cursor: "pointer",
                        fontWeight: selected ? 600 : 400, minHeight: 44,
                      }}>
                        {selected ? "# " : ""}{p.name}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {selectedProfileMetrics.length >= 2 && (
                <>
                  <SectionDivider label="Property Comparison" />
                  {isMobile ? (
                    // Mobile: stacked cards
                    selectedProfileMetrics.map((p) => (
                      <Card key={p.id} style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{p.name}</span>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.dealScore.color }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <MetricBox label="Purchase" value={fmt(p.purchasePrice)} isMobile />
                          <MetricBox label="Reno" value={fmt(p.totalRenovation)} isMobile />
                          <MetricBox label="Net Profit" value={fmt(p.netProfit)} color={p.netProfit >= 0 ? theme.green : theme.red} isMobile />
                          <MetricBox label="ROI" value={pct(p.roi)} color={p.roi >= 0.15 ? theme.green : p.roi >= 0 ? theme.orange : theme.red} isMobile />
                          <MetricBox label="Ann. ROI" value={pct(p.annualizedRoi)} color={p.annualizedRoi >= 0.3 ? theme.green : theme.orange} isMobile />
                          <MetricBox label="Hold" value={`${p.renovationMonths}mo`} isMobile />
                        </div>
                      </Card>
                    ))
                  ) : (
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
                                  {col.label} {sortKey === col.key ? (sortAsc ? "\u2191" : "\u2193") : ""}
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
                  )}

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
                          sub={`Ann: ${pct(p.annualizedRoi)} \u00b7 ${p.renovationMonths}mo`}
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
