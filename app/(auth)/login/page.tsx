"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

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
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.code === "credentials" ? "Invalid email or password" : `Auth error: ${result.error} (${result.code || "unknown"})`);
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
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
          Sign in to JustHouses
        </h1>
        <p style={{ color: theme.textDim, fontSize: 13, marginTop: 6 }}>
          Property flip ERP for South African investors
        </p>
      </div>

      {error && (
        <div
          role="alert"
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
            htmlFor="login-email"
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-required="true"
            aria-invalid={error ? "true" : undefined}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="login-password"
            style={{ display: "block", color: theme.textDim, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            aria-required="true"
            aria-invalid={error ? "true" : undefined}
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "20px 0",
        }}
      >
        <div style={{ flex: 1, height: 1, background: theme.cardBorder }} />
        <span style={{ color: theme.textDim, fontSize: 12 }}>or</span>
        <div style={{ flex: 1, height: 1, background: theme.cardBorder }} />
      </div>

      <button
        onClick={handleGoogleSignIn}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "transparent",
          color: theme.text,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <p
        style={{
          textAlign: "center",
          color: theme.textDim,
          fontSize: 13,
          marginTop: 20,
          marginBottom: 0,
        }}
      >
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          style={{ color: theme.accent, textDecoration: "none", fontWeight: 500 }}
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
