"use client";
import { useState, useEffect, useCallback } from "react";
import type {
  Deal, DealStage, DealData, DealPriority,
  Expense, ExpenseCategory, PaymentMethod,
  Milestone, MilestoneStatus, Task,
  Activity, ActivityType,
  DealContact, ContactRole,
  Document, DocumentType,
} from "../types/deal";

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

function ensureDealDefaults(deal: Partial<Deal>): Deal {
  return {
    id: deal.id || `deal_${Date.now()}`,
    name: deal.name || "New Deal",
    address: deal.address || "",
    purchasePrice: deal.purchasePrice || 0,
    expectedSalePrice: deal.expectedSalePrice || 0,
    stage: deal.stage || "lead",
    priority: deal.priority || "medium",
    createdAt: deal.createdAt || new Date().toISOString(),
    updatedAt: deal.updatedAt || new Date().toISOString(),
    notes: deal.notes || "",
    tags: deal.tags || [],
    expenses: deal.expenses || [],
    milestones: deal.milestones || [],
    activities: deal.activities || [],
    contacts: deal.contacts || [],
    documents: deal.documents || [],
    data: deal.data || {
      mode: "quick",
      acq: { purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 25000, initialRepairs: 0 },
      prop: { totalSqm: 180, erfSize: 600, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [],
      costDb: {}, contingencyPct: 10, pmPct: 8,
      holding: { renovationMonths: 4, ratesAndTaxes: 1800, utilities: 1200, insurance: 950, security: 2500, levies: 0 },
      resale: { expectedPrice: 2800000, areaBenchmarkPsqm: 18000, agentCommission: 5 },
      quickRenoEstimate: 500000,
    },
    ...(deal.actualSalePrice !== undefined ? { actualSalePrice: deal.actualSalePrice } : {}),
    ...(deal.actualSaleDate ? { actualSaleDate: deal.actualSaleDate } : {}),
    ...(deal.offerAmount !== undefined ? { offerAmount: deal.offerAmount } : {}),
    ...(deal.offerDate ? { offerDate: deal.offerDate } : {}),
    ...(deal.purchaseDate ? { purchaseDate: deal.purchaseDate } : {}),
    ...(deal.transferDate ? { transferDate: deal.transferDate } : {}),
    ...(deal.listedDate ? { listedDate: deal.listedDate } : {}),
    ...(deal.soldDate ? { soldDate: deal.soldDate } : {}),
  } as Deal;
}

const MOCK_DEALS: Deal[] = [
  ensureDealDefaults({
    id: "deal_demo_1",
    name: "32 Jacaranda Rd",
    address: "32 Jacaranda Rd, Pinelands, Cape Town",
    purchasePrice: 1450000,
    expectedSalePrice: 2800000,
    stage: "analysing",
    priority: "high",
    createdAt: "2026-02-10T08:00:00Z",
    updatedAt: "2026-02-20T14:30:00Z",
    notes: "3-bed fixer-upper near schools. Agent says motivated seller. Good area comps at R18k/sqm.",
    tags: ["cape-town", "fixer-upper", "motivated-seller"],
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
    milestones: [
      { id: "ms_1", title: "Property Inspection", description: "Schedule building & pest inspection", dueDate: "2026-02-25", status: "completed", completedDate: "2026-02-22", tasks: [
        { id: "t_1", title: "Book building inspector", completed: true },
        { id: "t_2", title: "Book pest inspector", completed: true },
        { id: "t_3", title: "Review inspection reports", completed: true },
      ], order: 1 },
      { id: "ms_2", title: "Financial Analysis", description: "Complete full cost analysis", dueDate: "2026-03-01", status: "in_progress", tasks: [
        { id: "t_4", title: "Get 3 contractor quotes", completed: true },
        { id: "t_5", title: "Calculate holding costs", completed: true },
        { id: "t_6", title: "Run sensitivity analysis", completed: false },
      ], order: 2 },
      { id: "ms_3", title: "Submit Offer", description: "Prepare and submit OTP", dueDate: "2026-03-05", status: "pending", tasks: [
        { id: "t_7", title: "Draft OTP with attorney", completed: false },
        { id: "t_8", title: "Get bond pre-approval", completed: false },
      ], order: 3 },
    ],
    activities: [
      { id: "a_1", type: "deal_created", description: "Deal created", timestamp: "2026-02-10T08:00:00Z" },
      { id: "a_2", type: "stage_change", description: "Stage changed to Analysing", timestamp: "2026-02-12T10:00:00Z", metadata: { from: "lead", to: "analysing" } },
      { id: "a_3", type: "note_added", description: "Added inspection notes", timestamp: "2026-02-22T14:00:00Z" },
      { id: "a_4", type: "milestone_completed", description: "Completed: Property Inspection", timestamp: "2026-02-22T16:00:00Z" },
    ],
    contacts: [
      { id: "c_1", name: "Sarah van der Merwe", role: "agent", company: "Pam Golding Properties", phone: "082 456 7890", email: "sarah@pamgolding.co.za", notes: "Listing agent, responsive" },
      { id: "c_2", name: "Johan Coetzee", role: "contractor", company: "Johan Builders CC", phone: "076 123 4567", notes: "General builder, R1200/day" },
    ],
    expenses: [
      { id: "e_1", dealId: "deal_demo_1", category: "professional_fees", description: "Building inspection", amount: 3500, date: "2026-02-22", vendor: "Home Inspectors SA", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-22T10:00:00Z" },
      { id: "e_2", dealId: "deal_demo_1", category: "professional_fees", description: "Pest inspection", amount: 1800, date: "2026-02-22", vendor: "Pest Free Cape", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-22T10:00:00Z" },
      { id: "e_3", dealId: "deal_demo_1", category: "legal", description: "Transfer attorney fees (projected)", amount: 45000, date: "2026-03-15", vendor: "Smith & Associates", paymentMethod: "eft", isProjected: true, createdAt: "2026-02-15T10:00:00Z" },
      { id: "e_4", dealId: "deal_demo_1", category: "materials", description: "Renovation materials (projected)", amount: 350000, date: "2026-04-01", vendor: "Various", paymentMethod: "eft", isProjected: true, createdAt: "2026-02-15T10:00:00Z" },
      { id: "e_5", dealId: "deal_demo_1", category: "labour", description: "Contractor labour (projected)", amount: 250000, date: "2026-04-01", vendor: "Johan Builders CC", paymentMethod: "eft", isProjected: true, createdAt: "2026-02-15T10:00:00Z" },
    ],
  }),
  ensureDealDefaults({
    id: "deal_demo_2",
    name: "14 Oak Avenue",
    address: "14 Oak Avenue, Rondebosch, Cape Town",
    purchasePrice: 2100000,
    expectedSalePrice: 3500000,
    stage: "offer_made",
    priority: "high",
    createdAt: "2026-01-28T10:00:00Z",
    updatedAt: "2026-02-18T09:15:00Z",
    notes: "Offer submitted at R2.1m. Waiting for response. Counter-offer expected.",
    tags: ["cape-town", "premium", "competitive"],
    offerAmount: 2100000,
    offerDate: "2026-02-15",
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
    milestones: [
      { id: "ms_4", title: "Market Analysis", description: "Verify area comps and demand", dueDate: "2026-02-05", status: "completed", completedDate: "2026-02-04", tasks: [
        { id: "t_9", title: "Pull recent sales data", completed: true },
        { id: "t_10", title: "Visit 3 comparable properties", completed: true },
      ], order: 1 },
      { id: "ms_5", title: "Offer Negotiation", description: "Submit and negotiate OTP", dueDate: "2026-02-20", status: "in_progress", tasks: [
        { id: "t_11", title: "Submit initial offer", completed: true },
        { id: "t_12", title: "Review counter-offer", completed: false },
        { id: "t_13", title: "Finalize terms", completed: false },
      ], order: 2 },
    ],
    activities: [
      { id: "a_5", type: "deal_created", description: "Deal created", timestamp: "2026-01-28T10:00:00Z" },
      { id: "a_6", type: "stage_change", description: "Stage changed to Analysing", timestamp: "2026-01-30T09:00:00Z" },
      { id: "a_7", type: "stage_change", description: "Stage changed to Offer Made", timestamp: "2026-02-15T14:00:00Z", metadata: { from: "analysing", to: "offer_made" } },
      { id: "a_8", type: "price_change", description: "Offer submitted at R2,100,000", timestamp: "2026-02-15T14:30:00Z" },
    ],
    contacts: [
      { id: "c_3", name: "Mike Thompson", role: "agent", company: "Lew Geffen Sotheby's", phone: "083 789 0123" },
      { id: "c_4", name: "Adv. Pillay", role: "attorney", company: "Pillay & Associates", phone: "021 555 0123" },
    ],
    expenses: [
      { id: "e_6", dealId: "deal_demo_2", category: "professional_fees", description: "Valuation report", amount: 4500, date: "2026-02-01", vendor: "Cape Valuations", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-01T10:00:00Z" },
    ],
  }),
  ensureDealDefaults({
    id: "deal_demo_3",
    name: "8 Protea Close",
    address: "8 Protea Close, Bellville, Cape Town",
    purchasePrice: 980000,
    expectedSalePrice: 1650000,
    stage: "renovating",
    priority: "urgent",
    createdAt: "2025-12-05T12:00:00Z",
    updatedAt: "2026-02-19T16:45:00Z",
    notes: "Renovation in progress. Plumbing and electrical complete. Tiling next week. Budget tracking closely.",
    tags: ["cape-town", "budget-flip", "on-track"],
    purchaseDate: "2025-12-20",
    transferDate: "2026-01-10",
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
    milestones: [
      { id: "ms_6", title: "Demolition & Strip", description: "Remove old fixtures and finishes", dueDate: "2026-01-20", status: "completed", completedDate: "2026-01-18", tasks: [
        { id: "t_14", title: "Strip kitchen", completed: true },
        { id: "t_15", title: "Strip bathroom", completed: true },
        { id: "t_16", title: "Remove old flooring", completed: true },
        { id: "t_17", title: "Dispose of rubble", completed: true },
      ], order: 1 },
      { id: "ms_7", title: "Rough-in (Plumbing & Electrical)", description: "First fix plumbing and electrical", dueDate: "2026-02-05", status: "completed", completedDate: "2026-02-03", tasks: [
        { id: "t_18", title: "Plumbing rough-in", completed: true },
        { id: "t_19", title: "Electrical rough-in", completed: true },
        { id: "t_20", title: "CoC inspection (electrical)", completed: true },
      ], order: 2 },
      { id: "ms_8", title: "Tiling & Finishes", description: "Floor and wall tiling, painting", dueDate: "2026-02-25", status: "in_progress", tasks: [
        { id: "t_21", title: "Kitchen tiling", completed: true },
        { id: "t_22", title: "Bathroom tiling", completed: false, dueDate: "2026-02-22" },
        { id: "t_23", title: "Interior painting", completed: false, dueDate: "2026-02-28" },
        { id: "t_24", title: "Exterior painting", completed: false, dueDate: "2026-03-02" },
      ], order: 3 },
      { id: "ms_9", title: "Kitchen & Bathroom Install", description: "Install new kitchen and bathroom", dueDate: "2026-03-10", status: "pending", tasks: [
        { id: "t_25", title: "Kitchen cabinets install", completed: false },
        { id: "t_26", title: "Countertops install", completed: false },
        { id: "t_27", title: "Bathroom vanity install", completed: false },
        { id: "t_28", title: "Plumbing second fix", completed: false },
      ], order: 4 },
      { id: "ms_10", title: "Final Snag & List", description: "Snag list, final touches, list for sale", dueDate: "2026-03-20", status: "pending", tasks: [
        { id: "t_29", title: "Complete snag list", completed: false },
        { id: "t_30", title: "Professional cleaning", completed: false },
        { id: "t_31", title: "Professional photography", completed: false },
        { id: "t_32", title: "List on Property24", completed: false },
      ], order: 5 },
    ],
    activities: [
      { id: "a_9", type: "deal_created", description: "Deal created", timestamp: "2025-12-05T12:00:00Z" },
      { id: "a_10", type: "stage_change", description: "Stage changed to Purchased", timestamp: "2025-12-20T10:00:00Z" },
      { id: "a_11", type: "stage_change", description: "Stage changed to Renovating", timestamp: "2026-01-12T08:00:00Z" },
      { id: "a_12", type: "milestone_completed", description: "Completed: Demolition & Strip", timestamp: "2026-01-18T16:00:00Z" },
      { id: "a_13", type: "milestone_completed", description: "Completed: Rough-in", timestamp: "2026-02-03T17:00:00Z" },
      { id: "a_14", type: "expense_added", description: "Added expense: Kitchen tiles R18,500", timestamp: "2026-02-15T09:00:00Z" },
    ],
    contacts: [
      { id: "c_5", name: "Johan Coetzee", role: "contractor", company: "Johan Builders CC", phone: "076 123 4567", notes: "Main builder" },
      { id: "c_6", name: "Pieter Sparks", role: "contractor", company: "Sparks Electrical", phone: "082 999 1234", notes: "Electrician" },
      { id: "c_7", name: "Nadia Plumbers", role: "contractor", phone: "073 456 7890", notes: "Plumbing" },
    ],
    expenses: [
      { id: "e_7", dealId: "deal_demo_3", category: "legal", description: "Transfer attorney fees", amount: 38000, date: "2026-01-10", vendor: "Smith & Associates", paymentMethod: "eft", isProjected: false, createdAt: "2026-01-10T10:00:00Z" },
      { id: "e_8", dealId: "deal_demo_3", category: "legal", description: "Bond registration", amount: 22000, date: "2026-01-10", vendor: "Bond Attorneys", paymentMethod: "eft", isProjected: false, createdAt: "2026-01-10T10:00:00Z" },
      { id: "e_9", dealId: "deal_demo_3", category: "labour", description: "Johan Builders — Jan", amount: 28800, date: "2026-01-31", vendor: "Johan Builders CC", paymentMethod: "eft", isProjected: false, createdAt: "2026-01-31T10:00:00Z" },
      { id: "e_10", dealId: "deal_demo_3", category: "labour", description: "Sparks Electrical", amount: 7200, date: "2026-02-03", vendor: "Sparks Electrical", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-03T10:00:00Z" },
      { id: "e_11", dealId: "deal_demo_3", category: "materials", description: "Demolition & rubble removal", amount: 8500, date: "2026-01-20", vendor: "Rubble Removals", paymentMethod: "cash", isProjected: false, createdAt: "2026-01-20T10:00:00Z" },
      { id: "e_12", dealId: "deal_demo_3", category: "materials", description: "Electrical materials", amount: 12400, date: "2026-01-25", vendor: "Builders Warehouse", paymentMethod: "card", isProjected: false, createdAt: "2026-01-25T10:00:00Z" },
      { id: "e_13", dealId: "deal_demo_3", category: "materials", description: "Plumbing materials", amount: 9800, date: "2026-01-25", vendor: "Plumb City", paymentMethod: "card", isProjected: false, createdAt: "2026-01-25T10:00:00Z" },
      { id: "e_14", dealId: "deal_demo_3", category: "materials", description: "Kitchen tiles", amount: 18500, date: "2026-02-15", vendor: "CTM", paymentMethod: "card", isProjected: false, createdAt: "2026-02-15T10:00:00Z" },
      { id: "e_15", dealId: "deal_demo_3", category: "materials", description: "Bathroom tiles (projected)", amount: 12000, date: "2026-02-22", vendor: "CTM", paymentMethod: "card", isProjected: true, createdAt: "2026-02-15T10:00:00Z" },
      { id: "e_16", dealId: "deal_demo_3", category: "materials", description: "Paint (projected)", amount: 8500, date: "2026-02-28", vendor: "Plascon", paymentMethod: "card", isProjected: true, createdAt: "2026-02-15T10:00:00Z" },
      { id: "e_17", dealId: "deal_demo_3", category: "labour", description: "Johan Builders — Feb (projected)", amount: 25200, date: "2026-02-28", vendor: "Johan Builders CC", paymentMethod: "eft", isProjected: true, createdAt: "2026-02-01T10:00:00Z" },
      { id: "e_18", dealId: "deal_demo_3", category: "materials", description: "Kitchen cabinets (projected)", amount: 45000, date: "2026-03-05", vendor: "Kitchen Studio", paymentMethod: "eft", isProjected: true, createdAt: "2026-02-10T10:00:00Z" },
      { id: "e_19", dealId: "deal_demo_3", category: "rates_taxes", description: "Monthly rates & taxes", amount: 1400, date: "2026-02-01", vendor: "City of Cape Town", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-01T10:00:00Z" },
      { id: "e_20", dealId: "deal_demo_3", category: "insurance", description: "Monthly insurance", amount: 800, date: "2026-02-01", vendor: "OUTsurance", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-01T10:00:00Z" },
    ],
  }),
  ensureDealDefaults({
    id: "deal_demo_4",
    name: "22 Berg Street",
    address: "22 Berg Street, Durbanville, Cape Town",
    purchasePrice: 1800000,
    expectedSalePrice: 2900000,
    stage: "purchased",
    priority: "medium",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-15T11:20:00Z",
    notes: "Transfer complete. Starting renovation planning. Need to finalize scope and get quotes.",
    tags: ["cape-town", "mid-range"],
    purchaseDate: "2026-02-01",
    transferDate: "2026-02-10",
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
    milestones: [
      { id: "ms_11", title: "Renovation Scope & Quotes", description: "Define scope of work and get contractor quotes", dueDate: "2026-02-28", status: "in_progress", tasks: [
        { id: "t_33", title: "Walk-through with builder", completed: true },
        { id: "t_34", title: "Define room-by-room scope", completed: false },
        { id: "t_35", title: "Get 3 builder quotes", completed: false },
        { id: "t_36", title: "Get plumber quote", completed: false },
        { id: "t_37", title: "Get electrician quote", completed: false },
      ], order: 1 },
      { id: "ms_12", title: "Permits & Approvals", description: "Submit building plans if needed", dueDate: "2026-03-15", status: "pending", tasks: [
        { id: "t_38", title: "Check if plans required", completed: false },
        { id: "t_39", title: "Submit plans to municipality", completed: false },
      ], order: 2 },
    ],
    activities: [
      { id: "a_15", type: "deal_created", description: "Deal created", timestamp: "2026-01-15T09:00:00Z" },
      { id: "a_16", type: "stage_change", description: "Stage changed to Purchased", timestamp: "2026-02-01T10:00:00Z" },
      { id: "a_17", type: "note_added", description: "Transfer completed", timestamp: "2026-02-10T14:00:00Z" },
    ],
    contacts: [
      { id: "c_8", name: "Linda Smit", role: "agent", company: "RE/MAX", phone: "082 111 2222" },
    ],
    expenses: [
      { id: "e_21", dealId: "deal_demo_4", category: "legal", description: "Transfer attorney fees", amount: 48000, date: "2026-02-10", vendor: "Van Zyl Attorneys", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-10T10:00:00Z" },
      { id: "e_22", dealId: "deal_demo_4", category: "legal", description: "Bond registration", amount: 26000, date: "2026-02-10", vendor: "Bond Attorneys", paymentMethod: "eft", isProjected: false, createdAt: "2026-02-10T10:00:00Z" },
    ],
  }),
  ensureDealDefaults({
    id: "deal_demo_5",
    name: "5 Fynbos Lane",
    address: "5 Fynbos Lane, Strand, Western Cape",
    purchasePrice: 750000,
    expectedSalePrice: 1250000,
    stage: "lead",
    priority: "low",
    createdAt: "2026-02-19T14:00:00Z",
    updatedAt: "2026-02-19T14:00:00Z",
    notes: "",
    tags: ["strand", "entry-level"],
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
    activities: [
      { id: "a_18", type: "deal_created", description: "Deal created from Property24 listing", timestamp: "2026-02-19T14:00:00Z" },
    ],
  }),
  ensureDealDefaults({
    id: "deal_demo_6",
    name: "10 Stellenberg Rd",
    address: "10 Stellenberg Rd, Parow, Cape Town",
    purchasePrice: 1100000,
    expectedSalePrice: 1800000,
    stage: "sold",
    priority: "medium",
    createdAt: "2025-08-10T08:00:00Z",
    updatedAt: "2026-01-20T09:00:00Z",
    notes: "Successfully completed flip. Sold above asking. Total project time: 5 months.",
    tags: ["cape-town", "completed", "above-asking"],
    purchaseDate: "2025-08-25",
    transferDate: "2025-09-10",
    listedDate: "2025-12-15",
    soldDate: "2026-01-10",
    actualSalePrice: 1850000,
    actualSaleDate: "2026-01-10",
    data: {
      mode: "quick",
      acq: { purchasePrice: 1100000, deposit: 150000, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 40000, bondRegistration: 23000, initialRepairs: 8000 },
      prop: { totalSqm: 135, erfSize: 500, bedrooms: 3, bathrooms: 1, garages: 1, stories: "single" },
      rooms: [], nextRoomId: 0, contractors: [
        { id: 1, name: "Reliable Builders", profession: "Builder / General Contractor", dailyRate: 1100, daysWorked: 50 },
        { id: 2, name: "Pro Plumbing", profession: "Plumber", dailyRate: 850, daysWorked: 6 },
      ],
      costDb: {}, contingencyPct: 10, pmPct: 8,
      holding: { renovationMonths: 3, ratesAndTaxes: 1500, utilities: 1000, insurance: 850, security: 2000, levies: 0 },
      resale: { expectedPrice: 1800000, areaBenchmarkPsqm: 14000, agentCommission: 5 },
      quickRenoEstimate: 320000,
    },
    milestones: [
      { id: "ms_13", title: "Purchase & Transfer", description: "", dueDate: "2025-09-10", status: "completed", completedDate: "2025-09-10", tasks: [], order: 1 },
      { id: "ms_14", title: "Renovation", description: "", dueDate: "2025-12-10", status: "completed", completedDate: "2025-12-10", tasks: [], order: 2 },
      { id: "ms_15", title: "List & Sell", description: "", dueDate: "2026-01-15", status: "completed", completedDate: "2026-01-10", tasks: [], order: 3 },
    ],
    activities: [
      { id: "a_19", type: "deal_created", description: "Deal created", timestamp: "2025-08-10T08:00:00Z" },
      { id: "a_20", type: "stage_change", description: "Purchased", timestamp: "2025-08-25T10:00:00Z" },
      { id: "a_21", type: "stage_change", description: "Renovating", timestamp: "2025-09-15T08:00:00Z" },
      { id: "a_22", type: "stage_change", description: "Listed", timestamp: "2025-12-15T10:00:00Z" },
      { id: "a_23", type: "stage_change", description: "Sold for R1,850,000", timestamp: "2026-01-10T14:00:00Z" },
    ],
    expenses: [
      { id: "e_23", dealId: "deal_demo_6", category: "legal", description: "Transfer fees", amount: 40000, date: "2025-09-10", vendor: "Attorneys", paymentMethod: "eft", isProjected: false, createdAt: "2025-09-10T10:00:00Z" },
      { id: "e_24", dealId: "deal_demo_6", category: "materials", description: "Total renovation materials", amount: 185000, date: "2025-11-30", vendor: "Various", paymentMethod: "card", isProjected: false, createdAt: "2025-11-30T10:00:00Z" },
      { id: "e_25", dealId: "deal_demo_6", category: "labour", description: "Builder labour", amount: 55000, date: "2025-11-30", vendor: "Reliable Builders", paymentMethod: "eft", isProjected: false, createdAt: "2025-11-30T10:00:00Z" },
      { id: "e_26", dealId: "deal_demo_6", category: "labour", description: "Plumber", amount: 5100, date: "2025-10-15", vendor: "Pro Plumbing", paymentMethod: "eft", isProjected: false, createdAt: "2025-10-15T10:00:00Z" },
      { id: "e_27", dealId: "deal_demo_6", category: "marketing", description: "Professional photography", amount: 3500, date: "2025-12-12", vendor: "Property Photos", paymentMethod: "eft", isProjected: false, createdAt: "2025-12-12T10:00:00Z" },
      { id: "e_28", dealId: "deal_demo_6", category: "marketing", description: "Agent commission", amount: 92500, date: "2026-01-15", vendor: "Pam Golding", paymentMethod: "eft", isProjected: false, createdAt: "2026-01-15T10:00:00Z" },
    ],
  }),
];

function loadDealsFromStorage(): Deal[] {
  try {
    const raw = localStorage.getItem(DEALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((d: Partial<Deal>) => ensureDealDefaults(d));
      }
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

    return profiles.map((p) => ensureDealDefaults({
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
    const deal = ensureDealDefaults({
      id: `deal_${Date.now()}`,
      name: name || "New Deal",
      address,
      purchasePrice: data?.acq?.purchasePrice || 0,
      expectedSalePrice: data?.resale?.expectedPrice || 0,
      stage: "lead",
      data: data ? { ...ensureDealDefaults({}).data, ...data } : undefined,
      activities: [{ id: `a_${Date.now()}`, type: "deal_created" as ActivityType, description: "Deal created", timestamp: new Date().toISOString() }],
    });
    const updated = [...loadDealsFromStorage(), deal];
    persist(updated);
    return deal;
  }, [persist]);

  const updateDeal = useCallback((id: string, changes: Partial<Deal>) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id ? ensureDealDefaults({ ...d, ...changes, updatedAt: new Date().toISOString() }) : d
    );
    return persist(updated);
  }, [persist]);

  const updateDealData = useCallback((id: string, data: DealData) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === id
        ? ensureDealDefaults({
            ...d,
            data,
            purchasePrice: data.acq.purchasePrice,
            expectedSalePrice: data.resale.expectedPrice,
            updatedAt: new Date().toISOString(),
          })
        : d
    );
    return persist(updated);
  }, [persist]);

  const moveDeal = useCallback((id: string, newStage: DealStage) => {
    const current = loadDealsFromStorage();
    const deal = current.find((d) => d.id === id);
    const oldStage = deal?.stage || "lead";
    const activity: Activity = {
      id: `a_${Date.now()}`,
      type: "stage_change",
      description: `Stage changed from ${oldStage} to ${newStage}`,
      timestamp: new Date().toISOString(),
      metadata: { from: oldStage, to: newStage },
    };
    const updated = current.map((d) =>
      d.id === id
        ? ensureDealDefaults({
            ...d,
            stage: newStage,
            activities: [...(d.activities || []), activity],
            updatedAt: new Date().toISOString(),
          })
        : d
    );
    return persist(updated);
  }, [persist]);

  const deleteDeal = useCallback((id: string) => {
    const current = loadDealsFromStorage();
    const updated = current.filter((d) => d.id !== id);
    return persist(updated);
  }, [persist]);

  const getDeal = useCallback((id: string): Deal | null => {
    const current = loadDealsFromStorage();
    const found = current.find((d) => d.id === id);
    return found ? ensureDealDefaults(found) : null;
  }, []);

  // ─── Expense Management ───
  const addExpense = useCallback((dealId: string, expense: Omit<Expense, "id" | "dealId" | "createdAt">) => {
    const current = loadDealsFromStorage();
    const newExpense: Expense = {
      ...expense,
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dealId,
      createdAt: new Date().toISOString(),
    };
    const activity: Activity = {
      id: `a_${Date.now()}`,
      type: "expense_added",
      description: `Added expense: ${expense.description} ${expense.amount > 0 ? `R${expense.amount.toLocaleString()}` : ""}`,
      timestamp: new Date().toISOString(),
    };
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, expenses: [...(d.expenses || []), newExpense], activities: [...(d.activities || []), activity], updatedAt: new Date().toISOString() })
        : d
    );
    persist(updated);
    return newExpense;
  }, [persist]);

  const updateExpense = useCallback((dealId: string, expenseId: string, changes: Partial<Expense>) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, expenses: (d.expenses || []).map((e) => e.id === expenseId ? { ...e, ...changes } : e), updatedAt: new Date().toISOString() })
        : d
    );
    return persist(updated);
  }, [persist]);

  const deleteExpense = useCallback((dealId: string, expenseId: string) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, expenses: (d.expenses || []).filter((e) => e.id !== expenseId), updatedAt: new Date().toISOString() })
        : d
    );
    return persist(updated);
  }, [persist]);

  // ─── Milestone Management ───
  const addMilestone = useCallback((dealId: string, milestone: Omit<Milestone, "id">) => {
    const current = loadDealsFromStorage();
    const newMilestone: Milestone = { ...milestone, id: `ms_${Date.now()}` };
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, milestones: [...(d.milestones || []), newMilestone], updatedAt: new Date().toISOString() })
        : d
    );
    persist(updated);
    return newMilestone;
  }, [persist]);

  const updateMilestone = useCallback((dealId: string, milestoneId: string, changes: Partial<Milestone>) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, milestones: (d.milestones || []).map((m) => m.id === milestoneId ? { ...m, ...changes } : m), updatedAt: new Date().toISOString() })
        : d
    );
    return persist(updated);
  }, [persist]);

  const toggleTask = useCallback((dealId: string, milestoneId: string, taskId: string) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) => {
      if (d.id !== dealId) return d;
      const milestones = (d.milestones || []).map((m) => {
        if (m.id !== milestoneId) return m;
        const tasks = m.tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t);
        const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
        return { ...m, tasks, status: allDone ? "completed" as MilestoneStatus : m.status === "completed" ? "in_progress" as MilestoneStatus : m.status };
      });
      return ensureDealDefaults({ ...d, milestones, updatedAt: new Date().toISOString() });
    });
    return persist(updated);
  }, [persist]);

  // ─── Contact Management ───
  const addContact = useCallback((dealId: string, contact: Omit<DealContact, "id">) => {
    const current = loadDealsFromStorage();
    const newContact: DealContact = { ...contact, id: `c_${Date.now()}` };
    const activity: Activity = {
      id: `a_${Date.now()}`,
      type: "contact_added",
      description: `Added contact: ${contact.name} (${contact.role})`,
      timestamp: new Date().toISOString(),
    };
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, contacts: [...(d.contacts || []), newContact], activities: [...(d.activities || []), activity], updatedAt: new Date().toISOString() })
        : d
    );
    persist(updated);
    return newContact;
  }, [persist]);

  const deleteContact = useCallback((dealId: string, contactId: string) => {
    const current = loadDealsFromStorage();
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, contacts: (d.contacts || []).filter((c) => c.id !== contactId), updatedAt: new Date().toISOString() })
        : d
    );
    return persist(updated);
  }, [persist]);

  // ─── Activity Log ───
  const addActivity = useCallback((dealId: string, type: ActivityType, description: string, metadata?: Record<string, unknown>) => {
    const current = loadDealsFromStorage();
    const activity: Activity = { id: `a_${Date.now()}`, type, description, timestamp: new Date().toISOString(), metadata };
    const updated = current.map((d) =>
      d.id === dealId
        ? ensureDealDefaults({ ...d, activities: [...(d.activities || []), activity], updatedAt: new Date().toISOString() })
        : d
    );
    return persist(updated);
  }, [persist]);

  return {
    deals, loaded,
    createDeal, updateDeal, updateDealData, moveDeal, deleteDeal, getDeal,
    addExpense, updateExpense, deleteExpense,
    addMilestone, updateMilestone, toggleTask,
    addContact, deleteContact,
    addActivity,
  };
}
