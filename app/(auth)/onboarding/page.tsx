"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const theme = {
  bg: "#0B0E13",
  card: "#12151C",
  cardBorder: "#1C2030",
  accent: "#3B82F6",
  text: "#E2E4E9",
  textDim: "#6B7280",
  input: "#161A24",
  inputBorder: "#252B3B",
  green: "#22C55E",
};

const STEPS = [
  "Company Profile",
  "Team Setup",
  "Preferences",
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
  const router = useRouter();
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

  const canNext = (): boolean => {
    if (step === 0) return companyName.trim().length > 0 && location.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
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
                onClick={() => setStep(4)}
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

      case 4:
        return (
          <>
            <h2 style={{ color: theme.text, fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>
              You&apos;re all set!
            </h2>
            <p style={{ color: theme.textDim, fontSize: 13, margin: "0 0 20px" }}>
              Here&apos;s a quick overview of what you can do with JustHouses
            </p>
            {[
              { title: "Deal Pipeline", desc: "Track properties from sourcing to sale with full financials." },
              { title: "Renovation Tracker", desc: "Manage scopes, contractors, and costs per property." },
              { title: "Contact Management", desc: "Keep agents, attorneys, and contractors organised." },
              { title: "Financial Reports", desc: "See profit, ROI, and cash flow across your portfolio." },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 14,
                  padding: "10px 12px",
                  background: theme.input,
                  borderRadius: 8,
                  border: `1px solid ${theme.inputBorder}`,
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: `${theme.green}20`,
                    color: theme.green,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>
                  <span
                    style={{ display: "block", color: theme.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}
                  >
                    {feature.title}
                  </span>
                  <span style={{ color: theme.textDim, fontSize: 12 }}>{feature.desc}</span>
                </span>
              </div>
            ))}
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                ...primaryBtn,
                width: "100%",
                marginTop: 8,
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

  const showNav = step !== 3 && step !== 4;

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
