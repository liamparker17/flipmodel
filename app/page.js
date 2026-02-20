"use client";
import { useState, useMemo, useCallback, useEffect } from "react";

// ─── SA TRANSFER DUTY CALCULATOR ───
const calcTransferDuty = (price) => {
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48675 + (price - 2117500) * 0.08;
  if (price <= 12100000) return 97075 + (price - 2722500) * 0.11;
  return 1128600 + (price - 12100000) * 0.13;
};

const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "R 0";
  return "R " + Math.round(n).toLocaleString("en-ZA");
};
const pct = (n) => (isNaN(n) ? "0%" : (n * 100).toFixed(1) + "%");

// ─── DEFAULT COST DATABASE (ZAR per sqm or fixed) ───
const DEFAULT_COSTS = {
  structural: {
    demolition: { label: "Demolition", perSqm: true, cost: 350 },
    brickwork: { label: "Brickwork alterations", perSqm: true, cost: 1800 },
    lintels: { label: "Lintels", perSqm: false, cost: 8500 },
    steel: { label: "Structural steel", perSqm: false, cost: 25000 },
    plastering: { label: "Plastering", perSqm: true, cost: 220 },
    screeding: { label: "Screeding", perSqm: true, cost: 180 },
    ceiling: { label: "Ceiling replacement", perSqm: true, cost: 380 },
    insulation: { label: "Insulation", perSqm: true, cost: 250 },
    roofing: { label: "Roofing repairs", perSqm: true, cost: 450 },
    waterproofing: { label: "Waterproofing", perSqm: true, cost: 320 },
    fascia: { label: "Fascia boards", perSqm: false, cost: 12000 },
    dampProofing: { label: "Damp proofing", perSqm: true, cost: 280 },
    crackRepairs: { label: "Crack repairs", perSqm: false, cost: 8000 },
  },
  electrical: {
    rewiring: { label: "Full rewiring", perSqm: true, cost: 650 },
    dbBoard: { label: "New DB board", perSqm: false, cost: 18000 },
    lightFittings: { label: "Light fittings", perSqm: true, cost: 180 },
    switchesPlugs: { label: "Switches & plugs", perSqm: true, cost: 120 },
    coc: { label: "Electrical COC", perSqm: false, cost: 4500 },
  },
  plumbing: {
    rePiping: { label: "Re-piping", perSqm: true, cost: 480 },
    drainage: { label: "Drainage", perSqm: false, cost: 15000 },
    geyser: { label: "Geyser replacement", perSqm: false, cost: 22000 },
    bathroomFixtures: { label: "Bathroom fixtures", perSqm: false, cost: 35000 },
    kitchenPlumbing: { label: "Kitchen plumbing", perSqm: false, cost: 12000 },
    pressurePump: { label: "Pressure pump", perSqm: false, cost: 8500 },
  },
  finishes: {
    flooring: { label: "Flooring", perSqm: true, cost: 550 },
    skirting: { label: "Skirting", perSqm: true, cost: 85 },
    painting: { label: "Painting (walls + ceilings)", perSqm: true, cost: 120 },
    cornices: { label: "Cornices", perSqm: true, cost: 95 },
    internalDoors: { label: "Internal doors", perSqm: false, cost: 4500 },
    frames: { label: "Door frames", perSqm: false, cost: 2800 },
    ironmongery: { label: "Ironmongery", perSqm: false, cost: 1200 },
    builtInCupboards: { label: "Built-in cupboards", perSqm: true, cost: 3200 },
    kitchenCabinetry: { label: "Kitchen cabinetry", perSqm: true, cost: 4500 },
    countertops: { label: "Countertops (granite/quartz)", perSqm: true, cost: 3800 },
    tiling: { label: "Tiling", perSqm: true, cost: 650 },
    mirrors: { label: "Mirrors", perSqm: false, cost: 3500 },
    showerGlass: { label: "Shower glass", perSqm: false, cost: 8500 },
    wardrobes: { label: "Wardrobes", perSqm: true, cost: 3000 },
  },
  exterior: {
    roofCoating: { label: "Roof coating", perSqm: true, cost: 180 },
    exteriorPainting: { label: "Exterior painting", perSqm: true, cost: 150 },
    boundaryWall: { label: "Boundary wall repair", perSqm: false, cost: 35000 },
    paving: { label: "Paving", perSqm: true, cost: 450 },
    driveway: { label: "Driveway resurfacing", perSqm: true, cost: 380 },
    landscaping: { label: "Landscaping", perSqm: false, cost: 25000 },
    irrigation: { label: "Irrigation", perSqm: false, cost: 18000 },
    poolRefurb: { label: "Pool refurb", perSqm: false, cost: 65000 },
  },
  compliance: {
    architect: { label: "Architect", perSqm: false, cost: 45000 },
    structuralEngineer: { label: "Structural engineer", perSqm: false, cost: 25000 },
    municipalFees: { label: "Municipal submission fees", perSqm: false, cost: 15000 },
    electricalCoc: { label: "Electrical COC", perSqm: false, cost: 4500 },
    plumbingCoc: { label: "Plumbing COC", perSqm: false, cost: 3500 },
    nhbrc: { label: "NHBRC (if relevant)", perSqm: false, cost: 12000 },
  },
  projectLevel: {
    siteSecurity: { label: "Site security", perSqm: false, cost: 18000 },
    skipHire: { label: "Skip hire", perSqm: false, cost: 12000 },
    labour: { label: "Labour", perSqm: true, cost: 800 },
  },
};

// Scope multipliers
const SCOPE_MULT = { cosmetic: 0.25, midLevel: 0.55, fullGut: 1.0 };

const PRESET_ROOMS = [
  { name: "Master Bedroom", sqm: 16, scope: "midLevel" },
  { name: "Bedroom 2", sqm: 12, scope: "midLevel" },
  { name: "Bedroom 3", sqm: 10, scope: "cosmetic" },
  { name: "Main Bathroom", sqm: 8, scope: "fullGut" },
  { name: "En-suite Bathroom", sqm: 6, scope: "fullGut" },
  { name: "Kitchen", sqm: 14, scope: "fullGut" },
  { name: "Lounge", sqm: 22, scope: "midLevel" },
  { name: "Dining Room", sqm: 14, scope: "cosmetic" },
  { name: "Scullery", sqm: 6, scope: "midLevel" },
  { name: "Entrance Hall", sqm: 8, scope: "cosmetic" },
  { name: "Passage", sqm: 10, scope: "cosmetic" },
  { name: "Garage", sqm: 36, scope: "cosmetic" },
  { name: "Patio", sqm: 20, scope: "cosmetic" },
];

const STEPS = [
  "Acquisition",
  "Property",
  "Rooms",
  "Renovation Costs",
  "Holding Costs",
  "Resale & Profit",
  "Sensitivity",
  "Summary",
];

const SA_PRIME = 11.75;

export default function FlipModelApp() {
  // ─── STEP STATE ───
  const [step, setStep] = useState(0);

  // ─── ACQUISITION ───
  const [acq, setAcq] = useState({
    purchasePrice: 1200000,
    deposit: 0,
    bondRate: SA_PRIME + 1,
    bondTerm: 240,
    cashPurchase: false,
    transferAttorneyFees: 45000,
    bondRegistration: 25000,
    initialRepairs: 0,
  });

  // ─── PROPERTY ───
  const [prop, setProp] = useState({
    totalSqm: 180,
    erfSize: 600,
    bedrooms: 3,
    bathrooms: 2,
    garages: 1,
    stories: "single",
  });

  // ─── ROOMS ───
  const [rooms, setRooms] = useState(PRESET_ROOMS.map((r, i) => ({ id: i, ...r, customCost: null, notes: "" })));
  const [nextRoomId, setNextRoomId] = useState(PRESET_ROOMS.length);

  // ─── COST OVERRIDES ───
  const [costDb, setCostDb] = useState(JSON.parse(JSON.stringify(DEFAULT_COSTS)));
  const [contingencyPct, setContingencyPct] = useState(10);
  const [pmPct, setPmPct] = useState(8);

  // ─── HOLDING ───
  const [holding, setHolding] = useState({
    renovationMonths: 4,
    ratesAndTaxes: 1800,
    utilities: 1200,
    insurance: 950,
    security: 2500,
    levies: 0,
  });

  // ─── RESALE ───
  const [resale, setResale] = useState({
    expectedPrice: 2800000,
    areaBenchmarkPsqm: 18000,
    agentCommission: 5,
  });

  // ─── CALCULATIONS ───
  const transferDuty = useMemo(() => calcTransferDuty(acq.purchasePrice), [acq.purchasePrice]);

  const totalAcquisition = useMemo(() => {
    return acq.purchasePrice + transferDuty + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs;
  }, [acq, transferDuty]);

  // Room-level reno costs
  const roomCosts = useMemo(() => {
    return rooms.map((room) => {
      if (room.customCost !== null && room.customCost !== "") {
        return { ...room, totalCost: Number(room.customCost) };
      }
      const mult = SCOPE_MULT[room.scope] || 1;
      let total = 0;
      for (const cat of Object.values(costDb)) {
        for (const item of Object.values(cat)) {
          if (item.perSqm) {
            total += item.cost * room.sqm * mult;
          }
        }
      }
      return { ...room, totalCost: Math.round(total) };
    });
  }, [rooms, costDb]);

  const totalRoomRenoCost = useMemo(() => roomCosts.reduce((s, r) => s + r.totalCost, 0), [roomCosts]);

  // Fixed costs (not per-sqm items)
  const fixedCosts = useMemo(() => {
    let total = 0;
    for (const cat of Object.values(costDb)) {
      for (const item of Object.values(cat)) {
        if (!item.perSqm) total += item.cost;
      }
    }
    return total;
  }, [costDb]);

  const pmCost = useMemo(() => (totalRoomRenoCost + fixedCosts) * (pmPct / 100), [totalRoomRenoCost, fixedCosts, pmPct]);
  const contingency = useMemo(
    () => (totalRoomRenoCost + fixedCosts + pmCost) * (contingencyPct / 100),
    [totalRoomRenoCost, fixedCosts, pmCost, contingencyPct]
  );
  const totalRenovation = useMemo(
    () => totalRoomRenoCost + fixedCosts + pmCost + contingency,
    [totalRoomRenoCost, fixedCosts, pmCost, contingency]
  );
  const renoCostPerSqm = useMemo(() => (prop.totalSqm > 0 ? totalRenovation / prop.totalSqm : 0), [totalRenovation, prop.totalSqm]);

  // Holding costs
  const monthlyBondInterest = useMemo(() => {
    if (acq.cashPurchase) return 0;
    const bondAmount = acq.purchasePrice - acq.deposit;
    return (bondAmount * (acq.bondRate / 100)) / 12;
  }, [acq]);

  const totalHoldingCost = useMemo(() => {
    const monthly =
      monthlyBondInterest + holding.ratesAndTaxes + holding.utilities + holding.insurance + holding.security + holding.levies;
    return monthly * holding.renovationMonths;
  }, [monthlyBondInterest, holding]);

  // Final model
  const allInCost = useMemo(() => totalAcquisition + totalRenovation + totalHoldingCost, [totalAcquisition, totalRenovation, totalHoldingCost]);
  const agentComm = useMemo(() => resale.expectedPrice * (resale.agentCommission / 100), [resale]);
  const grossProfit = useMemo(() => resale.expectedPrice - allInCost, [resale.expectedPrice, allInCost]);
  const netProfit = useMemo(() => grossProfit - agentComm, [grossProfit, agentComm]);
  const profitPerSqm = useMemo(() => (prop.totalSqm > 0 ? netProfit / prop.totalSqm : 0), [netProfit, prop.totalSqm]);
  const roi = useMemo(() => (allInCost > 0 ? netProfit / allInCost : 0), [netProfit, allInCost]);
  const cashInvested = useMemo(() => acq.deposit + totalRenovation + totalHoldingCost + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs + transferDuty, [acq, totalRenovation, totalHoldingCost, transferDuty]);
  const returnOnCash = useMemo(() => (cashInvested > 0 ? netProfit / cashInvested : 0), [netProfit, cashInvested]);
  const breakEvenResale = useMemo(() => allInCost + agentComm, [allInCost, agentComm]);

  // Sensitivity
  const sensitivity = useMemo(() => {
    const scenarios = [];
    const calc = (resaleAdj, renoAdj, holdAdj) => {
      const adjReno = totalRenovation * (1 + renoAdj);
      const adjHold = totalHoldingCost * (1 + holdAdj / holding.renovationMonths);
      const adjAllIn = totalAcquisition + adjReno + adjHold;
      const adjResale = resale.expectedPrice * (1 + resaleAdj);
      const adjComm = adjResale * (resale.agentCommission / 100);
      const adjNet = adjResale - adjAllIn - adjComm;
      const adjRoi = adjAllIn > 0 ? adjNet / adjAllIn : 0;
      return { allIn: adjAllIn, resalePrice: adjResale, netProfit: adjNet, roi: adjRoi };
    };
    scenarios.push({ label: "Base case", ...calc(0, 0, 0) });
    scenarios.push({ label: "Resale −5%", ...calc(-0.05, 0, 0) });
    scenarios.push({ label: "Resale −10%", ...calc(-0.1, 0, 0) });
    scenarios.push({ label: "Reno +10%", ...calc(0, 0.1, 0) });
    scenarios.push({ label: "Reno +15%", ...calc(0, 0.15, 0) });
    scenarios.push({ label: "+2 months holding", ...calc(0, 0, 2) });
    scenarios.push({ label: "Worst case (Resale −10%, Reno +15%, +2mo)", ...calc(-0.1, 0.15, 2) });
    return scenarios;
  }, [totalRenovation, totalHoldingCost, totalAcquisition, resale, holding.renovationMonths]);

  // ─── HELPERS ───
  const updateAcq = (k, v) => setAcq((p) => ({ ...p, [k]: v }));
  const updateProp = (k, v) => setProp((p) => ({ ...p, [k]: v }));
  const updateHolding = (k, v) => setHolding((p) => ({ ...p, [k]: v }));
  const updateResale = (k, v) => setResale((p) => ({ ...p, [k]: v }));
  const updateRoom = (id, k, v) => setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const removeRoom = (id) => setRooms((prev) => prev.filter((r) => r.id !== id));
  const addRoom = () => {
    setRooms((prev) => [...prev, { id: nextRoomId, name: "New Room", sqm: 10, scope: "cosmetic", customCost: null, notes: "" }]);
    setNextRoomId((p) => p + 1);
  };

  const updateCostItem = (cat, key, val) => {
    setCostDb((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[cat][key].cost = Number(val);
      return next;
    });
  };

  // ─── STYLES ───
  const theme = {
    bg: "#0C0F14",
    card: "#151921",
    cardBorder: "#1E2430",
    accent: "#D4A853",
    accentDim: "#D4A85330",
    green: "#34D399",
    red: "#F87171",
    orange: "#FB923C",
    text: "#E8E6E1",
    textDim: "#8B8D93",
    input: "#1A1F2A",
    inputBorder: "#2A3040",
  };

  // ─── RENDER HELPERS ───
  const NumInput = ({ label, value, onChange, prefix = "R", suffix = "", width = "100%", small = false }) => (
    <div style={{ marginBottom: small ? 6 : 12, width }}>
      {label && <label style={{ display: "block", fontSize: 11, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 10px" }}>
        {prefix && <span style={{ color: theme.textDim, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ background: "transparent", border: "none", color: theme.text, fontSize: small ? 13 : 14, width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
        />
        {suffix && <span style={{ color: theme.textDim, fontSize: 12, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );

  const Toggle = ({ label, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, background: value ? theme.accent : theme.inputBorder, cursor: "pointer", position: "relative", transition: "all 0.2s",
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "all 0.2s" }} />
      </div>
      <span style={{ fontSize: 13, color: theme.text }}>{label}</span>
    </div>
  );

  const Select = ({ label, value, onChange, options }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 10px", color: theme.text, fontSize: 14, width: "100%", outline: "none" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  const Card = ({ children, title, style: s = {} }) => (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 16, ...s }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: 15, color: theme.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>}
      {children}
    </div>
  );

  const MetricBox = ({ label, value, sub, color = theme.text }) => (
    <div style={{ background: theme.input, borderRadius: 8, padding: "12px 14px", minWidth: 140, flex: 1 }}>
      <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const BarChart = ({ data, maxVal }) => {
    const max = maxVal || Math.max(...data.map((d) => Math.abs(d.value)));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 180, fontSize: 12, color: theme.textDim, textAlign: "right", flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, height: 22, background: theme.input, borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.abs(d.value / max) * 100}%`,
                  background: d.value >= 0 ? theme.green : theme.red,
                  borderRadius: 4,
                  opacity: 0.7,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ width: 110, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: d.value >= 0 ? theme.green : theme.red, textAlign: "right" }}>
              {fmt(d.value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── STEP CONTENT ───
  const renderStep = () => {
    switch (step) {
      case 0: // Acquisition
        return (
          <div>
            <Card title="Purchase Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Purchase Price" value={acq.purchasePrice} onChange={(v) => updateAcq("purchasePrice", v)} />
                <NumInput label="Deposit" value={acq.deposit} onChange={(v) => updateAcq("deposit", v)} />
              </div>
              <Toggle label="Cash purchase (no bond)" value={acq.cashPurchase} onChange={(v) => updateAcq("cashPurchase", v)} />
              {!acq.cashPurchase && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <NumInput label="Bond Interest Rate" value={acq.bondRate} onChange={(v) => updateAcq("bondRate", v)} prefix="" suffix="%" />
                  <NumInput label="Bond Term (months)" value={acq.bondTerm} onChange={(v) => updateAcq("bondTerm", v)} prefix="" suffix="mo" />
                </div>
              )}
            </Card>
            <Card title="Transfer & Registration Costs">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", background: theme.accentDim, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: theme.accent }}>⚡ Auto-calculated transfer duty:</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(transferDuty)}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Transfer Attorney Fees" value={acq.transferAttorneyFees} onChange={(v) => updateAcq("transferAttorneyFees", v)} />
                <NumInput label="Bond Registration" value={acq.bondRegistration} onChange={(v) => updateAcq("bondRegistration", v)} />
              </div>
              <NumInput label="Initial Repairs Identified" value={acq.initialRepairs} onChange={(v) => updateAcq("initialRepairs", v)} />
            </Card>
            <Card title="Acquisition Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Purchase Price" value={fmt(acq.purchasePrice)} />
                <MetricBox label="Transfer Duty" value={fmt(transferDuty)} />
                <MetricBox label="Total Acquisition" value={fmt(totalAcquisition)} color={theme.accent} />
              </div>
            </Card>
          </div>
        );

      case 1: // Property
        return (
          <Card title="Property Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <NumInput label="Total Property Size" value={prop.totalSqm} onChange={(v) => updateProp("totalSqm", v)} prefix="" suffix="sqm" />
              <NumInput label="Erf Size" value={prop.erfSize} onChange={(v) => updateProp("erfSize", v)} prefix="" suffix="sqm" />
              <NumInput label="Bedrooms" value={prop.bedrooms} onChange={(v) => updateProp("bedrooms", v)} prefix="" />
              <NumInput label="Bathrooms" value={prop.bathrooms} onChange={(v) => updateProp("bathrooms", v)} prefix="" />
              <NumInput label="Garages" value={prop.garages} onChange={(v) => updateProp("garages", v)} prefix="" />
              <Select label="Stories" value={prop.stories} onChange={(v) => updateProp("stories", v)} options={[
                { value: "single", label: "Single storey" },
                { value: "double", label: "Double storey" },
              ]} />
            </div>
          </Card>
        );

      case 2: // Rooms
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: theme.textDim }}>
                {rooms.length} rooms · {rooms.reduce((s, r) => s + r.sqm, 0)} sqm total
              </span>
              <button onClick={addRoom} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Add Room
              </button>
            </div>
            {rooms.map((room) => (
              <Card key={room.id} style={{ padding: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr 30px", gap: 10, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Room Name</label>
                    <input
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                      style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 10px", color: theme.text, fontSize: 13, width: "100%", outline: "none" }}
                    />
                  </div>
                  <NumInput label="Size (sqm)" value={room.sqm} onChange={(v) => updateRoom(room.id, "sqm", v)} prefix="" suffix="sqm" small />
                  <Select label="Scope" value={room.scope} onChange={(v) => updateRoom(room.id, "scope", v)} options={[
                    { value: "cosmetic", label: "Cosmetic (25%)" },
                    { value: "midLevel", label: "Mid-level (55%)" },
                    { value: "fullGut", label: "Full gut (100%)" },
                  ]} />
                  <NumInput label="Override" value={room.customCost || ""} onChange={(v) => updateRoom(room.id, "customCost", v || null)} small />
                  <button onClick={() => removeRoom(room.id)} style={{ background: "none", border: "none", color: theme.red, fontSize: 18, cursor: "pointer", padding: 0, marginBottom: 12 }}>×</button>
                </div>
              </Card>
            ))}
          </div>
        );

      case 3: // Renovation Costs
        return (
          <div>
            {Object.entries(costDb).map(([catKey, items]) => (
              <Card key={catKey} title={catKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                  {Object.entries(items).map(([itemKey, item]) => (
                    <div key={itemKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontSize: 12, color: theme.textDim }}>{item.label}</span>
                      <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "3px 6px", width: 120 }}>
                        <span style={{ fontSize: 10, color: theme.textDim, marginRight: 3 }}>R</span>
                        <input
                          type="number"
                          value={item.cost}
                          onChange={(e) => updateCostItem(catKey, itemKey, e.target.value)}
                          style={{ background: "transparent", border: "none", color: theme.text, fontSize: 12, width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </div>
                      <span style={{ fontSize: 9, color: theme.textDim, width: 40 }}>{item.perSqm ? "/sqm" : "fixed"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <Card title="Project Overheads">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Project Management" value={pmPct} onChange={setPmPct} prefix="" suffix="%" />
                <NumInput label="Contingency" value={contingencyPct} onChange={setContingencyPct} prefix="" suffix="%" />
              </div>
            </Card>
            <Card title="Renovation Cost Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Room-Level Costs" value={fmt(totalRoomRenoCost)} />
                <MetricBox label="Fixed Costs" value={fmt(fixedCosts)} />
                <MetricBox label="PM Fee" value={fmt(pmCost)} />
                <MetricBox label="Contingency" value={fmt(contingency)} />
                <MetricBox label="Total Renovation" value={fmt(totalRenovation)} color={theme.accent} />
                <MetricBox label="Cost/sqm" value={fmt(renoCostPerSqm)} sub="per sqm" />
              </div>
            </Card>
          </div>
        );

      case 4: // Holding Costs
        return (
          <div>
            <Card title="Holding Period">
              <NumInput label="Renovation Duration" value={holding.renovationMonths} onChange={(v) => updateHolding("renovationMonths", v)} prefix="" suffix="months" />
            </Card>
            <Card title="Monthly Holding Costs">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Rates & Taxes" value={holding.ratesAndTaxes} onChange={(v) => updateHolding("ratesAndTaxes", v)} suffix="/mo" />
                <NumInput label="Utilities" value={holding.utilities} onChange={(v) => updateHolding("utilities", v)} suffix="/mo" />
                <NumInput label="Insurance" value={holding.insurance} onChange={(v) => updateHolding("insurance", v)} suffix="/mo" />
                <NumInput label="Security" value={holding.security} onChange={(v) => updateHolding("security", v)} suffix="/mo" />
                <NumInput label="Levies" value={holding.levies} onChange={(v) => updateHolding("levies", v)} suffix="/mo" />
              </div>
            </Card>
            {!acq.cashPurchase && (
              <Card title="Bond Interest">
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: theme.accentDim, borderRadius: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: theme.accent }}>Monthly bond interest (interest-only during reno):</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(monthlyBondInterest)}</span>
                </div>
              </Card>
            )}
            <Card title="Holding Cost Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <MetricBox label={`Total Holding (${holding.renovationMonths} months)`} value={fmt(totalHoldingCost)} color={theme.accent} />
            </Card>
          </div>
        );

      case 5: // Resale
        return (
          <div>
            <Card title="Resale Modelling">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Expected Resale Price" value={resale.expectedPrice} onChange={(v) => updateResale("expectedPrice", v)} />
                <NumInput label="Area Benchmark" value={resale.areaBenchmarkPsqm} onChange={(v) => updateResale("areaBenchmarkPsqm", v)} suffix="/sqm" />
                <NumInput label="Agent Commission" value={resale.agentCommission} onChange={(v) => updateResale("agentCommission", v)} prefix="" suffix="%" />
              </div>
              <div style={{ fontSize: 12, color: theme.textDim, marginTop: 8 }}>
                Benchmark resale value: {fmt(resale.areaBenchmarkPsqm * prop.totalSqm)} ({prop.totalSqm} sqm × {fmt(resale.areaBenchmarkPsqm)}/sqm)
              </div>
            </Card>
            <Card title="Profit Analysis" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <MetricBox label="All-In Cost" value={fmt(allInCost)} />
                <MetricBox label="Resale Price" value={fmt(resale.expectedPrice)} />
                <MetricBox label="Agent Commission" value={fmt(agentComm)} />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <MetricBox label="Gross Profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? theme.green : theme.red} />
                <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} />
                <MetricBox label="Profit/sqm" value={fmt(profitPerSqm)} color={profitPerSqm >= 0 ? theme.green : theme.red} />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} />
                <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} />
                <MetricBox label="Break-Even Resale" value={fmt(breakEvenResale)} />
              </div>
            </Card>
            <Card title="Formulas">
              <div style={{ fontSize: 11, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", lineHeight: 2 }}>
                <div>All-In = Acquisition({fmt(totalAcquisition)}) + Renovation({fmt(totalRenovation)}) + Holding({fmt(totalHoldingCost)})</div>
                <div>Gross Profit = Resale − All-In = {fmt(resale.expectedPrice)} − {fmt(allInCost)} = {fmt(grossProfit)}</div>
                <div>Net Profit = Gross Profit − Agent Comm = {fmt(grossProfit)} − {fmt(agentComm)} = {fmt(netProfit)}</div>
                <div>ROI = Net Profit ÷ All-In = {fmt(netProfit)} ÷ {fmt(allInCost)} = {pct(roi)}</div>
                <div>Return on Cash = Net Profit ÷ Cash Invested = {fmt(netProfit)} ÷ {fmt(cashInvested)} = {pct(returnOnCash)}</div>
              </div>
            </Card>
          </div>
        );

      case 6: // Sensitivity
        return (
          <div>
            <Card title="Sensitivity Analysis">
              <BarChart
                data={sensitivity.map((s) => ({ label: s.label, value: s.netProfit }))}
                maxVal={Math.max(...sensitivity.map((s) => Math.abs(s.netProfit)))}
              />
            </Card>
            <Card title="Scenario Detail">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      {["Scenario", "All-In Cost", "Resale", "Net Profit", "ROI"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.map((s, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                        <td style={{ padding: "8px 10px", color: theme.text, fontWeight: i === 0 ? 700 : 400 }}>{s.label}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.textDim }}>{fmt(s.allIn)}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.textDim }}>{fmt(s.resalePrice)}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>
                          {fmt(s.netProfit)}
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.roi >= 0.15 ? theme.green : s.roi >= 0 ? theme.orange : theme.red }}>
                          {pct(s.roi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case 7: // Summary
        return (
          <div>
            <Card title="Project Cost Stack" style={{ background: `${theme.accent}08` }}>
              <BarChart
                data={[
                  { label: "Purchase Price", value: acq.purchasePrice },
                  { label: "Transfer & Fees", value: transferDuty + acq.transferAttorneyFees + acq.bondRegistration },
                  { label: "Renovation", value: totalRenovation },
                  { label: "Holding Costs", value: totalHoldingCost },
                  { label: "Agent Commission", value: agentComm },
                ]}
              />
            </Card>
            <Card title="Key Metrics">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <MetricBox label="All-In Cost" value={fmt(allInCost)} />
                <MetricBox label="Resale Price" value={fmt(resale.expectedPrice)} />
                <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} />
                <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : theme.orange} />
                <MetricBox label="Reno Cost/sqm" value={fmt(renoCostPerSqm)} />
                <MetricBox label="Profit/sqm" value={fmt(profitPerSqm)} color={profitPerSqm >= 0 ? theme.green : theme.red} />
                <MetricBox label="Break-Even" value={fmt(breakEvenResale)} />
              </div>
            </Card>
            <Card title="Room Cost Breakdown">
              {roomCosts.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
                  <span style={{ color: theme.text }}>{r.name} <span style={{ color: theme.textDim, fontSize: 11 }}>({r.sqm}sqm · {r.scope})</span></span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(r.totalCost)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: theme.text }}>Room-level total</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(totalRoomRenoCost)}</span>
              </div>
            </Card>
            <Card title="Go / No-Go Assessment">
              {(() => {
                const score = roi >= 0.2 ? 3 : roi >= 0.12 ? 2 : roi >= 0 ? 1 : 0;
                const labels = ["❌ AVOID — Negative or break-even", "⚠️ MARGINAL — Below 12% ROI", "✅ VIABLE — 12–20% ROI", "🔥 STRONG DEAL — 20%+ ROI"];
                const colors = [theme.red, theme.orange, theme.green, theme.green];
                return (
                  <div style={{ fontSize: 16, fontWeight: 700, color: colors[score], textAlign: "center", padding: 16 }}>
                    {labels[score]}
                  </div>
                );
              })()}
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#000" }}>F</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>FlipModel</div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>SA Property Dev Feasibility</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: theme.textDim }}>SA Prime: {SA_PRIME}%</div>
      </div>

      {/* Step nav */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", gap: 2, overflowX: "auto" }}>
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            style={{
              background: step === i ? theme.accent : "transparent",
              color: step === i ? "#000" : theme.textDim,
              border: `1px solid ${step === i ? theme.accent : theme.cardBorder}`,
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: step === i ? 700 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "20px 24px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 300, marginBottom: 20, color: theme.text }}>
          <span style={{ color: theme.accent, fontWeight: 700 }}>{step + 1}</span>
          <span style={{ color: theme.textDim, margin: "0 8px" }}>/</span>
          {STEPS[step]}
        </h2>
        {renderStep()}

        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingBottom: 40 }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              background: "transparent",
              border: `1px solid ${theme.cardBorder}`,
              color: step === 0 ? theme.textDim : theme.text,
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 13,
              cursor: step === 0 ? "default" : "pointer",
            }}
          >
            ← Previous
          </button>
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
            style={{
              background: step === STEPS.length - 1 ? theme.cardBorder : theme.accent,
              border: "none",
              color: step === STEPS.length - 1 ? theme.textDim : "#000",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 13,
              fontWeight: 700,
              cursor: step === STEPS.length - 1 ? "default" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}