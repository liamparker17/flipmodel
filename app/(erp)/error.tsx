"use client";

import { useEffect } from "react";

export default function ErpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ERP Error]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: 40,
        textAlign: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#EF444415",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 24,
        }}
      >
        !
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#E5E7EB",
          margin: "0 0 8px",
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#9CA3AF",
          margin: "0 0 24px",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        An unexpected error occurred while loading this page. You can try again
        or navigate to a different section.
      </p>
      {error.digest && (
        <p
          style={{
            fontSize: 11,
            color: "#6B7280",
            margin: "0 0 20px",
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          background: "#F0C674",
          color: "#000",
          border: "none",
          borderRadius: 6,
          padding: "10px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 40,
        }}
      >
        Try again
      </button>
    </div>
  );
}
