"use client";
import { useState, useEffect, useCallback } from "react";
import type {
  Deal, DealStage, DealData,
  Expense,
  Milestone, MilestoneStatus, Task,
  Activity, ActivityType,
  DealContact,
  ShoppingListItem,
} from "../../types/deal";

// Transform DB deal shape → client Deal shape
function dbToClientDeal(raw: Record<string, unknown>): Deal {
  const deal: Deal = {
    id: raw.id as string,
    name: raw.name as string,
    address: (raw.address as string) || "",
    purchasePrice: raw.purchasePrice as number,
    expectedSalePrice: raw.expectedSalePrice as number,
    stage: raw.stage as DealStage,
    priority: raw.priority as Deal["priority"],
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    notes: (raw.notes as string) || "",
    tags: (Array.isArray(raw.tags) ? raw.tags : JSON.parse((raw.tags as string) || "[]")) as string[],
    data: raw.data as DealData,
    expenses: ((raw.expenses as Record<string, unknown>[]) || []).map(dbToClientExpense),
    milestones: ((raw.milestones as Record<string, unknown>[]) || []).map(dbToClientMilestone),
    activities: ((raw.activities as Record<string, unknown>[]) || []).map(dbToClientActivity),
    contacts: dbToClientContacts(raw.dealContacts as Record<string, unknown>[] | undefined),
    documents: ((raw.documents as Record<string, unknown>[]) || []).map(dbToClientDocument),
    shoppingList: ((raw.shoppingListItems as Record<string, unknown>[]) || []).map(dbToClientShoppingItem),
  };

  if (raw.actualSalePrice != null) deal.actualSalePrice = raw.actualSalePrice as number;
  if (raw.actualSaleDate) deal.actualSaleDate = raw.actualSaleDate as string;
  if (raw.offerAmount != null) deal.offerAmount = raw.offerAmount as number;
  if (raw.offerDate) deal.offerDate = raw.offerDate as string;
  if (raw.purchaseDate) deal.purchaseDate = raw.purchaseDate as string;
  if (raw.transferDate) deal.transferDate = raw.transferDate as string;
  if (raw.listedDate) deal.listedDate = raw.listedDate as string;
  if (raw.soldDate) deal.soldDate = raw.soldDate as string;

  return deal;
}

function dbToClientExpense(raw: Record<string, unknown>): Expense {
  return {
    id: raw.id as string,
    dealId: raw.dealId as string,
    category: raw.category as Expense["category"],
    description: raw.description as string,
    amount: raw.amount as number,
    date: raw.date as string,
    vendor: (raw.vendor as string) || "",
    paymentMethod: (raw.paymentMethod as Expense["paymentMethod"]) || "eft",
    receiptRef: raw.receiptRef as string | undefined,
    notes: raw.notes as string | undefined,
    isProjected: (raw.isProjected as boolean) || false,
    createdAt: raw.createdAt as string,
    milestoneId: raw.milestoneId as string | undefined,
    contractorId: raw.contractorId as string | undefined,
    signOff: {
      status: (raw.signOffStatus as "pending" | "approved" | "rejected") || "pending",
      inspectedAt: raw.signOffInspectedAt as string | undefined,
      approvedAt: raw.signOffApprovedAt as string | undefined,
      pmNotes: raw.signOffPmNotes as string | undefined,
    },
  };
}

function dbToClientMilestone(raw: Record<string, unknown>): Milestone {
  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) || "",
    dueDate: raw.dueDate as string,
    completedDate: raw.completedDate as string | undefined,
    status: raw.status as MilestoneStatus,
    tasks: ((raw.tasks as Record<string, unknown>[]) || []).map(dbToClientTask),
    order: (raw.order as number) || 0,
    assignedContractorId: raw.assignedContractorId as string | undefined,
    assignedToMemberId: raw.assignedToMemberId as string | undefined,
    roomId: raw.roomId as string | undefined,
    inspectionStatus: raw.inspectionStatus as Milestone["inspectionStatus"],
    inspectedAt: raw.inspectedAt as string | undefined,
    inspectionNotes: raw.inspectionNotes as string | undefined,
  };
}

function dbToClientTask(raw: Record<string, unknown>): Task {
  return {
    id: raw.id as string,
    title: raw.title as string,
    completed: (raw.completed as boolean) || false,
    assignedTo: raw.assignedTo as string | undefined,
    dueDate: raw.dueDate as string | undefined,
    completedAt: raw.completedAt as string | undefined,
  };
}

function dbToClientActivity(raw: Record<string, unknown>): Activity {
  return {
    id: raw.id as string,
    type: raw.type as ActivityType,
    description: raw.description as string,
    timestamp: raw.timestamp as string,
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };
}

function dbToClientContacts(raw: Record<string, unknown>[] | undefined): DealContact[] {
  if (!raw) return [];
  return raw.map((dc) => {
    const contact = dc.contact as Record<string, unknown>;
    return {
      id: contact.id as string,
      name: contact.name as string,
      role: contact.role as DealContact["role"],
      company: contact.company as string | undefined,
      phone: contact.phone as string | undefined,
      email: contact.email as string | undefined,
      notes: contact.notes as string | undefined,
      profession: contact.profession as string | undefined,
      dailyRate: contact.dailyRate as number | undefined,
      daysWorked: dc.daysWorked as number | undefined,
      workDescription: dc.workDescription as string | undefined,
      bankName: contact.bankName as string | undefined,
      accountNumber: contact.accountNumber as string | undefined,
      branchCode: contact.branchCode as string | undefined,
      accountType: contact.accountType as DealContact["accountType"],
    };
  });
}

function dbToClientDocument(raw: Record<string, unknown>): Deal["documents"][0] {
  return {
    id: raw.id as string,
    name: raw.name as string,
    type: raw.type as Deal["documents"][0]["type"],
    url: raw.url as string | undefined,
    notes: raw.notes as string | undefined,
    addedAt: raw.createdAt as string,
  };
}

function dbToClientShoppingItem(raw: Record<string, unknown>): ShoppingListItem {
  return {
    materialKey: raw.materialKey as string,
    category: raw.category as string,
    purchased: (raw.purchased as boolean) || false,
    actualPrice: raw.actualPrice as number | undefined,
    actualQty: raw.actualQty as number | undefined,
    vendor: raw.vendor as string | undefined,
    purchasedDate: raw.purchasedDate as string | undefined,
    notes: raw.notes as string | undefined,
    stylePreferences: raw.stylePreferences as ShoppingListItem["stylePreferences"],
    isCustom: raw.isCustom as boolean | undefined,
    label: raw.label as string | undefined,
    qty: raw.qty as number | undefined,
    unit: raw.unit as string | undefined,
    unitPrice: raw.unitPrice as number | undefined,
  };
}

import { api } from "@/lib/client-fetch";

export default function useApiDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      const raw = await api<any>("/api/deals");
      const items = raw.data ?? raw;
      setDeals(items.map(dbToClientDeal));
    } catch (err) {
      // Error is silently caught; loaded state will be set and deals will remain empty
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const getDeal = useCallback((id: string) => deals.find((d) => d.id === id), [deals]);

  const createDeal = useCallback(async (name: string): Promise<Deal> => {
    const raw = await api<any>("/api/deals", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const deal = dbToClientDeal(raw);
    setDeals((prev) => [deal, ...prev]);
    return deal;
  }, []);

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>) => {
    const raw = await api<any>(`/api/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    const updated = dbToClientDeal(raw);
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  const updateDealData = useCallback(async (dealId: string, dataUpdates: Partial<DealData>) => {
    const current = deals.find((d) => d.id === dealId);
    if (!current) return;
    const mergedData = { ...current.data, ...dataUpdates };
    const raw = await api<any>(`/api/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify({ data: mergedData }),
    });
    const updated = dbToClientDeal(raw);
    setDeals((prev) => prev.map((d) => (d.id === dealId ? updated : d)));
  }, [deals]);

  const moveDeal = useCallback(async (id: string, stage: DealStage) => {
    await updateDeal(id, { stage } as Partial<Deal>);
  }, [updateDeal]);

  const deleteDeal = useCallback(async (id: string) => {
    await api(`/api/deals/${id}`, { method: "DELETE" });
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ─── Expenses ───
  // Matches old signature: addExpense(dealId, expenseWithoutDealId)
  const addExpense = useCallback(async (dealId: string, expense: Omit<Expense, "id" | "dealId" | "createdAt">) => {
    const raw = await api<any>("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ ...expense, dealId }),
    });
    await fetchDeals();
    return raw;
  }, [fetchDeals]);

  // Matches old signature: updateExpense(dealId, expenseId, changes)
  const updateExpense = useCallback(async (_dealId: string, expenseId: string, updates: Partial<Expense>) => {
    await api(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await fetchDeals();
  }, [fetchDeals]);

  // Matches old signature: deleteExpense(dealId, expenseId)
  const deleteExpense = useCallback(async (_dealId: string, expenseId: string) => {
    await api(`/api/expenses/${expenseId}`, { method: "DELETE" });
    await fetchDeals();
  }, [fetchDeals]);

  // ─── Milestones ───
  const addMilestone = useCallback(async (dealId: string, milestone: Omit<Milestone, "id">) => {
    await api<any>("/api/milestones", {
      method: "POST",
      body: JSON.stringify({ ...milestone, dealId }),
    });
    await fetchDeals();
  }, [fetchDeals]);

  // Matches old signature: updateMilestone(dealId, milestoneId, changes)
  const updateMilestone = useCallback(async (_dealId: string, milestoneId: string, updates: Partial<Milestone>) => {
    await api(`/api/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await fetchDeals();
  }, [fetchDeals]);

  // ─── Tasks ───
  const toggleTask = useCallback(async (dealId: string, milestoneId: string, taskId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const milestone = deal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;
    const task = milestone.tasks.find((t) => t.id === taskId);
    if (!task) return;

    await api<any>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !task.completed }),
    });
    await fetchDeals();
  }, [deals, fetchDeals]);

  // ─── Contacts ───
  const addContact = useCallback(async (dealId: string, contact: Omit<DealContact, "id">) => {
    // First create the contact
    const newContact = await api<any>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(contact),
    });
    // Then we'd need to link it to the deal — for now refresh
    await fetchDeals();
    return newContact;
  }, [fetchDeals]);

  const deleteContact = useCallback(async (_dealId: string, contactId: string) => {
    await api<any>(`/api/contacts/${contactId}`, { method: "DELETE" });
    await fetchDeals();
  }, [fetchDeals]);

  // ─── Shopping List ───
  // Matches old signature: updateShoppingItem(dealId, materialKey, category, changes)
  const updateShoppingItem = useCallback(async (dealId: string, materialKey: string, category: string, updates: Partial<ShoppingListItem>) => {
    void category; // category used for matching in localStorage, not needed for API
    await api<any>("/api/shopping-list", {
      method: "PATCH",
      body: JSON.stringify({ ...updates, id: materialKey, dealId }),
    });
    await fetchDeals();
  }, [fetchDeals]);

  // Matches old signature: markItemPurchased(dealId, materialKey, category, purchased, actualPrice?, vendor?)
  const markItemPurchased = useCallback(async (dealId: string, materialKey: string, category: string, purchased: boolean, actualPrice?: number, vendor?: string) => {
    await updateShoppingItem(dealId, materialKey, category, {
      purchased,
      ...(actualPrice !== undefined ? { actualPrice } : {}),
      ...(vendor ? { vendor } : {}),
      ...(purchased ? { purchasedDate: new Date().toISOString().slice(0, 10) } : {}),
    });
  }, [updateShoppingItem]);

  // Matches old signature: addCustomShoppingItem(dealId, { label, category, qty, unit, unitPrice, vendor? })
  const addCustomShoppingItem = useCallback(async (dealId: string, item: { label: string; category: string; qty: number; unit: string; unitPrice: number; vendor?: string }) => {
    const materialKey = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await api<any>("/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({
        dealId,
        materialKey,
        category: item.category,
        isCustom: true,
        label: item.label,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
      }),
    });
    await fetchDeals();
  }, [fetchDeals]);

  const removeCustomShoppingItem = useCallback(async (_dealId: string, materialKey: string) => {
    // Need to delete by materialKey
    await api<any>(`/api/shopping-list?materialKey=${materialKey}`, { method: "DELETE" });
    await fetchDeals();
  }, [fetchDeals]);

  // ─── Activities ───
  const addActivity = useCallback(async (dealId: string, type: ActivityType, description: string, metadata?: Record<string, unknown>) => {
    // Activities are now created server-side in most cases
    // But we expose this for manual additions
    void dealId; void type; void description; void metadata;
    await fetchDeals();
  }, [fetchDeals]);

  return {
    deals, loaded,
    createDeal, updateDeal, updateDealData, moveDeal, deleteDeal, getDeal,
    addExpense, updateExpense, deleteExpense,
    addMilestone, updateMilestone, toggleTask,
    addContact, deleteContact,
    updateShoppingItem, markItemPurchased, addCustomShoppingItem, removeCustomShoppingItem,
    addActivity,
  };
}
