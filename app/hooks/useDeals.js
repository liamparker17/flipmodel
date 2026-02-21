"use client";
import { useState, useEffect, useCallback } from "react";

const DEALS_KEY = "justhousesErp_deals";
const PROFILES_KEY = "justhousesErp_profiles";

function loadDealsFromStorage() {
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

function saveDealsToStorage(deals) {
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
}

function migrateProfilesToDeals() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const profiles = JSON.parse(raw);
    if (!Array.isArray(profiles) || profiles.length === 0) return [];

    const existingDeals = loadDealsFromStorage();
    if (existingDeals.length > 0) return existingDeals;

    const migrated = profiles.map((p) => ({
      id: `deal_${p.id}`,
      name: p.name || "Unnamed Property",
      stage: "analysing",
      createdAt: p.savedAt || new Date().toISOString(),
      updatedAt: p.savedAt || new Date().toISOString(),
      notes: "",
      data: {
        mode: p.mode, acq: p.acq, prop: p.prop, rooms: p.rooms,
        nextRoomId: p.nextRoomId, contractors: p.contractors, costDb: p.costDb,
        contingencyPct: p.contingencyPct, pmPct: p.pmPct,
        holding: p.holding, resale: p.resale, quickRenoEstimate: p.quickRenoEstimate,
      },
    }));

    saveDealsToStorage(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export default function useDeals() {
  const [deals, setDeals] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let d = loadDealsFromStorage();
    if (d.length === 0) {
      d = migrateProfilesToDeals();
    }
    setDeals(d);
    setLoaded(true);
  }, []);

  const persist = useCallback((updated) => {
    setDeals(updated);
    saveDealsToStorage(updated);
    return updated;
  }, []);

  const createDeal = useCallback((name, data = {}) => {
    const deal = {
      id: `deal_${Date.now()}`,
      name: name || "New Deal",
      stage: "lead",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: "",
      data,
    };
    const updated = [...loadDealsFromStorage(), deal];
    persist(updated);
    return deal;
  }, [persist]);

  const updateDeal = useCallback((id, changes) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id ? { ...d, ...changes, updatedAt: new Date().toISOString() } : d
    );
    return persist(updated);
  }, [persist]);

  const updateDealData = useCallback((id, data) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id ? { ...d, data, updatedAt: new Date().toISOString() } : d
    );
    return persist(updated);
  }, [persist]);

  const moveDeal = useCallback((id, newStage) => {
    return updateDeal(id, { stage: newStage });
  }, [updateDeal]);

  const deleteDeal = useCallback((id) => {
    const current = loadDealsFromStorage();
    const updated = current.filter((d) => d.id !== id);
    return persist(updated);
  }, [persist]);

  const getDeal = useCallback((id) => {
    const current = loadDealsFromStorage();
    return current.find((d) => d.id === id) || null;
  }, []);

  return { deals, loaded, createDeal, updateDeal, updateDealData, moveDeal, deleteDeal, getDeal };
}
