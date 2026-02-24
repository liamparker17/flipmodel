"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { theme } from "../../components/theme";

const STEPS = [
  "Company Profile",
  "Team Setup",
  "Preferences",
  "Bookkeeping",
  "Import or Start Fresh",
  "Quick Tour",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: theme.input,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 8,
  color: theme.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: theme.textDim,
  fontSize: 12,
  marginBottom: 6,
  fontWeight: 500,
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 32, textAlign: "center", color: theme.textDim, fontSize: 13 }}>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 - Company Profile
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");

  // Step 2 - Team Setup
  const [inviteEmails, setInviteEmails] = useState("");

  // Step 3 - Preferences
  const [commissionPct, setCommissionPct] = useState("5");
  const [contingencyPct, setContingencyPct] = useState("10");
  const [bondRatePct, setBondRatePct] = useState("12.75");

  // Step 4 - Bookkeeping
  const [accountingProviders, setAccountingProviders] = useState<{ xero: boolean; quickbooks: boolean }>({ xero: false, quickbooks: false });
  const [accountingChoice, setAccountingChoice] = useState<"none" | "xero" | "quickbooks" | "manual">("none");
  const [accountingLoading, setAccountingLoading] = useState(true);
  const [accountingConnected, setAccountingConnected] = useState(false);

  // Check which accounting providers are configured & detect OAuth return
  useEffect(() => {
    fetch("/api/accounting")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) setAccountingProviders(data.providers);
        if (data.connection?.status === "connected") {
          setAccountingConnected(true);
          setAccountingChoice(data.connection.provider);
        }
      })
      .catch(() => {})
      .finally(() => setAccountingLoading(false));

    // If redirected back from OAuth callback with success
    const connected = searchParams.get("accounting_connected");
    if (connected) {
      setAccountingConnected(true);
      setAccountingChoice(connected as "xero" | "quickbooks");
      setStep(3); // Stay on bookkeeping step to show success
    }
  }, [searchParams]);

  const canNext = (): boolean => {
    if (step === 0) return companyName.trim().length > 0 && location.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const name = companyName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // 1. Create organisation
      const orgRes = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      if (!orgRes.ok) {
        const err = await orgRes.json().catch(() => null);
        // If user already has an org, treat as success
        if (!(err?.error && err.error.includes("already belong"))) {
          throw new Error(err?.error || "Failed to create organisation");
        }
      }

      // 2. Migrate existing data to the new org
      await fetch("/api/org/migrate", { method: "POST" }).catch(() => {});

      // 3. Save user profile preferences
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: name,
          location: location.trim(),
          inviteEmails: inviteEmails
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          preferences: {
            commissionPct: parseFloat(commissionPct) || 5,
            contingencyPct: parseFloat(contingencyPct) || 10,
            bondRatePct: parseFloat(bondRatePct) || 12.75,
          },
          onboardingComplete: true,
        }),
      });

      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
  };

  const primaryBtn: React.CSSProperties = {
    ...btnBase,
    background: theme.accent,
    color: "#fff",
  };

  const secondaryBtn: React.CSSProperties = {
    ...btnBase,
    background: "transparent",
    color: theme.text,
    border: `1px solid ${theme.cardBorder}`,
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Company Profile
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 20px" }}>
              Tell us about your property business
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. JustHouses Properties"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>City / Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Cape Town, Johannesburg, Durban"
                style={inputStyle}
              />
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Team Setup
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 20px" }}>
              Invite team members (you can do this later too)
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email Addresses (comma separated)</label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="john@example.com, sarah@example.com"
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <p style={{ color: theme.textDim, fontSize: 12, margin: 0 }}>
              Invitations will be sent once your account is fully set up.
            </p>
          </>
        );

      case 2:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Preferences
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 20px" }}>
              Set your default deal parameters (editable per deal later)
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Default Agent Commission %</label>
              <input
                type="number"
                step="0.5"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Contingency %</label>
              <input
                type="number"
                step="0.5"
                value={contingencyPct}
                onChange={(e) => setContingencyPct(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Bond Interest Rate %</label>
              <input
                type="number"
                step="0.25"
                value={bondRatePct}
                onChange={(e) => setBondRatePct(e.target.value)}
                style={inputStyle}
              />
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Connect Your Bookkeeping
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 20px" }}>
              Link your accounting software to sync contacts, invoices, and chart of accounts automatically.
            </p>

            {accountingConnected ? (
              <div style={{
                padding: "14px 16px",
                background: `${theme.green}10`,
                border: `1px solid ${theme.green}40`,
                borderRadius: 8,
                marginBottom: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.green }} />
                  <span style={{ fontSize: 13, color: theme.text, fontWeight: 600, textTransform: "capitalize" }}>
                    {accountingChoice} Connected
                  </span>
                </div>
                <p style={{ fontSize: 12, color: theme.textDim, margin: "6px 0 0" }}>
                  Your bookkeeping is linked. You can sync data and manage settings later.
                </p>
              </div>
            ) : accountingLoading ? (
              <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 14px" }}>
                Checking available integrations...
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                <button
                  disabled={!accountingProviders.xero}
                  onClick={() => {
                    setAccountingChoice("xero");
                    window.location.href = "/api/accounting/xero/connect?returnTo=onboarding";
                  }}
                  style={{
                    ...secondaryBtn,
                    width: "100%",
                    padding: "14px 20px",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: accountingProviders.xero ? "transparent" : theme.input,
                    borderColor: accountingProviders.xero ? "#13B5EA" : theme.inputBorder,
                    cursor: accountingProviders.xero ? "pointer" : "not-allowed",
                    opacity: accountingProviders.xero ? 1 : 0.5,
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "#13B5EA20",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#13B5EA", flexShrink: 0,
                  }}>
                    X
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, marginBottom: 2, color: theme.text }}>
                      {accountingProviders.xero ? "Connect Xero" : "Xero (Not Configured)"}
                    </span>
                    <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 400 }}>
                      Popular in South Africa, Australia &amp; NZ
                    </span>
                  </span>
                </button>

                <button
                  disabled={!accountingProviders.quickbooks}
                  onClick={() => {
                    setAccountingChoice("quickbooks");
                    window.location.href = "/api/accounting/quickbooks/connect?returnTo=onboarding";
                  }}
                  style={{
                    ...secondaryBtn,
                    width: "100%",
                    padding: "14px 20px",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: accountingProviders.quickbooks ? "transparent" : theme.input,
                    borderColor: accountingProviders.quickbooks ? "#2CA01C" : theme.inputBorder,
                    cursor: accountingProviders.quickbooks ? "pointer" : "not-allowed",
                    opacity: accountingProviders.quickbooks ? 1 : 0.5,
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "#2CA01C20",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#2CA01C", flexShrink: 0,
                  }}>
                    QB
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, marginBottom: 2, color: theme.text }}>
                      {accountingProviders.quickbooks ? "Connect QuickBooks" : "QuickBooks (Not Configured)"}
                    </span>
                    <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 400 }}>
                      Widely used for small business accounting
                    </span>
                  </span>
                </button>

                <button
                  onClick={async () => {
                    setAccountingChoice("manual");
                    try {
                      await fetch("/api/accounting", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ provider: "manual" }),
                      });
                      setAccountingConnected(true);
                    } catch { /* ignore - they can set up later */ }
                  }}
                  style={{
                    ...secondaryBtn,
                    width: "100%",
                    padding: "14px 20px",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${theme.accent}20`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: theme.accent, flexShrink: 0,
                  }}>
                    #
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, marginBottom: 2, color: theme.text }}>
                      Manual Accounting
                    </span>
                    <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 400 }}>
                      Track expenses and invoices without external software
                    </span>
                  </span>
                </button>
              </div>
            )}

            {(!accountingProviders.xero && !accountingProviders.quickbooks) && !accountingLoading && (
              <p style={{ fontSize: 10, color: theme.textDim, margin: "0 0 8px", lineHeight: 1.6 }}>
                To enable Xero or QuickBooks, add the API credentials to your environment variables.
              </p>
            )}

            <p style={{ fontSize: 12, color: theme.textDim, margin: "4px 0 0" }}>
              You can connect or change your bookkeeping software later in Settings.
            </p>
          </>
        );

      case 4:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              Get Started
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 24px" }}>
              Would you like to import existing deal data or start fresh?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => alert("Import feature coming soon")}
                style={{
                  ...secondaryBtn,
                  width: "100%",
                  padding: "14px 20px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${theme.accent}20`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  &#8593;
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>
                    Import existing data
                  </span>
                  <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 400 }}>
                    Upload a spreadsheet of past deals
                  </span>
                </span>
              </button>
              <button
                onClick={() => setStep(5)}
                style={{
                  ...secondaryBtn,
                  width: "100%",
                  padding: "14px 20px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderColor: theme.green,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${theme.green}20`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  &#10003;
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>
                    Start fresh
                  </span>
                  <span style={{ fontSize: 12, color: theme.textDim, fontWeight: 400 }}>
                    Begin with a clean slate
                  </span>
                </span>
              </button>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              You&apos;re all set!
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 16px" }}>
              Here&apos;s everything you can do with JustHouses
            </p>

            {/* Scrollable feature list */}
            <div style={{ maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
              {[
                { title: "Dashboard", desc: "Portfolio KPIs, cash flow projections, budget alerts, and deal velocity at a glance." },
                { title: "Deal Pipeline", desc: "Kanban board to track properties from lead sourcing through to sale." },
                { title: "Projects & Renovations", desc: "Manage renovation scopes, milestones, tasks, and timelines per property." },
                { title: "Finance & Expenses", desc: "Track actual vs projected costs, sign-off workflows, and payment methods." },
                { title: "Invoicing", desc: "Create, send, and track invoices with line items and payment status." },
                { title: "Contacts", desc: "Manage agents, attorneys, contractors, and buyers in one place." },
                { title: "Contractors", desc: "Assign work, track daily rates, and manage payments to your contractors." },
                { title: "Suppliers & Shopping Lists", desc: "Build material lists, compare supplier prices, and print shopping lists." },
                { title: "Documents", desc: "Upload and organise documents per deal — offers, plans, invoices, and more." },
                { title: "Tool Locker", desc: "Track equipment checkout, returns, maintenance logs, and incidents." },
                { title: "Listings", desc: "Manage property listings and track listing status through to sold." },
                { title: "Bookkeeping", desc: "Sync with Xero or QuickBooks for chart of accounts, contacts, and invoices." },
                { title: "Team & Roles", desc: "Invite members, assign roles, and control access with granular permissions." },
                { title: "Reports & Analytics", desc: "Portfolio performance, profit analysis, ROI tracking, and trend insights." },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 8,
                    padding: "8px 10px",
                    background: theme.input,
                    borderRadius: 8,
                    border: `1px solid ${theme.inputBorder}`,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: `${theme.green}20`,
                      color: theme.green,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span
                      style={{ display: "block", color: theme.text, fontSize: 12, fontWeight: 600, marginBottom: 1 }}
                    >
                      {feature.title}
                    </span>
                    <span style={{ color: theme.textDim, fontSize: 11, lineHeight: 1.4 }}>{feature.desc}</span>
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                ...primaryBtn,
                width: "100%",
                marginTop: 12,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Go to Dashboard"}
            </button>
          </>
        );
    }
  };

  const showNav = step !== 4 && step !== 5;

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        padding: 32,
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: theme.accent,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          JH
        </div>
      </div>

      {/* Step dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? theme.accent : i < step ? theme.green : theme.inputBorder,
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      {showNav && (
        <div
          style={{
            display: "flex",
            justifyContent: step === 0 ? "flex-end" : "space-between",
            marginTop: 24,
          }}
        >
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={secondaryBtn}>
              Back
            </button>
          )}
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            style={{
              ...primaryBtn,
              opacity: canNext() ? 1 : 0.5,
              cursor: canNext() ? "pointer" : "not-allowed",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
