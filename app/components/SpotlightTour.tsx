"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

interface SpotlightTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 4;

export default function SpotlightTour({ steps, onComplete, onSkip }: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    let idx = currentStep;
    while (idx < steps.length) {
      const el = document.querySelector(steps[idx].selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
        });
        if (idx !== currentStep) setCurrentStep(idx);
        return;
      }
      idx++;
    }
    // No valid targets left — complete
    onComplete();
  }, [currentStep, steps, onComplete]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const goNext = () => {
    if (currentStep >= steps.length - 1) {
      onComplete();
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setTransitioning(false);
    }, 200);
  };

  if (!targetRect) return null;

  const step = steps[currentStep];
  const isLast = currentStep >= steps.length - 1;

  // Compute tooltip position
  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9002,
    background: "#12151C",
    border: "1px solid #1C2030",
    borderRadius: 8,
    padding: "16px 20px",
    width: 280,
    transition: "top 0.3s ease, left 0.3s ease, opacity 0.2s ease",
    opacity: transitioning ? 0 : 1,
  };

  switch (step.position) {
    case "right":
      tooltipStyle.top = targetRect.top;
      tooltipStyle.left = targetRect.left + targetRect.width + 12;
      break;
    case "left":
      tooltipStyle.top = targetRect.top;
      tooltipStyle.left = targetRect.left - 280 - 12;
      break;
    case "bottom":
      tooltipStyle.top = targetRect.top + targetRect.height + 12;
      tooltipStyle.left = targetRect.left;
      break;
    case "top":
      tooltipStyle.top = targetRect.top - 12;
      tooltipStyle.left = targetRect.left;
      tooltipStyle.transform = "translateY(-100%)";
      break;
  }

  // Large box-shadow approach: transparent center, dark spread
  const cutoutStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9001,
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
    borderRadius: 6,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
    transition: "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
    pointerEvents: "none",
  };

  return (
    <>
      {/* Overlay — catches clicks outside the cutout */}
      <div
        onClick={onSkip}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          cursor: "default",
        }}
      />

      {/* Cutout spotlight */}
      <div style={cutoutStyle} />

      {/* Tooltip */}
      <div ref={tooltipRef} style={tooltipStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E4E9", marginBottom: 6 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, marginBottom: 14 }}>
          {step.description}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12 }}>
          Step {currentStep + 1} of {steps.length}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#6B7280",
              fontSize: 11,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Skip tour
          </button>
          <button
            onClick={goNext}
            style={{
              background: "#3B82F6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isLast ? "Get Started" : "Next \u2192"}
          </button>
        </div>
      </div>
    </>
  );
}
