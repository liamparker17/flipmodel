"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
  red: "#EF4444",
  green: "#22C55E",
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created, but sign-in failed. Please go to login.");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

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

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        padding: 32,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
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
        <h1 style={{ color: theme.text, fontSize: 20, fontWeight: 600, margin: 0 }}>
          Create your account
        </h1>
        <p style={{ color: theme.textDim, fontSize: 13, marginTop: 6 }}>
          Start tracking your property flips
        </p>
      </div>

      {error && (
        <div
          style={{
            background: `${theme.red}15`,
            border: `1px solid ${theme.red}30`,
            borderRadius: 8,
            padding: "10px 14px",
            color: theme.red,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Company name{" "}
            <span style={{ color: theme.textDim, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your Property Co."
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            background: theme.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          color: theme.textDim,
          fontSize: 13,
          marginTop: 20,
          marginBottom: 0,
        }}
      >
        Already have an account?{" "}
        <a
          href="/login"
          style={{ color: theme.accent, textDecoration: "none", fontWeight: 500 }}
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
