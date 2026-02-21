"use client";
import { useState, useMemo, useCallback } from "react";
import { SA_PRIME, SCOPE_MULT } from "../data/constants";
import { DEFAULT_COSTS } from "../data/costDefaults";
import { PRESET_ROOMS } from "../data/roomTemplates";
import { calcTransferDuty } from "../components/theme";

const DEFAULT_ACQ = {
  purchasePrice: 1200000, deposit: 0, bondRate: SA_PRIME + 1, bondTerm: 240,
  cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0,
};

const DEFAULT_PROP = { totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" };

const DEFAULT_HOLDING = { renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 };

const DEFAULT_RESALE = { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 };

const DEFAULT_ROOMS = PRESET_ROOMS.map((r, i) => ({
  id: i, ...r, customCost: null, notes: "", breakdownMode: "simple", detailedItems: null,
}));

export default function useCalculator(initialData) {
  // ─── STATE ───
  const [mode, setMode] = useState(initialData?.mode || "quick");
  const [acq, setAcq] = useState(initialData?.acq || DEFAULT_ACQ);
  const [prop, setProp] = useState(initialData?.prop || DEFAULT_PROP);
  const [rooms, setRooms] = useState(initialData?.rooms || DEFAULT_ROOMS);
  const [nextRoomId, setNextRoomId] = useState(initialData?.nextRoomId || PRESET_ROOMS.length);
  const [contractors, setContractors] = useState(initialData?.contractors || []);
  const [costDb, setCostDb] = useState(initialData?.costDb || JSON.parse(JSON.stringify(DEFAULT_COSTS)));
  const [contingencyPct, setContingencyPct] = useState(initialData?.contingencyPct ?? 10);
  const [pmPct, setPmPct] = useState(initialData?.pmPct ?? 8);
  const [holding, setHolding] = useState(initialData?.holding || DEFAULT_HOLDING);
  const [resale, setResale] = useState(initialData?.resale || DEFAULT_RESALE);
  const [quickRenoEstimate, setQuickRenoEstimate] = useState(initialData?.quickRenoEstimate ?? 500000);

  // ─── SENSITIVITY ───
  const [sensResaleAdj, setSensResaleAdj] = useState(0);
  const [sensRenoAdj, setSensRenoAdj] = useState(0);
  const [sensHoldAdj, setSensHoldAdj] = useState(0);

  // ─── SCENARIO ───
  const [scenarioTab, setScenarioTab] = useState("builder");
  const [customScenarios, setCustomScenarios] = useState([]);

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
      if (room.breakdownMode === "detailed" && room.detailedItems) {
        const total = room.detailedItems.filter((i) => i.included).reduce((s, i) => s + i.qty * i.unitCost, 0);
        return { ...room, totalCost: Math.round(total) };
      }
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
            default: break;
          }
        }
      }
      return { ...room, totalCost: Math.round(total) };
    });
  }, [rooms, costDb]);

  const totalRoomMaterialCost = useMemo(() => roomCosts.reduce((s, r) => s + r.totalCost, 0), [roomCosts]);
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
    return ((acq.purchasePrice - acq.deposit) * (acq.bondRate / 100)) / 12;
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

  const dealScore = useMemo(() => {
    let score = 0;
    if (roi >= 0.20) score += 3; else if (roi >= 0.12) score += 2; else if (roi >= 0.05) score += 1;
    if (annualizedRoi >= 0.30) score += 2; else if (annualizedRoi >= 0.15) score += 1;
    if (holding.renovationMonths <= 4) score += 1;
    if (netProfit > 0 && (netProfit / resale.expectedPrice) >= 0.05) score += 1;
    if (score >= 5) return { level: "strong", label: "Strong Flip", color: "#34D399", bg: "#34D39918", desc: "High ROI, good margins, manageable timeline" };
    if (score >= 3) return { level: "marginal", label: "Marginal", color: "#FB923C", bg: "#FB923C18", desc: "Proceed with caution \u2014 tight margins or long hold" };
    return { level: "risky", label: "High Risk", color: "#F87171", bg: "#F8717118", desc: "Negative or near-zero returns \u2014 consider passing" };
  }, [roi, annualizedRoi, holding.renovationMonths, netProfit, resale.expectedPrice]);

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

  // ─── HELPERS ───
  const updateAcq = useCallback((k, v) => setAcq((p) => ({ ...p, [k]: v })), []);
  const updateProp = useCallback((k, v) => setProp((p) => ({ ...p, [k]: v })), []);
  const updateHolding = useCallback((k, v) => setHolding((p) => ({ ...p, [k]: v })), []);
  const updateResale = useCallback((k, v) => setResale((p) => ({ ...p, [k]: v })), []);
  const updateRoom = useCallback((id, k, v) => setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r))), []);
  const removeRoom = useCallback((id) => setRooms((prev) => prev.filter((r) => r.id !== id)), []);
  const addRoom = useCallback(() => {
    setRooms((prev) => [...prev, {
      id: nextRoomId, name: "New Room", sqm: 10, scope: "cosmetic",
      customCost: null, notes: "", roomType: "bedroom",
      breakdownMode: "simple", detailedItems: null,
    }]);
    setNextRoomId((p) => p + 1);
  }, [nextRoomId]);
  const updateCostItem = useCallback((cat, key, val) => {
    setCostDb((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[cat][key].cost = Number(val);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setAcq(DEFAULT_ACQ);
    setProp(DEFAULT_PROP);
    setRooms(DEFAULT_ROOMS);
    setNextRoomId(PRESET_ROOMS.length);
    setContractors([]);
    setCostDb(JSON.parse(JSON.stringify(DEFAULT_COSTS)));
    setContingencyPct(10);
    setPmPct(8);
    setHolding(DEFAULT_HOLDING);
    setResale(DEFAULT_RESALE);
    setQuickRenoEstimate(500000);
    setSensResaleAdj(0); setSensRenoAdj(0); setSensHoldAdj(0);
    setMode("quick");
  }, []);

  const loadFromData = useCallback((data) => {
    if (data.acq) setAcq(data.acq);
    if (data.prop) setProp(data.prop);
    if (data.rooms) setRooms(data.rooms);
    if (data.nextRoomId != null) setNextRoomId(data.nextRoomId);
    if (data.contractors) setContractors(data.contractors);
    if (data.costDb) setCostDb(data.costDb);
    if (data.contingencyPct != null) setContingencyPct(data.contingencyPct);
    if (data.pmPct != null) setPmPct(data.pmPct);
    if (data.holding) setHolding(data.holding);
    if (data.resale) setResale(data.resale);
    if (data.quickRenoEstimate != null) setQuickRenoEstimate(data.quickRenoEstimate);
    if (data.mode) setMode(data.mode);
    setSensResaleAdj(0); setSensRenoAdj(0); setSensHoldAdj(0);
  }, []);

  // Returns a snapshot suitable for saving as a deal/profile
  const getSnapshot = useCallback(() => ({
    mode, acq, prop, rooms, nextRoomId, contractors, costDb,
    contingencyPct, pmPct, holding, resale, quickRenoEstimate,
  }), [mode, acq, prop, rooms, nextRoomId, contractors, costDb, contingencyPct, pmPct, holding, resale, quickRenoEstimate]);

  return {
    // State
    mode, setMode,
    acq, setAcq, updateAcq,
    prop, setProp, updateProp,
    rooms, setRooms, updateRoom, removeRoom, addRoom,
    nextRoomId,
    contractors, setContractors,
    costDb, setCostDb, updateCostItem,
    contingencyPct, setContingencyPct,
    pmPct, setPmPct,
    holding, setHolding, updateHolding,
    resale, setResale, updateResale,
    quickRenoEstimate, setQuickRenoEstimate,
    // Sensitivity
    sensResaleAdj, setSensResaleAdj,
    sensRenoAdj, setSensRenoAdj,
    sensHoldAdj, setSensHoldAdj,
    // Scenario
    scenarioTab, setScenarioTab,
    customScenarios, setCustomScenarios,
    // Computed
    transferDuty, totalAcquisition,
    roomCosts, totalRoomMaterialCost, contractorLabour, fixedCosts,
    baseCosts, pmCost, contingency, advancedTotalRenovation,
    totalRenovation, renoCostPerSqm,
    monthlyBondInterest, monthlyHoldingTotal, totalHoldingCost,
    allInCost, agentComm, grossProfit, netProfit, profitPerSqm,
    roi, cashInvested, returnOnCash, breakEvenResale,
    annualizedRoi, dealScore, holdingTimeline, sensCalc,
    // Actions
    resetAll, loadFromData, getSnapshot,
  };
}
