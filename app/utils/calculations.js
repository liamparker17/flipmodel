// ─── Pure Calculation Functions ───
// Mirrors the useMemo chain in page.js for use outside React hooks (e.g. cross-profile comparison)

import { SCOPE_MULT } from "../data/constants";
import { calcTransferDuty } from "../components/theme";

function calcRoomCost(room, costDb) {
  if (room.customCost !== null && room.customCost !== "") {
    return Number(room.customCost);
  }
  if (room.breakdownMode === "detailed" && room.detailedItems) {
    return Math.round(
      room.detailedItems.filter((i) => i.included).reduce((s, i) => s + i.qty * i.unitCost, 0)
    );
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
  return Math.round(total);
}

function calcDealScore(roi, annualizedRoi, renovationMonths, netProfit, expectedPrice) {
  let score = 0;
  if (roi >= 0.20) score += 3; else if (roi >= 0.12) score += 2; else if (roi >= 0.05) score += 1;
  if (annualizedRoi >= 0.30) score += 2; else if (annualizedRoi >= 0.15) score += 1;
  if (renovationMonths <= 4) score += 1;
  if (netProfit > 0 && (netProfit / expectedPrice) >= 0.05) score += 1;
  if (score >= 5) return { level: "strong", label: "Strong Flip", color: "#34D399", bg: "#34D39918", desc: "High ROI, good margins, manageable timeline" };
  if (score >= 3) return { level: "marginal", label: "Marginal", color: "#FB923C", bg: "#FB923C18", desc: "Proceed with caution — tight margins or long hold" };
  return { level: "risky", label: "High Risk", color: "#F87171", bg: "#F8717118", desc: "Negative or near-zero returns — consider passing" };
}

export function computeMetrics(profile) {
  const { acq, prop, rooms, contractors, costDb, contingencyPct, pmPct, holding, resale, quickRenoEstimate, mode } = profile;

  const transferDuty = calcTransferDuty(acq.purchasePrice);
  const totalAcquisition = acq.purchasePrice + transferDuty + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs;

  const roomCosts = rooms.map((room) => ({ ...room, totalCost: calcRoomCost(room, costDb) }));
  const totalRoomMaterialCost = roomCosts.reduce((s, r) => s + r.totalCost, 0);

  const contractorLabour = (contractors || []).reduce((s, c) => s + c.dailyRate * c.daysWorked, 0);

  let fixedCosts = 0;
  for (const cat of Object.values(costDb)) {
    for (const item of Object.values(cat)) {
      if (item.unit === "fixed") fixedCosts += item.cost;
    }
  }

  const baseCosts = totalRoomMaterialCost + contractorLabour + fixedCosts;
  const pmCost = baseCosts * (pmPct / 100);
  const contingency = (baseCosts + pmCost) * (contingencyPct / 100);
  const advancedTotalRenovation = baseCosts + pmCost + contingency;
  const totalRenovation = mode === "quick" ? quickRenoEstimate : advancedTotalRenovation;

  const renoCostPerSqm = prop.totalSqm > 0 ? totalRenovation / prop.totalSqm : 0;

  const monthlyBondInterest = acq.cashPurchase ? 0 : ((acq.purchasePrice - acq.deposit) * (acq.bondRate / 100)) / 12;
  const monthlyHoldingTotal = monthlyBondInterest + holding.ratesAndTaxes + holding.utilities + holding.insurance + holding.security + holding.levies;
  const totalHoldingCost = monthlyHoldingTotal * holding.renovationMonths;

  const allInCost = totalAcquisition + totalRenovation + totalHoldingCost;
  const agentComm = resale.expectedPrice * (resale.agentCommission / 100);
  const grossProfit = resale.expectedPrice - allInCost;
  const netProfit = grossProfit - agentComm;
  const profitPerSqm = prop.totalSqm > 0 ? netProfit / prop.totalSqm : 0;
  const roi = allInCost > 0 ? netProfit / allInCost : 0;
  const cashInvested = acq.deposit + totalRenovation + totalHoldingCost + acq.transferAttorneyFees + acq.bondRegistration + acq.initialRepairs + transferDuty;
  const returnOnCash = cashInvested > 0 ? netProfit / cashInvested : 0;
  const breakEvenResale = allInCost + agentComm;
  const annualizedRoi = (holding.renovationMonths > 0 && allInCost > 0) ? (netProfit / allInCost) * (12 / holding.renovationMonths) : 0;
  const dealScore = calcDealScore(roi, annualizedRoi, holding.renovationMonths, netProfit, resale.expectedPrice);

  return {
    transferDuty, totalAcquisition, roomCosts, totalRoomMaterialCost, contractorLabour,
    fixedCosts, baseCosts, pmCost, contingency, totalRenovation, renoCostPerSqm,
    monthlyBondInterest, monthlyHoldingTotal, totalHoldingCost,
    allInCost, agentComm, grossProfit, netProfit, profitPerSqm, roi,
    cashInvested, returnOnCash, breakEvenResale, annualizedRoi, dealScore,
  };
}

// Scenario calculation for the Scenario Lab
export function calcScenario(baseInputs, scenario) {
  const totalHoldMonths = baseInputs.renovationMonths
    + (scenario.constructionDelayMonths || 0)
    + (scenario.transferDelayMonths || 0);
  const adjReno = baseInputs.totalRenovation * (1 + (scenario.renoAdjPct || 0) / 100);
  const adjHold = baseInputs.monthlyHoldingTotal * totalHoldMonths;
  const adjAllIn = baseInputs.totalAcquisition + adjReno + adjHold;
  const adjResale = baseInputs.expectedPrice * (1 + (scenario.resaleAdjPct || 0) / 100);
  const adjComm = adjResale * (baseInputs.agentCommission / 100);
  const adjNet = adjResale - adjAllIn - adjComm;
  const adjRoi = adjAllIn > 0 ? adjNet / adjAllIn : 0;
  const adjAnnRoi = totalHoldMonths > 0 && adjAllIn > 0 ? (adjNet / adjAllIn) * (12 / totalHoldMonths) : 0;

  let dealScore;
  let score = 0;
  if (adjRoi >= 0.20) score += 3; else if (adjRoi >= 0.12) score += 2; else if (adjRoi >= 0.05) score += 1;
  if (adjAnnRoi >= 0.30) score += 2; else if (adjAnnRoi >= 0.15) score += 1;
  if (totalHoldMonths <= 4) score += 1;
  if (adjNet > 0 && (adjNet / adjResale) >= 0.05) score += 1;
  if (score >= 5) dealScore = { level: "strong", color: "#34D399" };
  else if (score >= 3) dealScore = { level: "marginal", color: "#FB923C" };
  else dealScore = { level: "risky", color: "#F87171" };

  return {
    allIn: adjAllIn, resalePrice: adjResale, netProfit: adjNet, roi: adjRoi, annRoi: adjAnnRoi,
    totalHoldMonths, monthlyBurn: baseInputs.monthlyHoldingTotal, adjReno, adjHold, dealScore,
  };
}
