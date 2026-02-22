"use client";
import { useState, useEffect, useCallback } from "react";
import type {
  Tool,
  ToolCheckout,
  ToolMaintenanceEntry,
  ToolIncident,
  ToolLockerData,
  ToolCategoryKey,
  ToolStatus,
  ToolCondition,
} from "../types/tool";
import { TOOL_CATEGORY_DEFAULTS } from "../types/tool";

const STORAGE_KEY = "justhousesErp_toolLocker";

function defaultData(): ToolLockerData {
  return { tools: [], checkouts: [], maintenance: [], incidents: [] };
}

function loadFromStorage(): ToolLockerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tools: parsed.tools || [],
        checkouts: parsed.checkouts || [],
        maintenance: parsed.maintenance || [],
        incidents: parsed.incidents || [],
      };
    }
  } catch { /* ignore */ }
  return defaultData();
}

function saveToStorage(data: ToolLockerData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Mock Data ───
const MOCK_DATA: ToolLockerData = {
  tools: [
    {
      id: "tool_1", name: "Makita Angle Grinder #1", category: "angle_grinder",
      brand: "Makita", model: "GA5030", serialNumber: "MAK-AG-2024-001",
      purchaseDate: "2024-08-15", purchaseCost: 1150, expectedLifespanMonths: 18, replacementCost: 1200,
      status: "checked_out", condition: "good",
      currentHolderType: "contractor", currentHolderName: "Thabo Mokoena",
      currentDealId: "deal_demo_3", currentDealName: "8 Protea Close",
      createdAt: "2024-08-15T10:00:00Z", updatedAt: "2026-02-10T08:00:00Z",
    },
    {
      id: "tool_2", name: "Bosch Circular Saw", category: "circular_saw",
      brand: "Bosch", model: "GKS 190", serialNumber: "BOS-CS-2024-001",
      purchaseDate: "2024-06-01", purchaseCost: 2400, expectedLifespanMonths: 24, replacementCost: 2500,
      status: "available", condition: "good",
      createdAt: "2024-06-01T10:00:00Z", updatedAt: "2026-01-20T10:00:00Z",
    },
    {
      id: "tool_3", name: "DeWalt Impact Driver", category: "impact_driver",
      brand: "DeWalt", model: "DCF887", serialNumber: "DEW-ID-2025-001",
      purchaseDate: "2025-03-10", purchaseCost: 2100, expectedLifespanMonths: 30, replacementCost: 2200,
      status: "checked_out", condition: "excellent",
      currentHolderType: "contractor", currentHolderName: "Johan Coetzee",
      currentDealId: "deal_demo_1", currentDealName: "32 Jacaranda Rd",
      createdAt: "2025-03-10T10:00:00Z", updatedAt: "2026-02-15T08:00:00Z",
    },
    {
      id: "tool_4", name: "Makita Drill #1", category: "drill",
      brand: "Makita", model: "HP333D", serialNumber: "MAK-DR-2024-001",
      purchaseDate: "2024-04-20", purchaseCost: 1700, expectedLifespanMonths: 36, replacementCost: 1800,
      status: "available", condition: "fair",
      createdAt: "2024-04-20T10:00:00Z", updatedAt: "2026-01-10T10:00:00Z",
    },
    {
      id: "tool_5", name: "Ryobi Sander", category: "sander",
      brand: "Ryobi", model: "ROS300A", serialNumber: "RYO-SA-2025-001",
      purchaseDate: "2025-01-15", purchaseCost: 850, expectedLifespanMonths: 18, replacementCost: 900,
      status: "checked_out", condition: "good",
      currentHolderType: "contractor", currentHolderName: "Pieter van Wyk",
      currentDealId: "deal_demo_3", currentDealName: "8 Protea Close",
      createdAt: "2025-01-15T10:00:00Z", updatedAt: "2026-02-12T08:00:00Z",
    },
    {
      id: "tool_6", name: "Tile Cutter 600mm", category: "tile_cutter",
      brand: "Rubi", model: "SPEED-62", serialNumber: "RUB-TC-2024-001",
      purchaseDate: "2024-09-01", purchaseCost: 3200, expectedLifespanMonths: 24, replacementCost: 3500,
      status: "maintenance", condition: "fair",
      notes: "Blade needs replacement, scoring wheel worn",
      createdAt: "2024-09-01T10:00:00Z", updatedAt: "2026-02-18T10:00:00Z",
    },
    {
      id: "tool_7", name: "Extension Ladder 6m", category: "ladder",
      brand: "Zarges", model: "Trade 3-Part", serialNumber: "ZAR-LA-2023-001",
      purchaseDate: "2023-06-01", purchaseCost: 1800, expectedLifespanMonths: 60, replacementCost: 2000,
      status: "available", condition: "good",
      createdAt: "2023-06-01T10:00:00Z", updatedAt: "2025-12-01T10:00:00Z",
    },
    {
      id: "tool_8", name: "Makita Angle Grinder #2", category: "angle_grinder",
      brand: "Makita", model: "GA5030", serialNumber: "MAK-AG-2025-002",
      purchaseDate: "2025-06-01", purchaseCost: 1200, expectedLifespanMonths: 18, replacementCost: 1200,
      status: "lost", condition: "good",
      notes: "Lost on site at 8 Protea Close — incident reported",
      createdAt: "2025-06-01T10:00:00Z", updatedAt: "2026-01-25T10:00:00Z",
    },
    {
      id: "tool_9", name: "Bosch Demolition Hammer", category: "demolition_hammer",
      brand: "Bosch", model: "GSH 11 VC", serialNumber: "BOS-DH-2024-001",
      purchaseDate: "2024-03-01", purchaseCost: 5200, expectedLifespanMonths: 18, replacementCost: 5500,
      status: "available", condition: "fair",
      createdAt: "2024-03-01T10:00:00Z", updatedAt: "2026-02-01T10:00:00Z",
    },
    {
      id: "tool_10", name: "Paint Sprayer HVLP", category: "paint_sprayer",
      brand: "Wagner", model: "Control Pro 250M", serialNumber: "WAG-PS-2025-001",
      purchaseDate: "2025-07-01", purchaseCost: 3400, expectedLifespanMonths: 24, replacementCost: 3500,
      status: "available", condition: "excellent",
      createdAt: "2025-07-01T10:00:00Z", updatedAt: "2025-12-15T10:00:00Z",
    },
  ],
  checkouts: [
    {
      id: "co_1", toolId: "tool_1", contractorName: "Thabo Mokoena",
      dealId: "deal_demo_3", dealName: "8 Protea Close", propertyAddress: "8 Protea Close, Claremont",
      checkedOutAt: "2026-02-10T08:00:00Z", expectedReturnDate: "2026-03-10",
      conditionOut: "good", notes: "For cutting tiles in bathroom reno",
    },
    {
      id: "co_2", toolId: "tool_3", contractorName: "Johan Coetzee",
      dealId: "deal_demo_1", dealName: "32 Jacaranda Rd", propertyAddress: "32 Jacaranda Rd, Pinelands",
      checkedOutAt: "2026-02-15T08:00:00Z", expectedReturnDate: "2026-03-01",
      conditionOut: "excellent",
    },
    {
      id: "co_3", toolId: "tool_5", contractorName: "Pieter van Wyk",
      dealId: "deal_demo_3", dealName: "8 Protea Close", propertyAddress: "8 Protea Close, Claremont",
      checkedOutAt: "2026-02-12T08:00:00Z", expectedReturnDate: "2026-02-28",
      conditionOut: "good", notes: "Sanding bedroom doors and frames",
    },
    {
      id: "co_4", toolId: "tool_2", contractorName: "Thabo Mokoena",
      dealId: "deal_demo_3", dealName: "8 Protea Close", propertyAddress: "8 Protea Close, Claremont",
      checkedOutAt: "2026-01-05T08:00:00Z", returnedAt: "2026-01-20T16:00:00Z",
      conditionOut: "good", conditionIn: "good", notes: "Used for framing kitchen wall",
    },
    {
      id: "co_5", toolId: "tool_9", contractorName: "Johan Coetzee",
      dealId: "deal_demo_1", dealName: "32 Jacaranda Rd", propertyAddress: "32 Jacaranda Rd, Pinelands",
      checkedOutAt: "2025-12-01T08:00:00Z", returnedAt: "2025-12-20T16:00:00Z",
      conditionOut: "good", conditionIn: "fair", notes: "Heavy demo work on bathroom walls",
    },
  ],
  maintenance: [
    {
      id: "mt_1", toolId: "tool_6", date: "2026-02-18", type: "blade_change",
      description: "Scoring wheel and blade replacement needed — tool currently out of service",
      cost: 450, performedBy: "self",
    },
    {
      id: "mt_2", toolId: "tool_9", date: "2025-12-22", type: "service",
      description: "Full service after heavy demo use — replaced carbon brushes, greased bearings",
      cost: 600, performedBy: "Bosch Service Centre",
    },
    {
      id: "mt_3", toolId: "tool_4", date: "2025-11-15", type: "repair",
      description: "Chuck replaced — was slipping under load",
      cost: 350, performedBy: "self",
    },
    {
      id: "mt_4", toolId: "tool_1", date: "2025-09-10", type: "service",
      description: "Routine service — cleaned vents, checked disc guard",
      cost: 150, performedBy: "self",
    },
  ],
  incidents: [
    {
      id: "inc_1", toolId: "tool_8", date: "2026-01-20", type: "lost",
      contractorName: "Thabo Mokoena",
      dealId: "deal_demo_3", dealName: "8 Protea Close",
      description: "Angle grinder #2 went missing from site. Thabo says it was left in the garage overnight and was gone the next morning. Possible theft.",
      estimatedCost: 1200, recoveryStatus: "pending",
      notes: "Discussing cost recovery with Thabo",
    },
  ],
};

export default function useTools() {
  const [data, setData] = useState<ToolLockerData>(defaultData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let stored = loadFromStorage();
    if (stored.tools.length === 0) {
      stored = MOCK_DATA;
      saveToStorage(stored);
    }
    setData(stored);
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: ToolLockerData) => {
    setData(updated);
    saveToStorage(updated);
    return updated;
  }, []);

  // ─── Tool CRUD ───
  const addTool = useCallback((tool: Omit<Tool, "id" | "createdAt" | "updatedAt">): Tool => {
    const current = loadFromStorage();
    const newTool: Tool = {
      ...tool,
      id: `tool_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    current.tools.push(newTool);
    persist(current);
    return newTool;
  }, [persist]);

  const updateTool = useCallback((id: string, changes: Partial<Tool>) => {
    const current = loadFromStorage();
    current.tools = current.tools.map((t) =>
      t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
    );
    persist(current);
  }, [persist]);

  const deleteTool = useCallback((id: string) => {
    const current = loadFromStorage();
    current.tools = current.tools.filter((t) => t.id !== id);
    current.checkouts = current.checkouts.filter((c) => c.toolId !== id);
    current.maintenance = current.maintenance.filter((m) => m.toolId !== id);
    current.incidents = current.incidents.filter((i) => i.toolId !== id);
    persist(current);
  }, [persist]);

  // ─── Checkout / Return ───
  const checkoutTool = useCallback((toolId: string, details: {
    contractorName: string;
    contractorId?: string;
    dealId?: string;
    dealName?: string;
    propertyAddress?: string;
    expectedReturnDate?: string;
    notes?: string;
  }) => {
    const current = loadFromStorage();
    const tool = current.tools.find((t) => t.id === toolId);
    if (!tool) return;

    const checkout: ToolCheckout = {
      id: `co_${Date.now()}`,
      toolId,
      contractorName: details.contractorName,
      contractorId: details.contractorId,
      dealId: details.dealId,
      dealName: details.dealName,
      propertyAddress: details.propertyAddress,
      checkedOutAt: new Date().toISOString(),
      expectedReturnDate: details.expectedReturnDate,
      conditionOut: tool.condition,
      notes: details.notes,
    };
    current.checkouts.push(checkout);

    current.tools = current.tools.map((t) =>
      t.id === toolId ? {
        ...t,
        status: "checked_out" as ToolStatus,
        currentHolderType: "contractor" as const,
        currentHolderName: details.contractorName,
        currentHolderId: details.contractorId,
        currentDealId: details.dealId,
        currentDealName: details.dealName,
        updatedAt: new Date().toISOString(),
      } : t
    );
    persist(current);
  }, [persist]);

  const returnTool = useCallback((checkoutId: string, details: {
    conditionIn: ToolCondition;
    notes?: string;
  }) => {
    const current = loadFromStorage();
    const checkout = current.checkouts.find((c) => c.id === checkoutId);
    if (!checkout) return;

    current.checkouts = current.checkouts.map((c) =>
      c.id === checkoutId ? {
        ...c,
        returnedAt: new Date().toISOString(),
        conditionIn: details.conditionIn,
        notes: details.notes || c.notes,
      } : c
    );

    current.tools = current.tools.map((t) =>
      t.id === checkout.toolId ? {
        ...t,
        status: "available" as ToolStatus,
        condition: details.conditionIn,
        currentHolderType: undefined,
        currentHolderName: undefined,
        currentHolderId: undefined,
        currentDealId: undefined,
        currentDealName: undefined,
        updatedAt: new Date().toISOString(),
      } : t
    );
    persist(current);
  }, [persist]);

  // ─── Maintenance ───
  const addMaintenanceEntry = useCallback((toolId: string, entry: Omit<ToolMaintenanceEntry, "id" | "toolId">) => {
    const current = loadFromStorage();
    const newEntry: ToolMaintenanceEntry = {
      ...entry,
      id: `mt_${Date.now()}`,
      toolId,
    };
    current.maintenance.push(newEntry);
    persist(current);
  }, [persist]);

  // ─── Incidents ───
  const reportIncident = useCallback((toolId: string, incident: Omit<ToolIncident, "id" | "toolId">) => {
    const current = loadFromStorage();
    const newIncident: ToolIncident = {
      ...incident,
      id: `inc_${Date.now()}`,
      toolId,
    };
    current.incidents.push(newIncident);

    const newStatus: ToolStatus = incident.type === "lost" || incident.type === "stolen" ? "lost" : "damaged";
    current.tools = current.tools.map((t) =>
      t.id === toolId ? {
        ...t,
        status: newStatus,
        condition: incident.type === "broken" ? "broken" as ToolCondition : t.condition,
        updatedAt: new Date().toISOString(),
      } : t
    );
    persist(current);
  }, [persist]);

  const resolveIncident = useCallback((incidentId: string, resolution: {
    recoveryStatus: ToolIncident["recoveryStatus"];
    recoveryAmount?: number;
    notes?: string;
  }) => {
    const current = loadFromStorage();
    current.incidents = current.incidents.map((i) =>
      i.id === incidentId ? {
        ...i,
        recoveryStatus: resolution.recoveryStatus,
        recoveryAmount: resolution.recoveryAmount,
        notes: resolution.notes || i.notes,
      } : i
    );
    persist(current);
  }, [persist]);

  return {
    ...data,
    loaded,
    addTool,
    updateTool,
    deleteTool,
    checkoutTool,
    returnTool,
    addMaintenanceEntry,
    reportIncident,
    resolveIncident,
  };
}
