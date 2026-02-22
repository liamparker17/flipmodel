"use client";
import AppLayout from "../components/layout/AppLayout";
import CommandPalette from "../components/CommandPalette";
import type { ReactNode } from "react";

export default function ErpLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      {children}
      <CommandPalette />
    </AppLayout>
  );
}
