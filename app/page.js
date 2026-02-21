"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme, CTAButton } from "./components/theme";

export default function LandingPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "'Outfit', 'Segoe UI', sans-serif" }}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: isMobile ? "48px 20px 40px" : "80px 40px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: theme.accentDim, borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>JH</div>
            <span style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>JustHouses ERP</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 28 : 42, fontWeight: 700, color: theme.text, lineHeight: 1.2, margin: "0 0 20px" }}>
            Estimate Property Flip Profitability{" "}
            <span style={{ color: theme.accent }}>in Minutes</span>
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: theme.textDim, lineHeight: 1.7, margin: "0 auto 36px", maxWidth: 560 }}>
            Input purchase price, renovation and holding costs to see your projected profit and ROI — built for South African property investors.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <CTAButton label="Go to Dashboard" onClick={() => router.push("/dashboard")} isMobile={isMobile} />
            <CTAButton label="View Pipeline" onClick={() => router.push("/pipeline")} primary={false} isMobile={isMobile} />
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
              { icon: "$", title: "Profit & Scenarios", desc: "Net profit, ROI, annualized returns, deal score, scenario lab, expenses tracking, and sensitivity sliders." },
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
              "I used to spend hours in spreadsheets trying to model my property flips. JustHouses gives me a clear picture of profitability in minutes — the sensitivity analysis alone has saved me from two bad deals."
            </p>
            <div style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>— SA Property Investor</div>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: isMobile ? "24px 20px 48px" : "32px 40px 60px", borderTop: `1px solid ${theme.cardBorder}` }}>
          <p style={{ fontSize: 15, color: theme.textDim, marginBottom: 20 }}>Ready to evaluate your next flip?</p>
          <CTAButton label="Go to Dashboard" onClick={() => router.push("/dashboard")} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}
