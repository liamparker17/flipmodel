"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { theme } from "../../components/theme";
import { api } from "@/lib/client-fetch";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 32, textAlign: "center", color: theme.textDim, fontSize: 13 }}>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingOrg, setCheckingOrg] = useState(true);

  useEffect(() => {
    fetch("/api/org")
      .then((res) => {
        if (res.ok) {
          window.location.href = "/dashboard";
          return;
        }
        setCheckingOrg(false);
      })
      .catch(() => setCheckingOrg(false));
  }, []);

  const handleSubmit = async (name: string) => {
    setSaving(true);
    setError("");
    try {
      const trimmed = name.trim() || "My Company";
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      try {
        await api("/api/org", {
          method: "POST",
          body: JSON.stringify({ name: trimmed, slug }),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("already belong")) {
          throw new Error(msg || "Failed to create organisation");
        }
      }

      await api("/api/org/migrate", { method: "POST" }).catch(() => {});
      await api("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ onboardingComplete: true }),
      }).catch(() => {});

      window.location.href = "/dashboard";
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    }
  };

  if (checkingOrg) {
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 32, textAlign: "center", color: theme.textDim, fontSize: 13 }}>
        Checking account...
      </div>
    );
  }

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: 12,
      padding: 32,
      maxWidth: 400,
      margin: "0 auto",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, background: theme.accent, borderRadius: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16,
        }}>
          JH
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.text, margin: "0 0 4px" }}>
          Welcome to JustHouses
        </h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>
          What&apos;s your company called?
        </p>
      </div>

      {/* Company name input */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. JustHouses Properties"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && companyName.trim()) handleSubmit(companyName); }}
          style={{
            width: "100%", padding: "12px 14px",
            background: theme.input, border: `1px solid ${theme.inputBorder}`,
            borderRadius: 8, color: theme.text, fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && (
        <div style={{
          background: "#EF444415", border: "1px solid #EF444430",
          borderRadius: 8, padding: "10px 14px", color: "#EF4444",
          fontSize: 13, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Get Started button */}
      <button
        onClick={() => handleSubmit(companyName)}
        disabled={saving || !companyName.trim()}
        style={{
          width: "100%", padding: "12px 20px", borderRadius: 8,
          fontSize: 14, fontWeight: 600, border: "none",
          background: theme.accent, color: "#fff",
          cursor: saving || !companyName.trim() ? "not-allowed" : "pointer",
          opacity: saving || !companyName.trim() ? 0.6 : 1,
          marginBottom: 12,
        }}
      >
        {saving ? "Setting up..." : "Get Started"}
      </button>

      {/* Skip link */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => handleSubmit("My Company")}
          disabled={saving}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 12, cursor: "pointer", textDecoration: "underline",
          }}
        >
          Skip — I&apos;ll set this up later
        </button>
      </div>

      {/* Sign out link */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={() => { window.location.href = "/api/auth/signout"; }}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 11, cursor: "pointer", textDecoration: "underline",
          }}
        >
          Sign in as a different user
        </button>
      </div>
    </div>
  );
}
