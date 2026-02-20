"use client";
import { useState, useMemo, useEffect, useRef } from "react";

// ─── Data ───
import { SA_PRIME, SCOPE_MULT, STEPS, TOOLTIPS } from "./data/constants";
import { DEFAULT_COSTS } from "./data/costDefaults";
import { PRESET_ROOMS, detectRoomType, generateRoomItems } from "./data/roomTemplates";

// ─── Shared UI ───
import {
  theme, fmt, pct, calcTransferDuty,
  NumInput, Toggle, Card, MetricBox, SectionDivider, CTAButton, SliderInput, Tooltip,
} from "./components/theme";

// ─── Step Components ───
import AcquisitionStep from "./components/AcquisitionStep";
import PropertyStep from "./components/PropertyStep";
import RoomsStep from "./components/RoomsStep";
import ContractorPanel from "./components/ContractorPanel";
import CostDatabase from "./components/CostDatabase";
import HoldingStep from "./components/HoldingStep";
import ResaleStep from "./components/ResaleStep";
import SensitivityStep from "./components/SensitivityStep";
import SummaryStep from "./components/SummaryStep";
import ProfileManager from "./components/ProfileManager";
import ScenarioLab from "./components/ScenarioLab";
import { loadProfiles, saveProfile as persistProfile, deleteProfile as removeProfile } from "./utils/profiles";

export default function FlipModelApp() {
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState("quick");
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef(null);

  // ─── PROFILES ───
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [currentProfileName, setCurrentProfileName] = useState("");
  const [scenarioTab, setScenarioTab] = useState("builder");
  const [customScenarios, setCustomScenarios] = useState([]);

  // Load profiles from localStorage on mount
  useEffect(() => {
    setProfiles(loadProfiles());
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── ACQUISITION ───
  const [acq, setAcq] = useState({
    purchasePrice: 1200000, deposit: 0, bondRate: SA_PRIME + 1, bondTerm: 240,
    cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0,
  });

  // ─── PROPERTY ───
  const [prop, setProp] = useState({
    totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single",
  });

  // ─── ROOMS (enhanced with roomType + breakdown support) ───
  const [rooms, setRooms] = useState(
    PRESET_ROOMS.map((r, i) => ({
      id: i, ...r, customCost: null, notes: "",
      breakdownMode: "simple", detailedItems: null,
    }))
  );
  const [nextRoomId, setNextRoomId] = useState(PRESET_ROOMS.length);

  // ─── CONTRACTORS (new) ───
  const [contractors, setContractors] = useState([]);

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

  // ─── QUICK MODE ───
  const [quickRenoEstimate, setQuickRenoEstimate] = useState(500000);

  // ─── SENSITIVITY SLIDERS ───
  const [sensResaleAdj, setSensResaleAdj] = useState(0);
  const [sensRenoAdj, setSensRenoAdj] = useState(0);
  const [sensHoldAdj, setSensHoldAdj] = useState(0);

  // ─── CALCULATIONS ───
  const transferDuty = useMemo(() => calcTransferDuty(acq.purchasePrice), [acq.purchasePrice]);

  const totalAcquisition = useMemo(() => {
    return acq.purchasePrice + transferDuty + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs;
  }, [acq, transferDuty]);

  // Room costs: supports both simple (scope multiplier) and detailed (per-item) modes
  const roomCosts = useMemo(() => {
    return rooms.map((room) => {
      if (room.customCost !== null && room.customCost !== "") {
        return { ...room, totalCost: Number(room.customCost) };
      }
      // Detailed breakdown mode
      if (room.breakdownMode === "detailed" && room.detailedItems) {
        const total = room.detailedItems
          .filter((i) => i.included)
          .reduce((s, i) => s + i.qty * i.unitCost, 0);
        return { ...room, totalCost: Math.round(total) };
      }
      // Simple scope multiplier mode (updated for unit types)
      const mult = SCOPE_MULT[room.scope] || 1;
      let total = 0;
      const perimeter = 4 * Math.sqrt(room.sqm);
      for (const cat of Object.values(costDb)) {
        for (const item of Object.values(cat)) {
          switch (item.unit) {
            case "sqm": total += item.cost * room.sqm * mult; break;
            case "lm": total += item.cost * perimeter * mult; break;
            case "point": total += item.cost * Math.ceil(room.sqm / 4) * mult; break;
            case "room": total += item.cost * mult; break;
            // fixed and unit costs are project-level, not per-room
            default: break;
          }
        }
      }
      return { ...room, totalCost: Math.round(total) };
    });
  }, [rooms, costDb]);

  const totalRoomMaterialCost = useMemo(() => roomCosts.reduce((s, r) => s + r.totalCost, 0), [roomCosts]);

  // Contractor labour total
  const contractorLabour = useMemo(() => contractors.reduce((s, c) => s + c.dailyRate * c.daysWorked, 0), [contractors]);

  const fixedCosts = useMemo(() => {
    let total = 0;
    for (const cat of Object.values(costDb)) {
      for (const item of Object.values(cat)) {
        if (item.unit === "fixed") total += item.cost;
      }
    }
    return total;
  }, [costDb]);

  const baseCosts = useMemo(() => totalRoomMaterialCost + contractorLabour + fixedCosts, [totalRoomMaterialCost, contractorLabour, fixedCosts]);
  const pmCost = useMemo(() => baseCosts * (pmPct / 100), [baseCosts, pmPct]);
  const contingency = useMemo(() => (baseCosts + pmCost) * (contingencyPct / 100), [baseCosts, pmCost, contingencyPct]);
  const advancedTotalRenovation = useMemo(() => baseCosts + pmCost + contingency, [baseCosts, pmCost, contingency]);

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
    if (netProfit > 0 && (netProfit / resale.expectedPrice) >= 0.05) score += 1;
    if (score >= 5) return { level: "strong", label: "Strong Flip", color: "#34D399", bg: "#34D39918", desc: "High ROI, good margins, manageable timeline" };
    if (score >= 3) return { level: "marginal", label: "Marginal", color: "#FB923C", bg: "#FB923C18", desc: "Proceed with caution — tight margins or long hold" };
    return { level: "risky", label: "High Risk", color: "#F87171", bg: "#F8717118", desc: "Negative or near-zero returns — consider passing" };
  }, [roi, annualizedRoi, holding.renovationMonths, netProfit, resale.expectedPrice]);

  // ─── HOLDING TIMELINE ───
  const holdingTimeline = useMemo(() => {
    const months = [];
    let cumulative = 0;
    for (let i = 1; i <= holding.renovationMonths; i++) {
      cumulative += monthlyHoldingTotal;
      months.push({
        month: i, bondInterest: monthlyBondInterest,
        ratesAndTaxes: holding.ratesAndTaxes, utilities: holding.utilities,
        insurance: holding.insurance, security: holding.security, levies: holding.levies,
        total: monthlyHoldingTotal, cumulative,
      });
    }
    return months;
  }, [holding, monthlyBondInterest, monthlyHoldingTotal]);

  // ─── SENSITIVITY ───
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
    setRooms((prev) => [...prev, {
      id: nextRoomId, name: "New Room", sqm: 10, scope: "cosmetic",
      customCost: null, notes: "", roomType: "bedroom",
      breakdownMode: "simple", detailedItems: null,
    }]);
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
    setRooms(PRESET_ROOMS.map((r, i) => ({ id: i, ...r, customCost: null, notes: "", breakdownMode: "simple", detailedItems: null })));
    setNextRoomId(PRESET_ROOMS.length);
    setContractors([]);
    setCostDb(JSON.parse(JSON.stringify(DEFAULT_COSTS)));
    setContingencyPct(10);
    setPmPct(8);
    setHolding({ renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 });
    setResale({ expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 });
    setQuickRenoEstimate(500000);
    setSensResaleAdj(0); setSensRenoAdj(0); setSensHoldAdj(0);
    setActiveProfileId(null);
    setCurrentProfileName("");
    setStep(0);
  };

  // ─── PROFILE HANDLERS ───
  const handleSaveProfile = (name, asNew) => {
    const id = asNew || !activeProfileId ? String(Date.now()) : activeProfileId;
    const profile = {
      id, name: name || "Unnamed Property", savedAt: new Date().toISOString(), mode,
      acq, prop, rooms, nextRoomId, contractors, costDb,
      contingencyPct, pmPct, holding, resale, quickRenoEstimate,
    };
    const updated = persistProfile(profile);
    setProfiles(updated);
    setActiveProfileId(id);
    setCurrentProfileName(profile.name);
  };

  const handleLoadProfile = (profile) => {
    setAcq(profile.acq);
    setProp(profile.prop);
    setRooms(profile.rooms);
    setNextRoomId(profile.nextRoomId || profile.rooms.length);
    setContractors(profile.contractors || []);
    setCostDb(profile.costDb);
    setContingencyPct(profile.contingencyPct);
    setPmPct(profile.pmPct);
    setHolding(profile.holding);
    setResale(profile.resale);
    setQuickRenoEstimate(profile.quickRenoEstimate);
    setMode(profile.mode);
    setSensResaleAdj(0); setSensRenoAdj(0); setSensHoldAdj(0);
    setActiveProfileId(profile.id);
    setCurrentProfileName(profile.name);
    setStep(profile.mode === "quick" ? 0 : 0);
  };

  const handleDeleteProfile = (id) => {
    const updated = removeProfile(id);
    setProfiles(updated);
    if (activeProfileId === id) { setActiveProfileId(null); setCurrentProfileName(""); }
  };

  const handleCompareProfiles = () => {
    setMode("advanced");
    setStep(7);
    setScenarioTab("crossProfile");
  };

  const startCalculator = () => {
    setStep(0);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

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

  // ─── DEAL SCORE BADGE (for quick mode) ───
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

  // ─── QUICK MODE ───
  const renderQuickMode = () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Card title="Quick Estimate" subtitle="Enter 5 key numbers. Everything else uses smart SA defaults. Switch to Advanced for full control.">
        <NumInput label="Your Purchase Price (R)" value={acq.purchasePrice} onChange={(v) => updateAcq("purchasePrice", v)} tooltip={TOOLTIPS.purchasePrice} isMobile={isMobile} />
        <NumInput label="Your Renovation Estimate (R)" value={quickRenoEstimate} onChange={setQuickRenoEstimate} tooltip={TOOLTIPS.renoEstimate} isMobile={isMobile} />
        <NumInput label="Expected Sale Price (R)" value={resale.expectedPrice} onChange={(v) => updateResale("expectedPrice", v)} tooltip={TOOLTIPS.expectedPrice} isMobile={isMobile} />
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

      <SectionDivider label="Your Results" />
      <DealScoreBadge large />
      <div style={{ marginTop: 20 }} />

      <Card style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="All-In Cost" value={fmt(allInCost)} isMobile={isMobile} />
          <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${holding.renovationMonths} months`} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricBox label="Cash Required" value={fmt(cashInvested)} sub="Total cash outlay" isMobile={isMobile} />
          <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
        </div>
      </Card>

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
            <MetricBox label="Adj. Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
            <MetricBox label="Adj. ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
            <MetricBox label="Adj. Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
          </div>
        </div>
      </Card>

      <Card subtitle="Auto-applied smart defaults: Transfer duty auto-calculated, Bond rate at prime+1%, Agent commission 5%, Attorney fees R 45,000, Monthly holding ~R 6,450/mo. Switch to Advanced Mode for full control over every line item." style={{ background: theme.input, borderColor: theme.inputBorder }}>
        <div style={{ textAlign: "center" }}>
          <CTAButton label="Switch to Advanced Mode" onClick={() => { setMode("advanced"); setStep(0); }} primary={false} isMobile={isMobile} />
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
          <CTAButton label="Quick Estimate (5 fields)" onClick={() => { setMode("quick"); setStep(0); }} isMobile={isMobile} />
          <CTAButton label="Advanced Calculator" onClick={() => { setMode("advanced"); setStep(0); }} primary={false} isMobile={isMobile} />
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
            { icon: "~", title: "Renovation Modelling", desc: "Room-by-room cost estimates with scope multipliers, detailed per-item breakdowns, and contractor tracking." },
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
        <CTAButton label="Calculate Profit Now" onClick={startCalculator} isMobile={isMobile} />
      </div>
    </div>
  );

  // ─── ADVANCED STEP CONTENT ───
  const renderStep = () => {
    switch (step) {
      case 0:
        return <AcquisitionStep acq={acq} updateAcq={updateAcq} transferDuty={transferDuty} totalAcquisition={totalAcquisition} isMobile={isMobile} />;
      case 1:
        return <PropertyStep prop={prop} updateProp={updateProp} isMobile={isMobile} />;
      case 2:
        return <RoomsStep rooms={rooms} updateRoom={updateRoom} removeRoom={removeRoom} addRoom={addRoom} isMobile={isMobile} />;
      case 3:
        return <ContractorPanel contractors={contractors} setContractors={setContractors} rooms={rooms} isMobile={isMobile} />;
      case 4:
        return (
          <CostDatabase
            costDb={costDb} updateCostItem={updateCostItem}
            pmPct={pmPct} setPmPct={setPmPct} contingencyPct={contingencyPct} setContingencyPct={setContingencyPct}
            totalRoomMaterialCost={totalRoomMaterialCost} contractorLabour={contractorLabour} fixedCosts={fixedCosts}
            pmCost={pmCost} contingency={contingency} totalRenovation={totalRenovation} renoCostPerSqm={renoCostPerSqm}
            isMobile={isMobile}
          />
        );
      case 5:
        return (
          <HoldingStep
            holding={holding} updateHolding={updateHolding} acq={acq}
            monthlyBondInterest={monthlyBondInterest} monthlyHoldingTotal={monthlyHoldingTotal}
            totalHoldingCost={totalHoldingCost} holdingTimeline={holdingTimeline}
            isMobile={isMobile}
          />
        );
      case 6:
        return (
          <ResaleStep
            resale={resale} updateResale={updateResale} prop={prop}
            allInCost={allInCost} agentComm={agentComm} grossProfit={grossProfit} netProfit={netProfit}
            profitPerSqm={profitPerSqm} roi={roi} annualizedRoi={annualizedRoi}
            returnOnCash={returnOnCash} cashInvested={cashInvested} breakEvenResale={breakEvenResale}
            dealScore={dealScore} totalAcquisition={totalAcquisition} totalRenovation={totalRenovation}
            totalHoldingCost={totalHoldingCost} holding={holding} transferDuty={transferDuty}
            isMobile={isMobile}
          />
        );
      case 7:
        return (
          <ScenarioLab
            baseInputs={{
              totalRenovation, monthlyHoldingTotal, renovationMonths: holding.renovationMonths,
              totalAcquisition, expectedPrice: resale.expectedPrice, agentCommission: resale.agentCommission,
            }}
            customScenarios={customScenarios} setCustomScenarios={setCustomScenarios}
            profiles={profiles} scenarioTab={scenarioTab} setScenarioTab={setScenarioTab}
            sensResaleAdj={sensResaleAdj} setSensResaleAdj={setSensResaleAdj}
            sensRenoAdj={sensRenoAdj} setSensRenoAdj={setSensRenoAdj}
            sensHoldAdj={sensHoldAdj} setSensHoldAdj={setSensHoldAdj}
            sensCalc={sensCalc}
            isMobile={isMobile}
          />
        );
      case 8:
        return (
          <SummaryStep
            acq={acq} holding={holding} resale={resale} prop={prop} transferDuty={transferDuty}
            allInCost={allInCost} agentComm={agentComm} netProfit={netProfit} grossProfit={grossProfit}
            roi={roi} annualizedRoi={annualizedRoi} returnOnCash={returnOnCash}
            cashInvested={cashInvested} breakEvenResale={breakEvenResale} renoCostPerSqm={renoCostPerSqm}
            dealScore={dealScore} totalAcquisition={totalAcquisition} totalRenovation={totalRenovation}
            totalHoldingCost={totalHoldingCost} totalRoomMaterialCost={totalRoomMaterialCost}
            contractorLabour={contractorLabour} fixedCosts={fixedCosts} pmCost={pmCost} contingency={contingency}
            roomCosts={roomCosts} contractors={contractors} resetAll={resetAll}
            isMobile={isMobile}
          />
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
        <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setStep(-1)}>
            <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#000" }}>F</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>FlipModel</div>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>Quick Estimate</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ProfileManager profiles={profiles} activeProfileId={activeProfileId} currentProfileName={currentProfileName} onSave={handleSaveProfile} onLoad={handleLoadProfile} onDelete={handleDeleteProfile} onCompareProfiles={handleCompareProfiles} isMobile={isMobile} />
            <ModeToggle />
            <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 6 }} isMobile={isMobile} />
          </div>
        </div>
        <div style={{ padding: isMobile ? "16px 12px" : "24px 24px" }}>
          {renderQuickMode()}
        </div>
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
      <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setStep(-1)}>
          <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#000" }}>F</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>FlipModel</div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>Advanced Calculator</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ProfileManager profiles={profiles} activeProfileId={activeProfileId} currentProfileName={currentProfileName} onSave={handleSaveProfile} onLoad={handleLoadProfile} onDelete={handleDeleteProfile} onCompareProfiles={handleCompareProfiles} isMobile={isMobile} />
          <ModeToggle />
          <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "6px 14px", fontSize: 11, borderRadius: 6 }} isMobile={isMobile} />
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
            <CTAButton label="New Calculation" onClick={resetAll} style={{ borderRadius: 10 }} isMobile={isMobile} />
          ) : (
            <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} style={{
              background: theme.accent, border: "none", color: "#000", borderRadius: 10,
              padding: isMobile ? "12px 20px" : "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>{step === 5 ? "See Your Profit" : "Next Step"}</button>
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
