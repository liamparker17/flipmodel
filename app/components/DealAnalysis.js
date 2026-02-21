"use client";
import { useState, useEffect, useRef } from "react";
import { STEPS, STEP_SHORT, TOOLTIPS } from "../data/constants";
import {
  theme, fmt, pct,
  NumInput, Toggle, Card, MetricBox, SectionDivider, CTAButton, SliderInput, Tooltip, Toast,
} from "./theme";
import useCalculator from "../hooks/useCalculator";
import { loadProfiles, saveProfile as persistProfile, deleteProfile as removeProfile } from "../utils/profiles";

import AcquisitionStep from "./AcquisitionStep";
import PropertyStep from "./PropertyStep";
import RoomsStep from "./RoomsStep";
import ContractorPanel from "./ContractorPanel";
import CostDatabase from "./CostDatabase";
import HoldingStep from "./HoldingStep";
import ResaleStep from "./ResaleStep";
import SummaryStep from "./SummaryStep";
import ProfileManager from "./ProfileManager";
import ScenarioLab from "./ScenarioLab";
import ExpensesStep from "./ExpensesStep";
import MaterialBreakdown from "./MaterialBreakdown";

export default function DealAnalysis({ initialData, dealId, onSave }) {
  const calc = useCalculator(initialData);
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // Profiles (legacy compat)
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(dealId || null);
  const [currentProfileName, setCurrentProfileName] = useState("");

  useEffect(() => { setProfiles(loadProfiles()); }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-save to deal on data changes (debounced)
  useEffect(() => {
    if (!onSave) return;
    const timer = setTimeout(() => {
      onSave(calc.getSnapshot());
    }, 2000);
    return () => clearTimeout(timer);
  }, [calc.getSnapshot, onSave]);

  // Profile handlers
  const handleSaveProfile = (name, asNew) => {
    const id = asNew || !activeProfileId ? String(Date.now()) : activeProfileId;
    const profile = {
      id, name: name || "Unnamed Property", savedAt: new Date().toISOString(),
      ...calc.getSnapshot(),
    };
    const updated = persistProfile(profile);
    setProfiles(updated);
    setActiveProfileId(id);
    setCurrentProfileName(profile.name);
  };

  const handleLoadProfile = (profile) => {
    calc.loadFromData(profile);
    setActiveProfileId(profile.id);
    setCurrentProfileName(profile.name);
    setStep(0);
  };

  const handleDeleteProfile = (id) => {
    const updated = removeProfile(id);
    setProfiles(updated);
    if (activeProfileId === id) { setActiveProfileId(null); setCurrentProfileName(""); }
  };

  const handleCompareProfiles = () => {
    calc.setMode("advanced");
    setStep(8);
    calc.setScenarioTab("crossProfile");
  };

  const resetAll = () => {
    calc.resetAll();
    setActiveProfileId(null);
    setCurrentProfileName("");
    setStep(0);
  };

  // ─── STEP PROGRESS ───
  const progressPct = ((step + 1) / STEPS.length) * 100;

  // ─── MODE TOGGLE ───
  const ModeToggle = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: theme.input, borderRadius: 8, padding: 3 }}>
      {["quick", "advanced"].map((m) => (
        <button key={m} onClick={() => calc.setMode(m)} style={{
          background: calc.mode === m ? theme.accent : "transparent", color: calc.mode === m ? "#000" : theme.textDim,
          border: "none", borderRadius: 6, padding: "8px 14px",
          fontSize: 13, fontWeight: calc.mode === m ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
          textTransform: "capitalize", minHeight: 36,
        }}>{m === "quick" ? "Quick" : "Advanced"}</button>
      ))}
    </div>
  );

  // ─── DEAL SCORE BADGE ───
  const DealScoreBadge = ({ large = false }) => (
    <div style={{
      background: calc.dealScore.bg, border: `1px solid ${calc.dealScore.color}40`,
      borderRadius: 12, padding: large ? (isMobile ? 20 : 28) : 16, textAlign: "center",
    }}>
      <div style={{
        width: large ? 64 : 48, height: large ? 64 : 48, borderRadius: "50%",
        background: calc.dealScore.color, display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontSize: large ? 28 : 20, fontWeight: 700, color: "#000",
      }}>
        {calc.dealScore.level === "strong" ? "A" : calc.dealScore.level === "marginal" ? "B" : "C"}
      </div>
      <div style={{ fontSize: large ? 22 : 16, fontWeight: 700, color: calc.dealScore.color, marginBottom: 4 }}>
        {calc.dealScore.label}
      </div>
      <div style={{ fontSize: 12, color: theme.textDim }}>{calc.dealScore.desc}</div>
    </div>
  );

  // ─── HEADER ───
  const Header = ({ subtitle }) => (
    <div style={{
      padding: isMobile ? "10px 16px" : "12px 24px",
      borderBottom: `1px solid ${theme.cardBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: theme.accent, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#000",
        }}>JH</div>
        {!isMobile && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>JustHouses</div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5 }}>{subtitle}</div>
          </div>
        )}
      </div>
      {isMobile ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ProfileManager profiles={profiles} activeProfileId={activeProfileId} currentProfileName={currentProfileName}
            onSave={handleSaveProfile} onLoad={handleLoadProfile} onDelete={handleDeleteProfile}
            onCompareProfiles={handleCompareProfiles} isMobile={isMobile} onToast={showToast} />
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            color: theme.text, fontSize: 18, cursor: "pointer",
          }}>=</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ProfileManager profiles={profiles} activeProfileId={activeProfileId} currentProfileName={currentProfileName}
            onSave={handleSaveProfile} onLoad={handleLoadProfile} onDelete={handleDeleteProfile}
            onCompareProfiles={handleCompareProfiles} isMobile={isMobile} onToast={showToast} />
          <ModeToggle />
          <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 8, minHeight: 40 }} />
        </div>
      )}
    </div>
  );

  // ─── MOBILE MENU OVERLAY ───
  const MobileMenu = () => menuOpen && (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 150,
      display: "flex", flexDirection: "column",
    }}>
      <div onClick={() => setMenuOpen(false)} style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)",
      }} />
      <div style={{
        position: "relative", background: theme.card,
        borderBottom: `1px solid ${theme.cardBorder}`,
        padding: 20, maxHeight: "70vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.accent }}>JustHouses</span>
          <button onClick={() => setMenuOpen(false)} style={{
            background: theme.input, border: "none", color: theme.textDim,
            width: 44, height: 44, borderRadius: 8, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>X</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <ModeToggle />
        </div>
        <button onClick={() => { resetAll(); setMenuOpen(false); }} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
          padding: "12px 20px", fontSize: 14, color: theme.text, cursor: "pointer",
          width: "100%", minHeight: 44, marginBottom: 12,
        }}>Reset All</button>
      </div>
    </div>
  );

  // ─── QUICK MODE ───
  const renderQuickMode = () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Card title="Quick Estimate" subtitle="Enter 5 key numbers. Everything else uses smart SA defaults. Switch to Advanced for full control.">
        <NumInput label="Your Purchase Price (R)" value={calc.acq.purchasePrice} onChange={(v) => calc.updateAcq("purchasePrice", v)} tooltip={TOOLTIPS.purchasePrice} isMobile={isMobile} />
        <NumInput label="Your Renovation Estimate (R)" value={calc.quickRenoEstimate} onChange={calc.setQuickRenoEstimate} tooltip={TOOLTIPS.renoEstimate} isMobile={isMobile} />
        <NumInput label="Expected Sale Price (R)" value={calc.resale.expectedPrice} onChange={(v) => calc.updateResale("expectedPrice", v)} tooltip={TOOLTIPS.expectedPrice} isMobile={isMobile} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
              Holding Period<Tooltip text={TOOLTIPS.renovationMonths} />
            </label>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {calc.holding.renovationMonths} months
            </span>
          </div>
          <input type="range" min={1} max={18} step={1} value={calc.holding.renovationMonths}
            onChange={(e) => calc.updateHolding("renovationMonths", Number(e.target.value))}
            style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            <span>1 mo</span><span>18 mo</span>
          </div>
        </div>
        <Toggle label="Cash purchase (no bond)" value={calc.acq.cashPurchase} onChange={(v) => calc.updateAcq("cashPurchase", v)} tooltip={TOOLTIPS.cashPurchase} />
      </Card>

      <SectionDivider label="Your Results" />
      <DealScoreBadge large />
      <div style={{ marginTop: 16 }} />

      <Card style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <MetricBox label="All-In Cost" value={fmt(calc.allInCost)} isMobile={isMobile} />
          <MetricBox label="Net Profit" value={fmt(calc.netProfit)} color={calc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <MetricBox label="ROI" value={pct(calc.roi)} color={calc.roi >= 0.15 ? theme.green : calc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Annualized ROI" value={pct(calc.annualizedRoi)} color={calc.annualizedRoi >= 0.3 ? theme.green : calc.annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${calc.holding.renovationMonths} months`} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <MetricBox label="Cash Required" value={fmt(calc.cashInvested)} sub="Total cash outlay" isMobile={isMobile} />
          <MetricBox label="Return on Cash" value={pct(calc.returnOnCash)} color={calc.returnOnCash >= 0.2 ? theme.green : calc.returnOnCash >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
        </div>
      </Card>

      <SectionDivider label="What If?" />
      <Card title="Sensitivity Sliders" subtitle="Drag to see how changes affect your profit and ROI in real time.">
        <SliderInput label="Resale Price Adjustment" value={calc.sensResaleAdj} onChange={calc.setSensResaleAdj} min={-15} max={15} />
        <SliderInput label="Renovation Overrun" value={calc.sensRenoAdj} onChange={calc.setSensRenoAdj} min={0} max={30} />
        <SliderInput label="Extra Holding Time" value={calc.sensHoldAdj} onChange={calc.setSensHoldAdj} min={0} max={14} suffix=" mo" />
        <div style={{ background: theme.input, borderRadius: 10, padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            {calc.sensResaleAdj === 0 && calc.sensRenoAdj === 0 && calc.sensHoldAdj === 0 ? "Base Scenario" : "Adjusted Scenario"}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <MetricBox label="Adj. Net Profit" value={fmt(calc.sensCalc.netProfit)} color={calc.sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
            <MetricBox label="Adj. ROI" value={pct(calc.sensCalc.roi)} color={calc.sensCalc.roi >= 0.15 ? theme.green : calc.sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
            <MetricBox label="Adj. Ann. ROI" value={pct(calc.sensCalc.annRoi)} color={calc.sensCalc.annRoi >= 0.3 ? theme.green : calc.sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${calc.sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
          </div>
        </div>
      </Card>

      <SectionDivider label="Shop This Renovation" />
      <MaterialBreakdown rooms={calc.rooms} prop={calc.prop} mode={calc.mode} isMobile={isMobile} />

      <Card subtitle="Auto-applied smart defaults: Transfer duty auto-calculated, Bond rate at prime+1%, Agent commission 5%, Attorney fees R 45,000, Monthly holding ~R 6,450/mo. Switch to Advanced Mode for full control." style={{ background: theme.input, borderColor: theme.inputBorder }}>
        <div style={{ textAlign: "center" }}>
          <CTAButton label="Switch to Advanced Mode" onClick={() => { calc.setMode("advanced"); setStep(0); }} primary={false} isMobile={isMobile} />
        </div>
      </Card>
    </div>
  );

  // ─── ADVANCED STEP CONTENT ───
  const renderStep = () => {
    switch (step) {
      case 0:
        return <AcquisitionStep acq={calc.acq} updateAcq={calc.updateAcq} transferDuty={calc.transferDuty} totalAcquisition={calc.totalAcquisition} isMobile={isMobile} />;
      case 1:
        return <PropertyStep prop={calc.prop} updateProp={calc.updateProp} isMobile={isMobile} />;
      case 2:
        return <RoomsStep rooms={calc.rooms} updateRoom={calc.updateRoom} removeRoom={calc.removeRoom} addRoom={calc.addRoom} isMobile={isMobile} />;
      case 3:
        return <ContractorPanel contractors={calc.contractors} setContractors={calc.setContractors} rooms={calc.rooms} isMobile={isMobile} />;
      case 4:
        return (
          <CostDatabase
            costDb={calc.costDb} updateCostItem={calc.updateCostItem}
            pmPct={calc.pmPct} setPmPct={calc.setPmPct} contingencyPct={calc.contingencyPct} setContingencyPct={calc.setContingencyPct}
            totalRoomMaterialCost={calc.totalRoomMaterialCost} contractorLabour={calc.contractorLabour} fixedCosts={calc.fixedCosts}
            pmCost={calc.pmCost} contingency={calc.contingency} totalRenovation={calc.totalRenovation} renoCostPerSqm={calc.renoCostPerSqm}
            isMobile={isMobile}
          />
        );
      case 5:
        return (
          <HoldingStep
            holding={calc.holding} updateHolding={calc.updateHolding} acq={calc.acq}
            monthlyBondInterest={calc.monthlyBondInterest} monthlyHoldingTotal={calc.monthlyHoldingTotal}
            totalHoldingCost={calc.totalHoldingCost} holdingTimeline={calc.holdingTimeline}
            isMobile={isMobile}
          />
        );
      case 6:
        return (
          <ResaleStep
            resale={calc.resale} updateResale={calc.updateResale} prop={calc.prop}
            allInCost={calc.allInCost} agentComm={calc.agentComm} grossProfit={calc.grossProfit} netProfit={calc.netProfit}
            profitPerSqm={calc.profitPerSqm} roi={calc.roi} annualizedRoi={calc.annualizedRoi}
            returnOnCash={calc.returnOnCash} cashInvested={calc.cashInvested} breakEvenResale={calc.breakEvenResale}
            dealScore={calc.dealScore} totalAcquisition={calc.totalAcquisition} totalRenovation={calc.totalRenovation}
            totalHoldingCost={calc.totalHoldingCost} holding={calc.holding} transferDuty={calc.transferDuty}
            isMobile={isMobile}
          />
        );
      case 7:
        return <MaterialBreakdown rooms={calc.rooms} prop={calc.prop} mode={calc.mode} isMobile={isMobile} />;
      case 8:
        return (
          <ScenarioLab
            baseInputs={{
              totalRenovation: calc.totalRenovation, monthlyHoldingTotal: calc.monthlyHoldingTotal,
              renovationMonths: calc.holding.renovationMonths,
              totalAcquisition: calc.totalAcquisition, expectedPrice: calc.resale.expectedPrice,
              agentCommission: calc.resale.agentCommission,
            }}
            customScenarios={calc.customScenarios} setCustomScenarios={calc.setCustomScenarios}
            profiles={profiles} scenarioTab={calc.scenarioTab} setScenarioTab={calc.setScenarioTab}
            sensResaleAdj={calc.sensResaleAdj} setSensResaleAdj={calc.setSensResaleAdj}
            sensRenoAdj={calc.sensRenoAdj} setSensRenoAdj={calc.setSensRenoAdj}
            sensHoldAdj={calc.sensHoldAdj} setSensHoldAdj={calc.setSensHoldAdj}
            sensCalc={calc.sensCalc}
            isMobile={isMobile}
          />
        );
      case 9:
        return <ExpensesStep profileId={activeProfileId} isMobile={isMobile} />;
      case 10:
        return (
          <SummaryStep
            acq={calc.acq} holding={calc.holding} resale={calc.resale} prop={calc.prop} transferDuty={calc.transferDuty}
            allInCost={calc.allInCost} agentComm={calc.agentComm} netProfit={calc.netProfit} grossProfit={calc.grossProfit}
            roi={calc.roi} annualizedRoi={calc.annualizedRoi} returnOnCash={calc.returnOnCash}
            cashInvested={calc.cashInvested} breakEvenResale={calc.breakEvenResale} renoCostPerSqm={calc.renoCostPerSqm}
            dealScore={calc.dealScore} totalAcquisition={calc.totalAcquisition} totalRenovation={calc.totalRenovation}
            totalHoldingCost={calc.totalHoldingCost} totalRoomMaterialCost={calc.totalRoomMaterialCost}
            contractorLabour={calc.contractorLabour} fixedCosts={calc.fixedCosts} pmCost={calc.pmCost} contingency={calc.contingency}
            roomCosts={calc.roomCosts} contractors={calc.contractors} resetAll={resetAll}
            isMobile={isMobile}
          />
        );
      default:
        return null;
    }
  };

  // ─── QUICK MODE ───
  if (calc.mode === "quick") {
    return (
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
        <Header subtitle="Quick Estimate" />
        <MobileMenu />
        <div style={{ padding: isMobile ? "16px 12px 100px" : "24px 24px 48px" }}>
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
              <div style={{ fontSize: 16, fontWeight: 700, color: calc.netProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(calc.netProfit)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: calc.roi >= 0.15 ? theme.green : calc.roi >= 0 ? theme.orange : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{pct(calc.roi)}</div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: calc.dealScore.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#000",
            }}>
              {calc.dealScore.level === "strong" ? "A" : calc.dealScore.level === "marginal" ? "B" : "C"}
            </div>
          </div>
        )}
        <Toast message={toastMsg} visible={toastVisible} />
      </div>
    );
  }

  // ─── ADVANCED MODE ───
  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <Header subtitle="Advanced Calculator" />
      <MobileMenu />

      {/* Progress bar */}
      <div style={{ height: 3, background: theme.inputBorder }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: theme.accent, transition: "width 0.3s ease" }} />
      </div>

      {/* Step nav */}
      <div style={{
        padding: isMobile ? "8px 8px" : "10px 24px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? theme.accent : "transparent",
            color: step === i ? "#000" : i < step ? theme.text : theme.textDim,
            border: `1px solid ${step === i ? theme.accent : theme.cardBorder}`, borderRadius: 8,
            padding: isMobile ? "8px 12px" : "8px 14px", fontSize: 12, fontWeight: step === i ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
            minHeight: 40,
          }}>{isMobile ? STEP_SHORT[i] : `${i + 1}. ${s}`}</button>
        ))}
      </div>

      {/* Content */}
      <div ref={contentRef} style={{ maxWidth: 840, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" }}>
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 300, marginBottom: 20, color: theme.text }}>
          <span style={{ color: theme.accent, fontWeight: 700 }}>{step + 1}</span>
          <span style={{ color: theme.textDim, margin: "0 8px" }}>/</span>
          {STEPS[step]}
        </h2>
        {renderStep()}
        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingBottom: isMobile ? 80 : 48, gap: 12 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{
            background: "transparent", border: `1px solid ${theme.cardBorder}`,
            color: step === 0 ? theme.textDim : theme.text, borderRadius: 10,
            padding: "12px 24px", fontSize: 14,
            cursor: step === 0 ? "default" : "pointer", minHeight: 44,
          }}>Previous</button>
          {step === STEPS.length - 1 ? (
            <CTAButton label="New Calculation" onClick={resetAll} style={{ borderRadius: 10 }} isMobile={isMobile} />
          ) : (
            <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} style={{
              background: theme.accent, border: "none", color: "#000", borderRadius: 10,
              padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44,
            }}>{step === 6 ? "Shop Materials" : "Next Step"}</button>
          )}
        </div>
      </div>

      {/* Sticky mobile footer */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: theme.card, borderTop: `1px solid ${theme.cardBorder}`,
          padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Net Profit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: calc.netProfit >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(calc.netProfit)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>ROI</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: calc.roi >= 0.15 ? theme.green : calc.roi >= 0 ? theme.orange : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{pct(calc.roi)}</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: calc.dealScore.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#000",
          }}>
            {calc.dealScore.level === "strong" ? "A" : calc.dealScore.level === "marginal" ? "B" : "C"}
          </div>
        </div>
      )}
      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
