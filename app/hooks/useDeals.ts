"use client";
import { useState, useEffect, useCallback } from "react";
import type { Deal, DealStage, DealData } from "../types/deal";

const DEALS_KEY = "justhousesErp_deals";
const PROFILES_KEY = "justhousesErp_profiles";

interface ProfileLegacy {
  id: string;
  name: string;
  savedAt: string;
  mode: string;
  acq: Deal["data"]["acq"];
  prop: Deal["data"]["prop"];
  rooms: Deal["data"]["rooms"];
  nextRoomId: number;
  contractors: Deal["data"]["contractors"];
  costDb: Deal["data"]["costDb"];
  contingencyPct: number;
  pmPct: number;
  holding: Deal["data"]["holding"];
  resale: Deal["data"]["resale"];
  quickRenoEstimate: number;
}

const MOCK_DEALS: Deal[] = [
  {
    id: "deal_demo_1",
    name: "32 Jacaranda Rd",
    address: "32 Jacaranda Rd, Pinelands, Cape Town",
    purchasePrice: 1450000,
    expectedSalePrice: 2800000,
    stage: "analysing",
    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
    notes: "3-bed fixer-upper near schools. Agent says motivated seller.",
    data: {
      mode: "quick",
      acq: { purchasePrice: 1450000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0 },
      prop: { totalSqm: 160, erfSize: 550, bedrooms: 3, bathrooms: 1, garages: 1, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [],
      costDb: {}, contingencyPct: 10, pmPct: 8,
      holding: { renovationMonths: 5, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 },
      resale: { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 },
      quickRenoEstimate: 600000,
    },
  },
  {
    id: "deal_demo_2",
    name: "14 Oak Avenue",
    address: "14 Oak Avenue, Rondebosch, Cape Town",
    purchasePrice: 2100000,
    expectedSalePrice: 3500000,
    stage: "offer_made",
    createdAt: "2026-01-28T10:00:00Z",
    updatedAt: "2026-02-18T09:15:00Z",
    notes: "Offer submitted at R2.1m. Waiting for response.",
    data: {
      mode: "quick",
      acq: { purchasePrice: 2100000, deposit: 200000, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 52000, bondRegistration: 28000, initialRepairs: 15000 },
      prop: { totalSqm: 220, erfSize: 800, bedrooms: 4, bathrooms: 2, garages: 2, stories: "double" },
      rooms: [], nextRoomId: 0, contractors: [],
      costDb: {}, contingencyPct: 12, pmPct: 8,
      holding: { renovationMonths: 6, ratesAndTaxes: 2400, utilities: 1500, insurance: 1100, security: 2500, levies: 0 },
      resale: { expectedPrice: 3500000, areaBenchmarkPsqm: 20000, agentCommission: 5 },
      quickRenoEstimate: 750000,
    },
  },
  {
    id: "deal_demo_3",
    name: "8 Protea Close",
    address: "8 Protea Close, Bellville, Cape Town",
    purchasePrice: 980000,
    expectedSalePrice: 1650000,
    stage: "renovating",
    createdAt: "2025-12-05T12:00:00Z",
    updatedAt: "2026-02-19T16:45:00Z",
    notes: "Renovation in progress. Plumbing and electrical complete. Tiling next week.",
    data: {
      mode: "quick",
      acq: { purchasePrice: 980000, deposit: 100000, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 38000, bondRegistration: 22000, initialRepairs: 5000 },
      prop: { totalSqm: 110, erfSize: 400, bedrooms: 2, bathrooms: 1, garages: 1, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [
        { id: 1, name: "Johan Builders", profession: "Builder / General Contractor", dailyRate: 1200, daysWorked: 45 },
        { id: 2, name: "Sparks Electrical", profession: "Electrician", dailyRate: 900, daysWorked: 8 },
      ],
      costDb: {}, contingencyPct: 15, pmPct: 8,
      holding: { renovationMonths: 4, ratesAndTaxes: 1400, utilities: 900, insurance: 800, security: 2000, levies: 0 },
      resale: { expectedPrice: 1650000, areaBenchmarkPsqm: 15000, agentCommission: 5 },
      quickRenoEstimate: 350000,
    },
  },
  {
    id: "deal_demo_4",
    name: "22 Berg Street",
    address: "22 Berg Street, Durbanville, Cape Town",
    purchasePrice: 1800000,
    expectedSalePrice: 2900000,
    stage: "purchased",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-15T11:20:00Z",
    notes: "Transfer complete. Starting renovation planning.",
    data: {
      mode: "quick",
      acq: { purchasePrice: 1800000, deposit: 300000, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 48000, bondRegistration: 26000, initialRepairs: 10000 },
      prop: { totalSqm: 195, erfSize: 700, bedrooms: 4, bathrooms: 2, garages: 1, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [],
      costDb: {}, contingencyPct: 10, pmPct: 8,
      holding: { renovationMonths: 5, ratesAndTaxes: 2200, utilities: 1400, insurance: 1000, security: 2500, levies: 0 },
      resale: { expectedPrice: 2900000, areaBenchmarkPsqm: 17500, agentCommission: 5 },
      quickRenoEstimate: 550000,
    },
  },
  {
    id: "deal_demo_5",
    name: "5 Fynbos Lane",
    address: "5 Fynbos Lane, Strand, Western Cape",
    purchasePrice: 750000,
    expectedSalePrice: 1250000,
    stage: "lead",
    createdAt: "2026-02-19T14:00:00Z",
    updatedAt: "2026-02-19T14:00:00Z",
    notes: "",
    data: {
      mode: "quick",
      acq: { purchasePrice: 750000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 35000, bondRegistration: 20000, initialRepairs: 0 },
      prop: { totalSqm: 95, erfSize: 350, bedrooms: 2, bathrooms: 1, garages: 0, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [],
      costDb: {}, contingencyPct: 10, pmPct: 8,
      holding: { renovationMonths: 3, ratesAndTaxes: 1200, utilities: 800, insurance: 700, security: 1800, levies: 0 },
      resale: { expectedPrice: 1250000, areaBenchmarkPsqm: 13000, agentCommission: 5 },
      quickRenoEstimate: 250000,
    },
  },
];

function loadDealsFromStorage(): Deal[] {
  try {
    const raw = localStorage.getItem(DEALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

function saveDealsToStorage(deals: Deal[]): void {
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
}

function migrateProfilesToDeals(): Deal[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const profiles: ProfileLegacy[] = JSON.parse(raw);
    if (!Array.isArray(profiles) || profiles.length === 0) return [];

    return profiles.map((p) => ({
      id: `deal_${p.id}`,
      name: p.name || "Unnamed Property",
      address: "",
      purchasePrice: p.acq?.purchasePrice || 0,
      expectedSalePrice: p.resale?.expectedPrice || 0,
      stage: "analysing" as DealStage,
      createdAt: p.savedAt || new Date().toISOString(),
      updatedAt: p.savedAt || new Date().toISOString(),
      notes: "",
      data: {
        mode: (p.mode as "quick" | "advanced") || "quick",
        acq: p.acq,
        prop: p.prop,
        rooms: p.rooms,
        nextRoomId: p.nextRoomId,
        contractors: p.contractors,
        costDb: p.costDb,
        contingencyPct: p.contingencyPct,
        pmPct: p.pmPct,
        holding: p.holding,
        resale: p.resale,
        quickRenoEstimate: p.quickRenoEstimate,
      },
    }));
  } catch {
    return [];
  }
}

export default function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let stored = loadDealsFromStorage();

    if (stored.length === 0) {
      const migrated = migrateProfilesToDeals();
      if (migrated.length > 0) {
        stored = migrated;
      } else {
        stored = MOCK_DEALS;
      }
      saveDealsToStorage(stored);
    }

    setDeals(stored);
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: Deal[]) => {
    setDeals(updated);
    saveDealsToStorage(updated);
    return updated;
  }, []);

  const createDeal = useCallback((name: string, address = "", data?: Partial<DealData>): Deal => {
    const deal: Deal = {
      id: `deal_${Date.now()}`,
      name: name || "New Deal",
      address,
      purchasePrice: data?.acq?.purchasePrice || 0,
      expectedSalePrice: data?.resale?.expectedPrice || 0,
      stage: "lead",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: "",
      data: {
        mode: "quick",
        acq: { purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0 },
        prop: { totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 },
        resale: { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 },
        quickRenoEstimate: 500000,
        ...data,
      },
    };
    const updated = [...loadDealsFromStorage(), deal];
    persist(updated);
    return deal;
  }, [persist]);

  const updateDeal = useCallback((id: string, changes: Partial<Deal>) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id ? { ...d, ...changes, updatedAt: new Date().toISOString() } : d
    );
    return persist(updated);
  }, [persist]);

  const updateDealData = useCallback((id: string, data: DealData) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id
        ? {
            ...d,
            data,
            purchasePrice: data.acq.purchasePrice,
            expectedSalePrice: data.resale.expectedPrice,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    return persist(updated);
  }, [persist]);

  const moveDeal = useCallback((id: string, newStage: DealStage) => {
    return updateDeal(id, { stage: newStage });
  }, [updateDeal]);

  const deleteDeal = useCallback((id: string) => {
    const current = loadDealsFromStorage();
    const updated = current.filter((d) => d.id !== id);
    return persist(updated);
  }, [persist]);

  const getDeal = useCallback((id: string): Deal | null => {
    const current = loadDealsFromStorage();
    return current.find((d) => d.id === id) || null;
  }, []);

  return { deals, loaded, createDeal, updateDeal, updateDealData, moveDeal, deleteDeal, getDeal };
}
