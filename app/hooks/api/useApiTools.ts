"use client";
import { useState, useEffect, useCallback } from "react";
import type {
  Tool,
  ToolCheckout,
  ToolMaintenanceEntry,
  ToolIncident,
  ToolCondition,
} from "../../types/tool";

// Transform DB records to match client types
function dbToTool(raw: Record<string, unknown>): Tool {
  return {
    id: raw.id as string,
    name: raw.name as string,
    category: raw.category as Tool["category"],
    brand: raw.brand as string | undefined,
    model: raw.model as string | undefined,
    serialNumber: raw.serialNumber as string | undefined,
    purchaseDate: raw.purchaseDate as string,
    purchaseCost: raw.purchaseCost as number,
    expectedLifespanMonths: raw.expectedLifespanMonths as number,
    replacementCost: raw.replacementCost as number,
    status: raw.status as Tool["status"],
    condition: raw.condition as Tool["condition"],
    currentHolderType: raw.currentHolderType as Tool["currentHolderType"],
    currentHolderId: raw.currentHolderId as string | undefined,
    currentHolderName: raw.currentHolderName as string | undefined,
    currentDealId: raw.currentDealId as string | undefined,
    currentDealName: raw.currentDealName as string | undefined,
    notes: raw.notes as string | undefined,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

function dbToCheckout(raw: Record<string, unknown>): ToolCheckout {
  return {
    id: raw.id as string,
    toolId: raw.toolId as string,
    contractorName: raw.contractorName as string,
    contractorId: raw.contractorId as string | undefined,
    dealId: raw.dealId as string | undefined,
    dealName: raw.dealName as string | undefined,
    propertyAddress: raw.propertyAddress as string | undefined,
    checkedOutAt: raw.checkedOutAt as string,
    expectedReturnDate: raw.expectedReturnDate as string | undefined,
    returnedAt: raw.returnedAt as string | undefined,
    conditionOut: raw.conditionOut as ToolCondition,
    conditionIn: raw.conditionIn as ToolCondition | undefined,
    notes: raw.notes as string | undefined,
  };
}

function dbToMaintenance(raw: Record<string, unknown>): ToolMaintenanceEntry {
  return {
    id: raw.id as string,
    toolId: raw.toolId as string,
    date: raw.date as string,
    type: raw.type as ToolMaintenanceEntry["type"],
    description: raw.description as string,
    cost: raw.cost as number | undefined,
    performedBy: raw.performedBy as string | undefined,
    notes: raw.notes as string | undefined,
  };
}

function dbToIncident(raw: Record<string, unknown>): ToolIncident {
  return {
    id: raw.id as string,
    toolId: raw.toolId as string,
    date: raw.date as string,
    type: raw.type as ToolIncident["type"],
    contractorName: raw.contractorName as string,
    contractorId: raw.contractorId as string | undefined,
    dealId: raw.dealId as string | undefined,
    dealName: raw.dealName as string | undefined,
    description: raw.description as string,
    estimatedCost: raw.estimatedCost as number | undefined,
    recoveryStatus: raw.recoveryStatus as ToolIncident["recoveryStatus"],
    recoveryAmount: raw.recoveryAmount as number | undefined,
    notes: raw.notes as string | undefined,
  };
}

import { api } from "@/lib/client-fetch";

export default function useApiTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [checkouts, setCheckouts] = useState<ToolCheckout[]>([]);
  const [maintenance, setMaintenance] = useState<ToolMaintenanceEntry[]>([]);
  const [incidents, setIncidents] = useState<ToolIncident[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const data = await api<any>("/api/tools");
      setTools((data.data ?? data.tools ?? []).map(dbToTool));
      setCheckouts(data.checkouts.map(dbToCheckout));
      setMaintenance(data.maintenance.map(dbToMaintenance));
      setIncidents(data.incidents.map(dbToIncident));
    } catch (err) {
      // Error is silently caught; loaded state will be set and collections will remain empty
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTool = useCallback(async (tool: Omit<Tool, "id" | "createdAt" | "updatedAt">): Promise<Tool> => {
    const raw = await api<any>("/api/tools", {
      method: "POST",
      body: JSON.stringify(tool),
    });
    const newTool = dbToTool(raw);
    setTools((prev) => [newTool, ...prev]);
    return newTool;
  }, []);

  const updateTool = useCallback(async (id: string, changes: Partial<Tool>) => {
    const raw = await api<any>(`/api/tools/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    const updated = dbToTool(raw);
    setTools((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, []);

  const deleteTool = useCallback(async (id: string) => {
    await api<any>(`/api/tools/${id}`, { method: "DELETE" });
    setTools((prev) => prev.filter((t) => t.id !== id));
    setCheckouts((prev) => prev.filter((c) => c.toolId !== id));
    setMaintenance((prev) => prev.filter((m) => m.toolId !== id));
    setIncidents((prev) => prev.filter((i) => i.toolId !== id));
  }, []);

  const checkoutTool = useCallback(async (toolId: string, details: {
    contractorName: string;
    contractorId?: string;
    dealId?: string;
    dealName?: string;
    propertyAddress?: string;
    expectedReturnDate?: string;
    notes?: string;
  }) => {
    await api<any>(`/api/tools/${toolId}`, {
      method: "PATCH",
      body: JSON.stringify({ _action: "checkout", ...details }),
    });
    await fetchAll();
  }, [fetchAll]);

  const returnTool = useCallback(async (checkoutId: string, details: {
    conditionIn: ToolCondition;
    notes?: string;
  }) => {
    const checkout = checkouts.find((c) => c.id === checkoutId);
    if (!checkout) return;
    await api<any>(`/api/tools/${checkout.toolId}`, {
      method: "PATCH",
      body: JSON.stringify({ _action: "return", checkoutId, ...details }),
    });
    await fetchAll();
  }, [checkouts, fetchAll]);

  const addMaintenanceEntry = useCallback(async (toolId: string, entry: Omit<ToolMaintenanceEntry, "id" | "toolId">) => {
    await api<any>(`/api/tools/${toolId}`, {
      method: "PATCH",
      body: JSON.stringify({ _action: "maintenance", ...entry }),
    });
    await fetchAll();
  }, [fetchAll]);

  const reportIncident = useCallback(async (toolId: string, incident: Omit<ToolIncident, "id" | "toolId">) => {
    await api<any>(`/api/tools/${toolId}`, {
      method: "PATCH",
      body: JSON.stringify({ _action: "incident", ...incident }),
    });
    await fetchAll();
  }, [fetchAll]);

  const resolveIncident = useCallback(async (incidentId: string, resolution: {
    recoveryStatus: ToolIncident["recoveryStatus"];
    recoveryAmount?: number;
    notes?: string;
  }) => {
    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident) return;
    await api<any>(`/api/tools/${incident.toolId}`, {
      method: "PATCH",
      body: JSON.stringify({ _action: "resolveIncident", incidentId, ...resolution }),
    });
    await fetchAll();
  }, [incidents, fetchAll]);

  return {
    tools, checkouts, maintenance, incidents,
    loaded,
    addTool, updateTool, deleteTool,
    checkoutTool, returnTool,
    addMaintenanceEntry,
    reportIncident, resolveIncident,
  };
}
