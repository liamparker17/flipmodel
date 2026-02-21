"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { STEPS, STEP_SHORT } from "../../data/constants";
import {
  theme, fmt, pct,
  Card, SectionDivider, CTAButton, Toast,
} from "../theme";
import useCalculator from "../../hooks/useCalculator";
import { loadProfiles, saveProfile as persistProfile, deleteProfile as removeProfile } from "../../utils/profiles";
import CostInputs from "./CostInputs";
import ProfitSummary from "./ProfitSummary";
import ROIResults from "./ROIResults";
import type { DealData } from "../../types/deal";

// Step components (existing JS — interop)
import AcquisitionStep from "../AcquisitionStep";
import PropertyStep from "../PropertyStep";
import RoomsStep from "../RoomsStep";
import ContractorPanel from "../ContractorPanel";
import CostDatabase from "../CostDatabase";
import HoldingStep from "../HoldingStep";
import ResaleStep from "../ResaleStep";
import SummaryStep from "../SummaryStep";
import ProfileManager from "../ProfileManager";
import ScenarioLab from "../ScenarioLab";
import ExpensesStep from "../ExpensesStep";
import MaterialBreakdown from "../MaterialBreakdown";

interface DealAnalysisProps {
  initialData?: DealData;
  dealId?: string;
  onSave?: (snapshot: DealData) => void;
  view?: "analysis" | "contractors" | "suppliers";
}

export default function DealAnalysis({ initialData, dealId, onSave, view = "analysis" }: DealAnalysisProps) {
  const calc = useCalculator(initialData);
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // Profiles (legacy compat)
  const [profiles, setProfiles] = useState<ReturnType<typeof loadProfiles>>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(dealId || null);
  const [currentProfileName, setCurrentProfileName] = useState("");

  useEffect(() => { setProfiles(loadProfiles()); }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-save to deal on data changes (debounced)
  const stableOnSave = useCallback((snapshot: DealData) => {
    if (onSave) onSave(snapshot);
  }, [onSave]);

  useEffect(() => {
    if (!onSave) return;
    const timer = setTimeout(() => {
      stableOnSave(calc.getSnapshot() as DealData);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.mode, calc.acq, calc.prop, calc.rooms, calc.contractors, calc.costDb, calc.contingencyPct, calc.pmPct, calc.holding, calc.resale, calc.quickRenoEstimate, stableOnSave]);

  const handleSaveProfile = (name: string, asNew: boolean) => {
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

  const handleLoadProfile = (profile: Record<string, unknown>) => {
    calc.loadFromData(profile as Partial<DealData>);
    setActiveProfileId(profile.id as string);
    setCurrentProfileName(profile.name as string);
    setStep(0);
  };

  const handleDeleteProfile = (id: string) => {
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

  const progressPct = ((step + 1) / STEPS.length) * 100;

  const ModeToggle = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: theme.input, borderRadius: 8, padding: 3 }}>
      {(["quick", "advanced"] as const).map((m) => (
        <button key={m} onClick={() => calc.setMode(m)} style={{
          background: calc.mode === m ? theme.accent : "transparent", color: calc.mode === m ? "#000" : theme.textDim,
          border: "none", borderRadius: 6, padding: "8px 14px",
          fontSize: 13, fontWeight: calc.mode === m ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
          textTransform: "capitalize", minHeight: 36,
        }}>{m === "quick" ? "Quick" : "Advanced"}</button>
      ))}
    </div>
  );

  const Header = ({ subtitle }: { subtitle: string }) => (
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
          <CTAButton label="Reset" onClick={resetAll} primary={false} style={{ padding: "8px 16px", fontSize: 12, borderRadius: 8, minHeight: 40 }} isMobile={isMobile} />
        </div>
      )}
    </div>
  );

  const MobileMenu = () => menuOpen ? (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 150, display: "flex", flexDirection: "column" }}>
      <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: theme.card, borderBottom: `1px solid ${theme.cardBorder}`, padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.accent }}>JustHouses</span>
          <button onClick={() => setMenuOpen(false)} style={{ background: theme.input, border: "none", color: theme.textDim, width: 44, height: 44, borderRadius: 8, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
        </div>
        <div style={{ marginBottom: 16 }}><ModeToggle /></div>
        <button onClick={() => { resetAll(); setMenuOpen(false); }} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: "12px 20px", fontSize: 14, color: theme.text, cursor: "pointer", width: "100%", minHeight: 44 }}>Reset All</button>
      </div>
    </div>
  ) : null;

  // Mobile sticky footer
  const MobileFooter = () => isMobile ? (
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
  ) : null;

  // ─── QUICK MODE ───
  const renderQuickMode = () => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Card title="Quick Estimate" subtitle="Enter 5 key numbers. Everything else uses smart SA defaults. Switch to Advanced for full control.">
        <CostInputs
          purchasePrice={calc.acq.purchasePrice}
          onPurchasePriceChange={(v) => calc.updateAcq("purchasePrice", v)}
          renoEstimate={calc.quickRenoEstimate}
          onRenoEstimateChange={calc.setQuickRenoEstimate}
          expectedPrice={calc.resale.expectedPrice}
          onExpectedPriceChange={(v) => calc.updateResale("expectedPrice", v)}
          renovationMonths={calc.holding.renovationMonths}
          onRenovationMonthsChange={(v) => calc.updateHolding("renovationMonths", v)}
          cashPurchase={calc.acq.cashPurchase}
          onCashPurchaseChange={(v) => calc.updateAcq("cashPurchase", v)}
          isMobile={isMobile}
        />
      </Card>

      <SectionDivider label="Your Results" />
      <ProfitSummary
        dealScore={calc.dealScore}
        allInCost={calc.allInCost}
        netProfit={calc.netProfit}
        roi={calc.roi}
        annualizedRoi={calc.annualizedRoi}
        cashInvested={calc.cashInvested}
        returnOnCash={calc.returnOnCash}
        renovationMonths={calc.holding.renovationMonths}
        isMobile={isMobile}
      />

      <SectionDivider label="What If?" />
      <ROIResults
        sensResaleAdj={calc.sensResaleAdj}
        onSensResaleAdj={calc.setSensResaleAdj}
        sensRenoAdj={calc.sensRenoAdj}
        onSensRenoAdj={calc.setSensRenoAdj}
        sensHoldAdj={calc.sensHoldAdj}
        onSensHoldAdj={calc.setSensHoldAdj}
        sensCalc={calc.sensCalc}
        isMobile={isMobile}
      />

      <SectionDivider label="Shop This Renovation" />
      <MaterialBreakdown rooms={calc.rooms} prop={calc.prop} mode={calc.mode} isMobile={isMobile} />

      <Card title="" subtitle="Auto-applied smart defaults: Transfer duty auto-calculated, Bond rate at prime+1%, Agent commission 5%, Attorney fees R 45,000, Monthly holding ~R 6,450/mo. Switch to Advanced Mode for full control." style={{ background: theme.input, borderColor: theme.inputBorder }}>
        <div style={{ textAlign: "center" }}>
          <CTAButton label="Switch to Advanced Mode" onClick={() => { calc.setMode("advanced"); setStep(0); }} primary={false} isMobile={isMobile} />
        </div>
      </Card>
    </div>
  );

  // ─── ADVANCED STEP CONTENT ───
  const renderStep = () => {
    switch (step) {
      case 0: return <AcquisitionStep acq={calc.acq} updateAcq={calc.updateAcq} transferDuty={calc.transferDuty} totalAcquisition={calc.totalAcquisition} isMobile={isMobile} />;
      case 1: return <PropertyStep prop={calc.prop} updateProp={calc.updateProp} isMobile={isMobile} />;
      case 2: return <RoomsStep rooms={calc.rooms} updateRoom={calc.updateRoom} removeRoom={calc.removeRoom} addRoom={calc.addRoom} isMobile={isMobile} />;
      case 3: return <ContractorPanel contractors={calc.contractors} setContractors={calc.setContractors} rooms={calc.rooms} isMobile={isMobile} />;
      case 4: return <CostDatabase costDb={calc.costDb} updateCostItem={calc.updateCostItem} pmPct={calc.pmPct} setPmPct={calc.setPmPct} contingencyPct={calc.contingencyPct} setContingencyPct={calc.setContingencyPct} totalRoomMaterialCost={calc.totalRoomMaterialCost} contractorLabour={calc.contractorLabour} fixedCosts={calc.fixedCosts} pmCost={calc.pmCost} contingency={calc.contingency} totalRenovation={calc.totalRenovation} renoCostPerSqm={calc.renoCostPerSqm} isMobile={isMobile} />;
      case 5: return <HoldingStep holding={calc.holding} updateHolding={calc.updateHolding} acq={calc.acq} monthlyBondInterest={calc.monthlyBondInterest} monthlyHoldingTotal={calc.monthlyHoldingTotal} totalHoldingCost={calc.totalHoldingCost} holdingTimeline={calc.holdingTimeline} isMobile={isMobile} />;
      case 6: return <ResaleStep resale={calc.resale} updateResale={calc.updateResale} prop={calc.prop} allInCost={calc.allInCost} agentComm={calc.agentComm} grossProfit={calc.grossProfit} netProfit={calc.netProfit} profitPerSqm={calc.profitPerSqm} roi={calc.roi} annualizedRoi={calc.annualizedRoi} returnOnCash={calc.returnOnCash} cashInvested={calc.cashInvested} breakEvenResale={calc.breakEvenResale} dealScore={calc.dealScore} totalAcquisition={calc.totalAcquisition} totalRenovation={calc.totalRenovation} totalHoldingCost={calc.totalHoldingCost} holding={calc.holding} transferDuty={calc.transferDuty} isMobile={isMobile} />;
      case 7: return <MaterialBreakdown rooms={calc.rooms} prop={calc.prop} mode={calc.mode} isMobile={isMobile} />;
      case 8: return <ScenarioLab baseInputs={{ totalRenovation: calc.totalRenovation, monthlyHoldingTotal: calc.monthlyHoldingTotal, renovationMonths: calc.holding.renovationMonths, totalAcquisition: calc.totalAcquisition, expectedPrice: calc.resale.expectedPrice, agentCommission: calc.resale.agentCommission }} customScenarios={calc.customScenarios} setCustomScenarios={calc.setCustomScenarios} profiles={profiles} scenarioTab={calc.scenarioTab} setScenarioTab={calc.setScenarioTab} sensResaleAdj={calc.sensResaleAdj} setSensResaleAdj={calc.setSensResaleAdj} sensRenoAdj={calc.sensRenoAdj} setSensRenoAdj={calc.setSensRenoAdj} sensHoldAdj={calc.sensHoldAdj} setSensHoldAdj={calc.setSensHoldAdj} sensCalc={calc.sensCalc} isMobile={isMobile} />;
      case 9: return <ExpensesStep profileId={activeProfileId} isMobile={isMobile} />;
      case 10: return <SummaryStep acq={calc.acq} holding={calc.holding} resale={calc.resale} prop={calc.prop} transferDuty={calc.transferDuty} allInCost={calc.allInCost} agentComm={calc.agentComm} netProfit={calc.netProfit} grossProfit={calc.grossProfit} roi={calc.roi} annualizedRoi={calc.annualizedRoi} returnOnCash={calc.returnOnCash} cashInvested={calc.cashInvested} breakEvenResale={calc.breakEvenResale} renoCostPerSqm={calc.renoCostPerSqm} dealScore={calc.dealScore} totalAcquisition={calc.totalAcquisition} totalRenovation={calc.totalRenovation} totalHoldingCost={calc.totalHoldingCost} totalRoomMaterialCost={calc.totalRoomMaterialCost} contractorLabour={calc.contractorLabour} fixedCosts={calc.fixedCosts} pmCost={calc.pmCost} contingency={calc.contingency} roomCosts={calc.roomCosts} contractors={calc.contractors} resetAll={resetAll} isMobile={isMobile} />;
      default: return null;
    }
  };

  // ─── STANDALONE VIEWS (rendered as tabs from deal detail page) ───
  if (view === "contractors") {
    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 840, margin: "0 auto" }}>
        <ContractorPanel contractors={calc.contractors} setContractors={calc.setContractors} rooms={calc.rooms} isMobile={isMobile} />
      </div>
    );
  }

  if (view === "suppliers") {
    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 840, margin: "0 auto" }}>
        <MaterialBreakdown rooms={calc.rooms} prop={calc.prop} mode={calc.mode} isMobile={isMobile} />
      </div>
    );
  }

  if (calc.mode === "quick") {
    return (
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
        <Header subtitle="Quick Estimate" />
        <MobileMenu />
        <div style={{ padding: isMobile ? "16px 12px 100px" : "24px 24px 48px" }}>
          {renderQuickMode()}
        </div>
        <MobileFooter />
        <Toast message={toastMsg} visible={toastVisible} />
      </div>
    );
  }

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <Header subtitle="Advanced Calculator" />
      <MobileMenu />
      <div style={{ height: 3, background: theme.inputBorder }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: theme.accent, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ padding: isMobile ? "8px 8px" : "10px 24px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? theme.accent : "transparent",
            color: step === i ? "#000" : i < step ? theme.text : theme.textDim,
            border: `1px solid ${step === i ? theme.accent : theme.cardBorder}`, borderRadius: 8,
            padding: isMobile ? "8px 12px" : "8px 14px", fontSize: 12, fontWeight: step === i ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0, minHeight: 40,
          }}>{isMobile ? STEP_SHORT[i] : `${i + 1}. ${s}`}</button>
        ))}
      </div>
      <div ref={contentRef} style={{ maxWidth: 840, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" }}>
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 300, marginBottom: 20, color: theme.text }}>
          <span style={{ color: theme.accent, fontWeight: 700 }}>{step + 1}</span>
          <span style={{ color: theme.textDim, margin: "0 8px" }}>/</span>
          {STEPS[step]}
        </h2>
        {renderStep()}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingBottom: isMobile ? 80 : 48, gap: 12 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{
            background: "transparent", border: `1px solid ${theme.cardBorder}`,
            color: step === 0 ? theme.textDim : theme.text, borderRadius: 10,
            padding: "12px 24px", fontSize: 14, cursor: step === 0 ? "default" : "pointer", minHeight: 44,
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
      <MobileFooter />
      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
