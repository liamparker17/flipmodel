"use client";
import { useState, useMemo, useEffect, useRef } from "react";

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

// Smart defaults for quick mode
const QUICK_DEFAULTS = {
  deposit: 0,
  bondRate: SA_PRIME + 1,
  bondTerm: 240,
  transferAttorneyFees: 45000,
  bondRegistration: 25000,
  initialRepairs: 0,
  totalSqm: 180,
  erfSize: 600,
  agentCommission: 5,
  ratesAndTaxes: 1800,
  utilities: 1200,
  insurance: 950,
  security: 2500,
  levies: 0,
  contingencyPct: 10,
  pmPct: 8,
};

const TOOLTIPS = {
  purchasePrice: "The agreed purchase price of the property before any additional costs.",
  deposit: "Upfront cash payment towards the purchase. Reduces your bond amount.",
  bondRate: "The annual interest rate on your bond. SA prime rate is currently " + SA_PRIME + "%. Leave as-is if unsure.",
  bondTerm: "How long you'll hold the bond, in months. Standard is 240 months (20 years).",
  cashPurchase: "Toggle this if you're buying without a bond (100% cash). No bond interest will apply.",
  transferDuty: "A government tax on property purchases, calculated on a sliding scale based on purchase price.",
  transferAttorneyFees: "Legal fees paid to the transfer attorney for registering the property in your name.",
  bondRegistration: "Fees for registering your bond with the deeds office. Leave at R 0 if paying cash.",
  initialRepairs: "Any urgent repairs needed before the main renovation begins (e.g. roof leaks, security).",
  totalSqm: "The total internal floor area of the property in square metres.",
  erfSize: "The total land/stand size in square metres.",
  ratesAndTaxes: "Monthly municipal rates and taxes payable while you hold the property.",
  utilities: "Monthly electricity, water, and other utility costs during the renovation period.",
  insurance: "Monthly insurance premium for the property during renovation.",
  security: "Monthly security costs (armed response, guards) during the renovation period.",
  levies: "Monthly body corporate or HOA levies. Leave at R 0 if not in a complex or estate.",
  renovationMonths: "How many months you expect the renovation to take from start to finish.",
  expectedPrice: "What you expect to sell the property for after renovation. Research comparable sales in the area.",
  areaBenchmarkPsqm: "Average price per sqm in the area. Helps you benchmark your expected resale price.",
  agentCommission: "The estate agent's commission percentage on the sale. Typically 5-7% in SA.",
  contingency: "Extra budget (as a %) to cover unexpected costs. 10-15% is standard for renovations.",
  pmPct: "Project management fee as a percentage of renovation costs. Typically 8-12%.",
  renoEstimate: "Your total estimated renovation budget. In Advanced Mode you can break this down room by room.",
  annualizedRoi: "ROI scaled to a 12-month period. Allows you to compare deals with different holding periods.",
};

export default function FlipModelApp() {
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState("quick"); // "quick" | "advanced"
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single",
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
    renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0,
  });

  // ─── RESALE ───
  const [resale, setResale] = useState({
    expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5,
  });

  // ─── QUICK MODE: direct reno estimate ───
  const [quickRenoEstimate, setQuickRenoEstimate] = useState(500000);

  // ─── SENSITIVITY SLIDERS ───
  const [sensResaleAdj, setSensResaleAdj] = useState(0);   // -15 to +15 %
  const [sensRenoAdj, setSensRenoAdj] = useState(0);       // 0 to 30 %
  const [sensHoldAdj, setSensHoldAdj] = useState(0);       // 0 to 14 extra months

  // ─── CALCULATIONS ───
  const transferDuty = useMemo(() => calcTransferDuty(acq.purchasePrice), [acq.purchasePrice]);

  const totalAcquisition = useMemo(() => {
    return acq.purchasePrice + transferDuty + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs;
  }, [acq, transferDuty]);

  const roomCosts = useMemo(() => {
    return rooms.map((room) => {
      if (room.customCost !== null && room.customCost !== "") {
        return { ...room, totalCost: Number(room.customCost) };
      }
      const mult = SCOPE_MULT[room.scope] || 1;
      let total = 0;
      for (const cat of Object.values(costDb)) {
        for (const item of Object.values(cat)) {
          if (item.perSqm) total += item.cost * room.sqm * mult;
        }
      }
      return { ...room, totalCost: Math.round(total) };
    });
  }, [rooms, costDb]);

  const totalRoomRenoCost = useMemo(() => roomCosts.reduce((s, r) => s + r.totalCost, 0), [roomCosts]);

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
  const advancedTotalRenovation = useMemo(
    () => totalRoomRenoCost + fixedCosts + pmCost + contingency,
    [totalRoomRenoCost, fixedCosts, pmCost, contingency]
  );

  // Use quick estimate or advanced calculation depending on mode
  const totalRenovation = mode === "quick" ? quickRenoEstimate : advancedTotalRenovation;

  const renoCostPerSqm = useMemo(() => (prop.totalSqm > 0 ? totalRenovation / prop.totalSqm : 0), [totalRenovation, prop.totalSqm]);

  const monthlyBondInterest = useMemo(() => {
    if (acq.cashPurchase) return 0;
    const bondAmount = acq.purchasePrice - acq.deposit;
    return (bondAmount * (acq.bondRate / 100)) / 12;
  }, [acq]);

  const monthlyHoldingTotal = useMemo(() => {
    return monthlyBondInterest + holding.ratesAndTaxes + holding.utilities + holding.insurance + holding.security + holding.levies;
  }, [monthlyBondInterest, holding]);

  const totalHoldingCost = useMemo(() => monthlyHoldingTotal * holding.renovationMonths, [monthlyHoldingTotal, holding.renovationMonths]);

  const allInCost = useMemo(() => totalAcquisition + totalRenovation + totalHoldingCost, [totalAcquisition, totalRenovation, totalHoldingCost]);
  const agentComm = useMemo(() => resale.expectedPrice * (resale.agentCommission / 100), [resale]);
  const grossProfit = useMemo(() => resale.expectedPrice - allInCost, [resale.expectedPrice, allInCost]);
  const netProfit = useMemo(() => grossProfit - agentComm, [grossProfit, agentComm]);
  const profitPerSqm = useMemo(() => (prop.totalSqm > 0 ? netProfit / prop.totalSqm : 0), [netProfit, prop.totalSqm]);
  const roi = useMemo(() => (allInCost > 0 ? netProfit / allInCost : 0), [netProfit, allInCost]);
  const cashInvested = useMemo(() => acq.deposit + totalRenovation + totalHoldingCost + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs + transferDuty, [acq, totalRenovation, totalHoldingCost, transferDuty]);
  const returnOnCash = useMemo(() => (cashInvested > 0 ? netProfit / cashInvested : 0), [netProfit, cashInvested]);
  const breakEvenResale = useMemo(() => allInCost + agentComm, [allInCost, agentComm]);

  // ─── ANNUALIZED ROI ───
  const annualizedRoi = useMemo(() => {
    if (holding.renovationMonths <= 0 || allInCost <= 0) return 0;
    return (netProfit / allInCost) * (12 / holding.renovationMonths);
  }, [netProfit, allInCost, holding.renovationMonths]);

  // ─── DEAL SCORE ───
  const dealScore = useMemo(() => {
    let score = 0;
    if (roi >= 0.20) score += 3; else if (roi >= 0.12) score += 2; else if (roi >= 0.05) score += 1;
    if (annualizedRoi >= 0.30) score += 2; else if (annualizedRoi >= 0.15) score += 1;
    if (holding.renovationMonths <= 4) score += 1;
    if (netProfit > 0 && (netProfit / resale.expectedPrice) >= 0.05) score += 1; // margin of safety
    // 0-2 = red, 3-4 = yellow, 5-7 = green
    if (score >= 5) return { level: "strong", label: "Strong Flip", color: "#34D399", bg: "#34D39918", desc: "High ROI, good margins, manageable timeline" };
    if (score >= 3) return { level: "marginal", label: "Marginal", color: "#FB923C", bg: "#FB923C18", desc: "Proceed with caution — tight margins or long hold" };
    return { level: "risky", label: "High Risk", color: "#F87171", bg: "#F8717118", desc: "Negative or near-zero returns — consider passing" };
  }, [roi, annualizedRoi, holding.renovationMonths, netProfit, resale.expectedPrice]);

  // ─── MONTHLY HOLDING TIMELINE ───
  const holdingTimeline = useMemo(() => {
    const months = [];
    let cumulative = 0;
    for (let i = 1; i <= holding.renovationMonths; i++) {
      cumulative += monthlyHoldingTotal;
      months.push({
        month: i,
        bondInterest: monthlyBondInterest,
        ratesAndTaxes: holding.ratesAndTaxes,
        utilities: holding.utilities,
        insurance: holding.insurance,
        security: holding.security,
        levies: holding.levies,
        total: monthlyHoldingTotal,
        cumulative,
      });
    }
    return months;
  }, [holding, monthlyBondInterest, monthlyHoldingTotal]);

  // ─── SENSITIVITY WITH SLIDERS ───
  const sensCalc = useMemo(() => {
    const adjReno = totalRenovation * (1 + sensRenoAdj / 100);
    const adjHoldMonths = holding.renovationMonths + sensHoldAdj;
    const adjHold = monthlyHoldingTotal * adjHoldMonths;
    const adjAllIn = totalAcquisition + adjReno + adjHold;
    const adjResale = resale.expectedPrice * (1 + sensResaleAdj / 100);
    const adjComm = adjResale * (resale.agentCommission / 100);
    const adjNet = adjResale - adjAllIn - adjComm;
    const adjRoi = adjAllIn > 0 ? adjNet / adjAllIn : 0;
    const adjAnnRoi = adjHoldMonths > 0 && adjAllIn > 0 ? (adjNet / adjAllIn) * (12 / adjHoldMonths) : 0;
    return { allIn: adjAllIn, resalePrice: adjResale, netProfit: adjNet, roi: adjRoi, annRoi: adjAnnRoi, holdMonths: adjHoldMonths };
  }, [totalRenovation, sensRenoAdj, sensHoldAdj, holding.renovationMonths, monthlyHoldingTotal, totalAcquisition, resale, sensResaleAdj]);

  // Pre-built scenarios for the table
  const sensitivity = useMemo(() => {
    const calc = (resaleAdj, renoAdj, holdAdj) => {
      const adjReno = totalRenovation * (1 + renoAdj);
      const adjHold = monthlyHoldingTotal * (holding.renovationMonths + holdAdj);
      const adjAllIn = totalAcquisition + adjReno + adjHold;
      const adjResale = resale.expectedPrice * (1 + resaleAdj);
      const adjComm = adjResale * (resale.agentCommission / 100);
      const adjNet = adjResale - adjAllIn - adjComm;
      const adjRoi = adjAllIn > 0 ? adjNet / adjAllIn : 0;
      return { allIn: adjAllIn, resalePrice: adjResale, netProfit: adjNet, roi: adjRoi };
    };
    return [
      { label: "Base case", ...calc(0, 0, 0) },
      { label: "Resale -5%", ...calc(-0.05, 0, 0) },
      { label: "Resale -10%", ...calc(-0.1, 0, 0) },
      { label: "Reno +10%", ...calc(0, 0.1, 0) },
      { label: "Reno +15%", ...calc(0, 0.15, 0) },
      { label: "+2 months holding", ...calc(0, 0, 2) },
      { label: "Worst case", ...calc(-0.1, 0.15, 2) },
    ];
  }, [totalRenovation, totalHoldingCost, totalAcquisition, resale, holding.renovationMonths, monthlyHoldingTotal]);

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

  const resetAll = () => {
    setAcq({ purchasePrice: 1200000, deposit: 0, bondRate: SA_PRIME + 1, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0 });
    setProp({ totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" });
    setRooms(PRESET_ROOMS.map((r, i) => ({ id: i, ...r, customCost: null, notes: "" })));
    setNextRoomId(PRESET_ROOMS.length);
    setCostDb(JSON.parse(JSON.stringify(DEFAULT_COSTS)));
    setContingencyPct(10);
    setPmPct(8);
    setHolding({ renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 });
    setResale({ expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 });
    setQuickRenoEstimate(500000);
    setSensResaleAdj(0);
    setSensRenoAdj(0);
    setSensHoldAdj(0);
    setStep(0);
  };

  const startCalculator = () => {
    setStep(0);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ─── THEME ───
  const theme = {
    bg: "#0C0F14", card: "#151921", cardBorder: "#1E2430",
    accent: "#D4A853", accentDim: "#D4A85330",
    green: "#34D399", red: "#F87171", orange: "#FB923C",
    text: "#E8E6E1", textDim: "#8B8D93",
    input: "#1A1F2A", inputBorder: "#2A3040",
  };

  // ─── UI COMPONENTS ───
  const Tooltip = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
      <span style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "help" }}>
        <span
          onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: theme.inputBorder, color: theme.textDim, fontSize: 10, fontWeight: 700, lineHeight: 1 }}
        >?</span>
        {show && (
          <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1E2430", border: `1px solid ${theme.accent}40`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: theme.text, lineHeight: 1.5, width: 240, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
            {text}
            <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "#1E2430", borderRight: `1px solid ${theme.accent}40`, borderBottom: `1px solid ${theme.accent}40` }} />
          </div>
        )}
      </span>
    );
  };

  const NumInput = ({ label, value, onChange, prefix = "R", suffix = "", width = "100%", small = false, tooltip }) => (
    <div style={{ marginBottom: small ? 6 : 14, width }}>
      {label && (
        <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
          {label}{tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "8px 10px" }}>
        {prefix && <span style={{ color: theme.textDim, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
          style={{ background: "transparent", border: "none", color: theme.text, fontSize: isMobile ? 16 : (small ? 13 : 14), width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
        {suffix && <span style={{ color: theme.textDim, fontSize: 12, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  );

  const Toggle = ({ label, value, onChange, tooltip }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? theme.accent : theme.inputBorder, cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "all 0.2s" }} />
      </div>
      <span style={{ fontSize: 13, color: theme.text }}>{label}</span>
      {tooltip && <Tooltip text={tooltip} />}
    </div>
  );

  const Select = ({ label, value, onChange, options, tooltip }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "8px 10px", color: theme.text, fontSize: isMobile ? 16 : 14, width: "100%", outline: "none" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const Card = ({ children, title, subtitle, style: s = {} }) => (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20, ...s }}>
      {title && <h3 style={{ margin: subtitle ? "0 0 4px" : "0 0 18px", fontSize: 15, color: theme.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>}
      {subtitle && <p style={{ margin: "0 0 18px", fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );

  const MetricBox = ({ label, value, sub, color = theme.text }) => (
    <div style={{ background: theme.input, borderRadius: 10, padding: isMobile ? "10px 12px" : "14px 16px", minWidth: isMobile ? 120 : 140, flex: 1 }}>
      <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const BarChart = ({ data, maxVal }) => {
    const max = maxVal || Math.max(...data.map((d) => Math.abs(d.value)));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{ width: isMobile ? "100%" : 180, fontSize: 12, color: theme.textDim, textAlign: isMobile ? "left" : "right", flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, height: 22, background: theme.input, borderRadius: 4, overflow: "hidden", position: "relative", minWidth: 80 }}>
              <div style={{ height: "100%", width: `${Math.abs(d.value / max) * 100}%`, background: d.value >= 0 ? theme.green : theme.red, borderRadius: 4, opacity: 0.7, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ width: 110, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: d.value >= 0 ? theme.green : theme.red, textAlign: "right" }}>{fmt(d.value)}</div>
          </div>
        ))}
      </div>
    );
  };

  const SectionDivider = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px" }}>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
      <span style={{ fontSize: 11, color: theme.accent, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
    </div>
  );

  const CTAButton = ({ label, onClick, primary = true, style: s = {} }) => (
    <button onClick={onClick} style={{
      background: primary ? theme.accent : "transparent", color: primary ? "#000" : theme.text,
      border: primary ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 10,
      padding: isMobile ? "14px 28px" : "12px 32px", fontSize: isMobile ? 15 : 14,
      fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s", ...s,
    }}>{label}</button>
  );

  const SliderInput = ({ label, value, onChange, min, max, step: stepVal = 1, suffix = "%", tooltip }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
          {label}{tooltip && <Tooltip text={tooltip} />}
        </label>
        <span style={{ fontSize: 14, fontWeight: 700, color: value === 0 ? theme.textDim : value > 0 ? (suffix === "%" && label.toLowerCase().includes("resale") ? theme.green : theme.orange) : theme.green, fontFamily: "'JetBrains Mono', monospace" }}>
          {value > 0 ? "+" : ""}{value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={stepVal} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  );

  // ─── DEAL SCORE BADGE ───
  const DealScoreBadge = ({ large = false }) => (
    <div style={{
      background: dealScore.bg, border: `1px solid ${dealScore.color}40`,
      borderRadius: 12, padding: large ? (isMobile ? 20 : 28) : 16, textAlign: "center",
    }}>
      <div style={{
        width: large ? 64 : 48, height: large ? 64 : 48, borderRadius: "50%",
        background: dealScore.color, display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontSize: large ? 28 : 20,
      }}>
        {dealScore.level === "strong" ? "+" : dealScore.level === "marginal" ? "~" : "-"}
      </div>
      <div style={{ fontSize: large ? 22 : 16, fontWeight: 700, color: dealScore.color, marginBottom: 4 }}>
        {dealScore.label}
      </div>
      <div style={{ fontSize: 12, color: theme.textDim }}>{dealScore.desc}</div>
    </div>
  );

  // ─── CASH ANALYSIS CARD ───
  const CashAnalysis = () => (
    <Card title="Cash Required vs Profit" subtitle="How much cash goes in, maximum exposure, and what comes back.">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricBox label="Total Cash In" value={fmt(cashInvested)} sub="Your total cash outlay" />
        <MetricBox label="Max Exposure" value={fmt(allInCost)} sub="Total capital at risk" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} sub="After agent commission" />
        <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} sub="Profit / cash invested" />
      </div>
      {/* Visual: cash flow bar */}
      <div style={{ marginTop: 16, padding: "12px 0" }}>
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", background: theme.input }}>
          {allInCost > 0 && (
            <>
              <div style={{ width: `${(totalAcquisition / allInCost) * 100}%`, background: theme.accent, opacity: 0.6 }} title="Acquisition" />
              <div style={{ width: `${(totalRenovation / allInCost) * 100}%`, background: theme.orange, opacity: 0.6 }} title="Renovation" />
              <div style={{ width: `${(totalHoldingCost / allInCost) * 100}%`, background: theme.red, opacity: 0.5 }} title="Holding" />
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: theme.textDim, flexWrap: "wrap" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.accent, opacity: 0.6, marginRight: 4, verticalAlign: "middle" }} />Acquisition</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.orange, opacity: 0.6, marginRight: 4, verticalAlign: "middle" }} />Renovation</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.red, opacity: 0.5, marginRight: 4, verticalAlign: "middle" }} />Holding</span>
        </div>
      </div>
    </Card>
  );

  // ─── MODE TOGGLE ───
  const ModeToggle = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: theme.input, borderRadius: 8, padding: 3 }}>
      {["quick", "advanced"].map((m) => (
        <button key={m} onClick={() => setMode(m)} style={{
          background: mode === m ? theme.accent : "transparent", color: mode === m ? "#000" : theme.textDim,
          border: "none", borderRadius: 6, padding: isMobile ? "8px 14px" : "6px 16px",
          fontSize: 12, fontWeight: mode === m ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
          textTransform: "capitalize",
        }}>{m === "quick" ? "Quick Mode" : "Advanced"}</button>
      ))}
    </div>
  );

  // ─── QUICK MODE RENDER ───
  const renderQuickMode = () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Card title="Quick Estimate" subtitle="Enter 5 key numbers. Everything else uses smart SA defaults. Switch to Advanced for full control.">
        <NumInput label="Your Purchase Price (R)" value={acq.purchasePrice} onChange={(v) => updateAcq("purchasePrice", v)} tooltip={TOOLTIPS.purchasePrice} />

        <NumInput label="Your Renovation Estimate (R)" value={quickRenoEstimate} onChange={setQuickRenoEstimate} tooltip={TOOLTIPS.renoEstimate} />

        <NumInput label="Expected Sale Price (R)" value={resale.expectedPrice} onChange={(v) => updateResale("expectedPrice", v)} tooltip={TOOLTIPS.expectedPrice} />

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
              Holding Period{<Tooltip text={TOOLTIPS.renovationMonths} />}
            </label>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {holding.renovationMonths} months
            </span>
          </div>
          <input type="range" min={1} max={18} step={1} value={holding.renovationMonths}
            onChange={(e) => updateHolding("renovationMonths", Number(e.target.value))}
            style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            <span>1 mo</span><span>18 mo</span>
          </div>
        </div>

        <Toggle label="Cash purchase (no bond)" value={acq.cashPurchase} onChange={(v) => updateAcq("cashPurchase", v)} tooltip={TOOLTIPS.cashPurchase} />
      </Card>

      {/* Live results */}
      <SectionDivider label="Your Results" />

      <DealScoreBadge large />

      <div style={{ marginTop: 20 }} />

      <Card style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="All-In Cost" value={fmt(allInCost)} />
          <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} />
          <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${holding.renovationMonths} months`} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricBox label="Cash Required" value={fmt(cashInvested)} sub="Total cash outlay" />
          <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} />
        </div>
      </Card>

      {/* Quick sensitivity sliders */}
      <SectionDivider label="What If?" />

      <Card title="Sensitivity Sliders" subtitle="Drag to see how changes affect your profit and ROI in real time.">
        <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={setSensResaleAdj} min={-15} max={15} />
        <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={setSensRenoAdj} min={0} max={30} />
        <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={setSensHoldAdj} min={0} max={14} suffix=" mo" />

        <div style={{ background: theme.input, borderRadius: 10, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            {sensResaleAdj === 0 && sensRenoAdj === 0 && sensHoldAdj === 0 ? "Base Scenario" : "Adjusted Scenario"}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <MetricBox label="Adj. Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} />
            <MetricBox label="Adj. ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} />
            <MetricBox label="Adj. Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} />
          </div>
        </div>
      </Card>

      <Card subtitle="Auto-applied smart defaults: Transfer duty auto-calculated, Bond rate at prime+1%, Agent commission 5%, Attorney fees R 45,000, Monthly holding ~R 6,450/mo. Switch to Advanced Mode for full control over every line item." style={{ background: theme.input, borderColor: theme.inputBorder }}>
        <div style={{ textAlign: "center" }}>
          <CTAButton label="Switch to Advanced Mode" onClick={() => { setMode("advanced"); setStep(0); }} primary={false} />
        </div>
      </Card>
    </div>
  );

  // ─── LANDING PAGE ───
  const renderLanding = () => (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: isMobile ? "48px 20px 40px" : "80px 40px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: theme.accentDim, borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000" }}>F</div>
          <span style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>FlipModel</span>
        </div>
        <h1 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 700, color: theme.text, lineHeight: 1.2, margin: "0 0 20px" }}>
          Estimate Property Flip Profitability{" "}
          <span style={{ color: theme.accent }}>in Minutes</span>
        </h1>
        <p style={{ fontSize: isMobile ? 15 : 17, color: theme.textDim, lineHeight: 1.7, margin: "0 auto 36px", maxWidth: 560 }}>
          Input purchase price, renovation and holding costs to see your projected profit and ROI — built for South African property investors.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <CTAButton label="Quick Estimate (5 fields)" onClick={() => { setMode("quick"); setStep(0); }} />
          <CTAButton label="Advanced Calculator" onClick={() => { setMode("advanced"); setStep(0); }} primary={false} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 20 : 40, padding: "24px 20px", borderTop: `1px solid ${theme.cardBorder}`, borderBottom: `1px solid ${theme.cardBorder}`, flexWrap: "wrap" }}>
        {[
          { num: "500+", label: "Scenarios calculated" },
          { num: "100%", label: "Free to use" },
          { num: "SA-Built", label: "For local investors" },
        ].map((t, i) => (
          <div key={i} style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{t.num}</div>
            <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "40px 20px" : "60px 40px" }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: theme.text, textAlign: "center", marginBottom: 36 }}>
          Everything you need to evaluate a property flip
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {[
            { icon: "R", title: "Acquisition Costs", desc: "Purchase price, transfer duty, attorney fees and bond registration — all calculated automatically." },
            { icon: "~", title: "Renovation Modelling", desc: "Room-by-room cost estimates with scope multipliers, or a single lump-sum in Quick Mode." },
            { icon: "%", title: "Holding Costs", desc: "Monthly rates, utilities, insurance, security, and bond interest over your renovation period." },
            { icon: "$", title: "Profit & Sensitivity", desc: "Net profit, ROI, annualized returns, deal score, and interactive sensitivity sliders." },
          ].map((f, i) => (
            <div key={i} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20 }}>
              <div style={{ width: 36, height: 36, background: theme.accentDim, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: theme.accent, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: isMobile ? "0 20px 40px" : "0 40px 60px", textAlign: "center" }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: isMobile ? 20 : 28 }}>
          <p style={{ fontSize: 14, color: theme.text, lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>
            "I used to spend hours in spreadsheets trying to model my property flips. FlipModel gives me a clear picture of profitability in minutes — the sensitivity analysis alone has saved me from two bad deals."
          </p>
          <div style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>— SA Property Investor</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 20px 20px", fontSize: 12, color: theme.textDim }}>
        Trusted by South African property investors
      </div>

      <div style={{ textAlign: "center", padding: isMobile ? "24px 20px 48px" : "32px 40px 60px", borderTop: `1px solid ${theme.cardBorder}` }}>
        <p style={{ fontSize: 15, color: theme.textDim, marginBottom: 20 }}>Ready to evaluate your next flip?</p>
        <CTAButton label="Calculate Profit Now" onClick={startCalculator} />
      </div>
    </div>
  );

  // ─── ADVANCED STEP CONTENT ───
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <Card title="Your Purchase Details" subtitle="Enter the agreed purchase price and deposit amount for the property.">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Your Purchase Price (R)" value={acq.purchasePrice} onChange={(v) => updateAcq("purchasePrice", v)} tooltip={TOOLTIPS.purchasePrice} />
                <NumInput label="Your Deposit (R)" value={acq.deposit} onChange={(v) => updateAcq("deposit", v)} tooltip={TOOLTIPS.deposit} />
              </div>
              <Toggle label="Cash purchase (no bond)" value={acq.cashPurchase} onChange={(v) => updateAcq("cashPurchase", v)} tooltip={TOOLTIPS.cashPurchase} />
              {!acq.cashPurchase && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                  <NumInput label="Bond Interest (if any) %" value={acq.bondRate} onChange={(v) => updateAcq("bondRate", v)} prefix="" suffix="%" tooltip={TOOLTIPS.bondRate} />
                  <NumInput label="Bond Term" value={acq.bondTerm} onChange={(v) => updateAcq("bondTerm", v)} prefix="" suffix="months" tooltip={TOOLTIPS.bondTerm} />
                </div>
              )}
            </Card>
            <SectionDivider label="Transfer & Registration" />
            <Card title="Transfer & Registration Costs" subtitle="These are the legal and government fees associated with transferring the property into your name.">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 14px", background: theme.accentDim, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: theme.accent }}>Auto-calculated transfer duty:</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(transferDuty)}</span>
                <Tooltip text={TOOLTIPS.transferDuty} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Transfer Attorney Fees (R)" value={acq.transferAttorneyFees} onChange={(v) => updateAcq("transferAttorneyFees", v)} tooltip={TOOLTIPS.transferAttorneyFees} />
                <NumInput label="Bond Registration (R)" value={acq.bondRegistration} onChange={(v) => updateAcq("bondRegistration", v)} tooltip={TOOLTIPS.bondRegistration} />
              </div>
              <NumInput label="Expected Renovation Costs (R)" value={acq.initialRepairs} onChange={(v) => updateAcq("initialRepairs", v)} tooltip={TOOLTIPS.initialRepairs} />
              <p style={{ fontSize: 11, color: theme.textDim, marginTop: -8 }}>Any urgent repairs identified before the main renovation (e.g. roof leaks). Leave at R 0 if none.</p>
            </Card>
            <SectionDivider label="Summary" />
            <Card title="Acquisition Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Purchase Price" value={fmt(acq.purchasePrice)} />
                <MetricBox label="Transfer Duty" value={fmt(transferDuty)} />
                <MetricBox label="Total Acquisition" value={fmt(totalAcquisition)} color={theme.accent} />
              </div>
            </Card>
          </div>
        );

      case 1:
        return (
          <Card title="Your Property Details" subtitle="Describe the property so we can calculate accurate renovation cost estimates per square metre.">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
              <NumInput label="Total Property Size" value={prop.totalSqm} onChange={(v) => updateProp("totalSqm", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.totalSqm} />
              <NumInput label="Erf / Stand Size" value={prop.erfSize} onChange={(v) => updateProp("erfSize", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.erfSize} />
              <NumInput label="Bedrooms" value={prop.bedrooms} onChange={(v) => updateProp("bedrooms", v)} prefix="" />
              <NumInput label="Bathrooms" value={prop.bathrooms} onChange={(v) => updateProp("bathrooms", v)} prefix="" />
              <NumInput label="Garages" value={prop.garages} onChange={(v) => updateProp("garages", v)} prefix="" />
              <Select label="Stories" value={prop.stories} onChange={(v) => updateProp("stories", v)} options={[
                { value: "single", label: "Single storey" }, { value: "double", label: "Double storey" },
              ]} />
            </div>
          </Card>
        );

      case 2:
        return (
          <div>
            <Card subtitle="Define each room in the property and its renovation scope. Costs are calculated automatically based on scope and size.">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: theme.textDim }}>
                  {rooms.length} rooms &middot; {rooms.reduce((s, r) => s + r.sqm, 0)} sqm total
                </span>
                <button onClick={addRoom} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: isMobile ? "10px 18px" : "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Room</button>
              </div>
            </Card>
            {rooms.map((room) => (
              <Card key={room.id} style={{ padding: isMobile ? 12 : 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1.5fr 1fr 30px", gap: isMobile ? 8 : 10, alignItems: "end" }}>
                  <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
                    <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Room Name</label>
                    <input value={room.name} onChange={(e) => updateRoom(room.id, "name", e.target.value)} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "6px 10px", color: theme.text, fontSize: isMobile ? 16 : 13, width: "100%", outline: "none" }} />
                  </div>
                  <NumInput label="Size (sqm)" value={room.sqm} onChange={(v) => updateRoom(room.id, "sqm", v)} prefix="" suffix="sqm" small />
                  <Select label="Scope" value={room.scope} onChange={(v) => updateRoom(room.id, "scope", v)} options={[
                    { value: "cosmetic", label: "Cosmetic (25%)" }, { value: "midLevel", label: "Mid-level (55%)" }, { value: "fullGut", label: "Full gut (100%)" },
                  ]} />
                  <NumInput label="Override (R)" value={room.customCost || ""} onChange={(v) => updateRoom(room.id, "customCost", v || null)} small />
                  <button onClick={() => removeRoom(room.id)} style={{ background: "none", border: "none", color: theme.red, fontSize: 20, cursor: "pointer", padding: isMobile ? 8 : 0, marginBottom: 12 }}>x</button>
                </div>
              </Card>
            ))}
          </div>
        );

      case 3:
        return (
          <div>
            {Object.entries(costDb).map(([catKey, items]) => (
              <Card key={catKey} title={catKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} subtitle="Adjust unit costs below. Per-sqm items are multiplied by room sizes and scope.">
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "4px 20px" }}>
                  {Object.entries(items).map(([itemKey, item]) => (
                    <div key={itemKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: theme.textDim }}>{item.label}</span>
                      <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "4px 8px", width: 120 }}>
                        <span style={{ fontSize: 10, color: theme.textDim, marginRight: 3 }}>R</span>
                        <input type="number" value={item.cost} onChange={(e) => updateCostItem(catKey, itemKey, e.target.value)} style={{ background: "transparent", border: "none", color: theme.text, fontSize: 12, width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
                      </div>
                      <span style={{ fontSize: 9, color: theme.textDim, width: 40 }}>{item.perSqm ? "/sqm" : "fixed"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <SectionDivider label="Project Overheads" />
            <Card title="Project Overheads" subtitle="Percentage-based fees applied on top of renovation costs.">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Project Management Fee" value={pmPct} onChange={setPmPct} prefix="" suffix="%" tooltip={TOOLTIPS.pmPct} />
                <NumInput label="Contingency Buffer" value={contingencyPct} onChange={setContingencyPct} prefix="" suffix="%" tooltip={TOOLTIPS.contingency} />
              </div>
            </Card>
            <SectionDivider label="Cost Summary" />
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

      case 4:
        return (
          <div>
            <Card title="Your Holding Period" subtitle="How long do you expect to hold this property during renovation?">
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center" }}>
                    Renovation Duration<Tooltip text={TOOLTIPS.renovationMonths} />
                  </label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{holding.renovationMonths} months</span>
                </div>
                <input type="range" min={1} max={18} step={1} value={holding.renovationMonths} onChange={(e) => updateHolding("renovationMonths", Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
                  <span>1 mo</span><span>18 mo</span>
                </div>
              </div>
            </Card>
            <SectionDivider label="Monthly Costs" />
            <Card title="Your Monthly Holding Costs" subtitle="Enter the monthly costs you'll carry while the property is being renovated.">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Rates & Taxes" value={holding.ratesAndTaxes} onChange={(v) => updateHolding("ratesAndTaxes", v)} suffix="/mo" tooltip={TOOLTIPS.ratesAndTaxes} />
                <NumInput label="Utilities (water & electricity)" value={holding.utilities} onChange={(v) => updateHolding("utilities", v)} suffix="/mo" tooltip={TOOLTIPS.utilities} />
                <NumInput label="Insurance" value={holding.insurance} onChange={(v) => updateHolding("insurance", v)} suffix="/mo" tooltip={TOOLTIPS.insurance} />
                <NumInput label="Security" value={holding.security} onChange={(v) => updateHolding("security", v)} suffix="/mo" tooltip={TOOLTIPS.security} />
                <NumInput label="Levies (if any)" value={holding.levies} onChange={(v) => updateHolding("levies", v)} suffix="/mo" tooltip={TOOLTIPS.levies} />
              </div>
              <p style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>Leave levies at R 0 if not in a complex or estate.</p>
            </Card>
            {!acq.cashPurchase && (
              <>
                <SectionDivider label="Bond Interest" />
                <Card title="Bond Interest">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: theme.accentDim, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: theme.accent }}>Monthly bond interest (interest-only during reno):</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(monthlyBondInterest)}</span>
                  </div>
                </Card>
              </>
            )}
            <SectionDivider label="Monthly Timeline" />
            <Card title="Month-by-Month Holding Costs" subtitle="See how holding costs accumulate over time. This is why speed matters in flips.">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      {["Month", "Monthly", "Cumulative"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdingTimeline.map((m) => (
                      <tr key={m.month} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                        <td style={{ padding: "6px 10px", color: theme.text, fontWeight: 600 }}>Month {m.month}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(m.total)}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.red, fontWeight: 700 }}>{fmt(m.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Cumulative bar visualization */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 2, height: 32, alignItems: "flex-end" }}>
                  {holdingTimeline.map((m) => (
                    <div key={m.month} style={{
                      flex: 1, background: theme.red, opacity: 0.3 + (m.month / holding.renovationMonths) * 0.5,
                      height: `${(m.cumulative / totalHoldingCost) * 100}%`, borderRadius: 2, minHeight: 4,
                      transition: "height 0.3s ease",
                    }} title={`Month ${m.month}: ${fmt(m.cumulative)}`} />
                  ))}
                </div>
                <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4, textAlign: "center" }}>
                  Cumulative cost grows to {fmt(totalHoldingCost)} over {holding.renovationMonths} months
                </div>
              </div>
            </Card>
            <SectionDivider label="Summary" />
            <Card title="Holding Cost Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
              <MetricBox label={`Total Holding (${holding.renovationMonths} months)`} value={fmt(totalHoldingCost)} color={theme.accent} />
            </Card>
          </div>
        );

      case 5:
        return (
          <div>
            <Card title="Your Resale Projections" subtitle="Estimate your expected selling price and agent costs to calculate projected profit.">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <NumInput label="Your Expected Resale Price (R)" value={resale.expectedPrice} onChange={(v) => updateResale("expectedPrice", v)} tooltip={TOOLTIPS.expectedPrice} />
                <NumInput label="Area Benchmark (R/sqm)" value={resale.areaBenchmarkPsqm} onChange={(v) => updateResale("areaBenchmarkPsqm", v)} suffix="/sqm" tooltip={TOOLTIPS.areaBenchmarkPsqm} />
                <NumInput label="Agent Commission" value={resale.agentCommission} onChange={(v) => updateResale("agentCommission", v)} prefix="" suffix="%" tooltip={TOOLTIPS.agentCommission} />
              </div>
              <div style={{ fontSize: 12, color: theme.textDim, marginTop: 8 }}>
                Benchmark resale value: {fmt(resale.areaBenchmarkPsqm * prop.totalSqm)} ({prop.totalSqm} sqm x {fmt(resale.areaBenchmarkPsqm)}/sqm)
              </div>
            </Card>

            <SectionDivider label="Deal Score" />
            <DealScoreBadge large />
            <div style={{ marginTop: 20 }} />

            <SectionDivider label="Profit Analysis" />
            <Card title="Your Profit Analysis" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} />
                <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${holding.renovationMonths} months`} />
                <MetricBox label="Break-Even Resale" value={fmt(breakEvenResale)} />
              </div>
            </Card>

            <SectionDivider label="Cash Analysis" />
            <CashAnalysis />

            <Card title="Formulas">
              <div style={{ fontSize: 11, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", lineHeight: 2, overflowX: "auto" }}>
                <div>All-In = Acquisition({fmt(totalAcquisition)}) + Renovation({fmt(totalRenovation)}) + Holding({fmt(totalHoldingCost)})</div>
                <div>Gross Profit = Resale - All-In = {fmt(resale.expectedPrice)} - {fmt(allInCost)} = {fmt(grossProfit)}</div>
                <div>Net Profit = Gross - Agent = {fmt(grossProfit)} - {fmt(agentComm)} = {fmt(netProfit)}</div>
                <div>ROI = Net / All-In = {pct(roi)}</div>
                <div>Annualized ROI = ROI x (12 / {holding.renovationMonths}mo) = {pct(annualizedRoi)}</div>
                <div>Return on Cash = Net / Cash Invested = {fmt(netProfit)} / {fmt(cashInvested)} = {pct(returnOnCash)}</div>
              </div>
            </Card>
          </div>
        );

      case 6:
        return (
          <div>
            <Card title="Interactive Sensitivity" subtitle="Drag the sliders to model different scenarios in real time.">
              <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={setSensResaleAdj} min={-15} max={15} />
              <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={setSensRenoAdj} min={0} max={30} />
              <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={setSensHoldAdj} min={0} max={14} suffix=" mo" />

              <div style={{ background: theme.input, borderRadius: 10, padding: 16, marginTop: 8 }}>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Slider Scenario Result</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <MetricBox label="Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} />
                  <MetricBox label="ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} />
                  <MetricBox label="Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} />
                </div>
              </div>
            </Card>

            <SectionDivider label="Preset Scenarios" />

            <Card title="Scenario Comparison">
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
                      {["Scenario", "All-In", "Resale", "Net Profit", "ROI"].map((h) => (
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
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>{fmt(s.netProfit)}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.roi >= 0.15 ? theme.green : s.roi >= 0 ? theme.orange : theme.red }}>{pct(s.roi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case 7:
        return (
          <div>
            <DealScoreBadge large />
            <div style={{ marginTop: 20 }} />

            <Card title="Project Cost Stack" style={{ background: `${theme.accent}08` }}>
              <BarChart data={[
                { label: "Purchase Price", value: acq.purchasePrice },
                { label: "Transfer & Fees", value: transferDuty + acq.transferAttorneyFees + acq.bondRegistration },
                { label: "Renovation", value: totalRenovation },
                { label: "Holding Costs", value: totalHoldingCost },
                { label: "Agent Commission", value: agentComm },
              ]} />
            </Card>

            <SectionDivider label="Key Metrics" />
            <Card title="Key Metrics">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <MetricBox label="All-In Cost" value={fmt(allInCost)} />
                <MetricBox label="Resale Price" value={fmt(resale.expectedPrice)} />
                <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} />
                <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} />
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`${holding.renovationMonths} month hold`} />
                <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : theme.orange} />
                <MetricBox label="Reno Cost/sqm" value={fmt(renoCostPerSqm)} />
                <MetricBox label="Break-Even" value={fmt(breakEvenResale)} />
              </div>
            </Card>

            <SectionDivider label="Cash Analysis" />
            <CashAnalysis />

            <SectionDivider label="Room Breakdown" />
            <Card title="Room Cost Breakdown">
              {roomCosts.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
                  <span style={{ color: theme.text }}>{r.name} <span style={{ color: theme.textDim, fontSize: 11 }}>({r.sqm}sqm, {r.scope})</span></span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(r.totalCost)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: theme.text }}>Room-level total</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(totalRoomRenoCost)}</span>
              </div>
            </Card>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
              <CTAButton label="Start New Calculation" onClick={resetAll} primary={false} />
              <CTAButton label="Back to Step 1" onClick={() => setStep(0)} primary={false} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── LANDING ───
  if (step === -1) {
    return (
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
        {renderLanding()}
      </div>
    );
  }

  // ─── QUICK MODE ───
  if (mode === "quick") {
    return (
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setStep(-1)}>
            <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#000" }}>F</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>FlipModel</div>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>Quick Estimate</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ModeToggle />
            <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ padding: isMobile ? "16px 12px" : "24px 24px" }}>
          {renderQuickMode()}
        </div>
        {/* Sticky profit summary on mobile */}
        {isMobile && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            background: theme.card, borderTop: `1px solid ${theme.cardBorder}`,
            padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Net Profit</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: netProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(netProfit)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{pct(roi)}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: dealScore.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {dealScore.level === "strong" ? "+" : dealScore.level === "marginal" ? "~" : "-"}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── ADVANCED MODE ───
  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <style>{sliderTrackStyle}</style>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      {/* Header */}
      <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setStep(-1)}>
          <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#000" }}>F</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>FlipModel</div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>Advanced Calculator</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ModeToggle />
          <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 6 }} />
        </div>
      </div>
      {/* Step nav */}
      <div style={{ padding: isMobile ? "10px 12px" : "12px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? theme.accent : "transparent", color: step === i ? "#000" : theme.textDim,
            border: `1px solid ${step === i ? theme.accent : theme.cardBorder}`, borderRadius: 8,
            padding: isMobile ? "8px 10px" : "6px 12px", fontSize: 11, fontWeight: step === i ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
          }}>{isMobile ? `${i + 1}` : `${i + 1}. ${s}`}</button>
        ))}
      </div>
      {/* Content */}
      <div ref={contentRef} style={{ maxWidth: 840, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" }}>
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 300, marginBottom: 24, color: theme.text }}>
          <span style={{ color: theme.accent, fontWeight: 700 }}>{step + 1}</span>
          <span style={{ color: theme.textDim, margin: "0 8px" }}>/</span>
          {STEPS[step]}
        </h2>
        {renderStep()}
        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingBottom: isMobile ? 80 : 48, gap: 12 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{
            background: "transparent", border: `1px solid ${theme.cardBorder}`,
            color: step === 0 ? theme.textDim : theme.text, borderRadius: 10,
            padding: isMobile ? "12px 20px" : "10px 24px", fontSize: 13,
            cursor: step === 0 ? "default" : "pointer",
          }}>Previous</button>
          {step === STEPS.length - 1 ? (
            <CTAButton label="New Calculation" onClick={resetAll} style={{ borderRadius: 10 }} />
          ) : (
            <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} style={{
              background: theme.accent, border: "none", color: "#000", borderRadius: 10,
              padding: isMobile ? "12px 20px" : "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>{step === 4 ? "See Your Profit" : "Next Step"}</button>
          )}
        </div>
      </div>
      {/* Sticky profit summary on mobile */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: theme.card, borderTop: `1px solid ${theme.cardBorder}`,
          padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Net Profit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: netProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(netProfit)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{pct(roi)}</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: dealScore.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            {dealScore.level === "strong" ? "+" : dealScore.level === "marginal" ? "~" : "-"}
          </div>
        </div>
      )}
    </div>
  );
}
