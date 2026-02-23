import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Demo User ───
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@flipmodel.co.za" },
    update: {},
    create: {
      email: "demo@flipmodel.co.za",
      name: "Demo User",
      company: "FlipModel Properties",
      passwordHash,
      preferences: {
        defaultCommission: 5,
        defaultContingency: 10,
        bondRate: 11.75,
      },
    },
  });

  console.log(`User: ${user.email} (${user.id})`);

  // ─── Organisation ───
  let org = await prisma.organisation.findUnique({ where: { slug: "flipmodel-properties" } });
  if (!org) {
    org = await prisma.organisation.create({
      data: {
        name: "FlipModel Properties",
        slug: "flipmodel-properties",
        currency: "ZAR",
        timezone: "Africa/Johannesburg",
        settings: {
          defaultCurrency: "ZAR",
          timezone: "Africa/Johannesburg",
          fiscalYearStart: 3,
          defaultBondRate: 12.75,
          defaultAgentCommission: 5,
          defaultContingencyPct: 10,
          defaultPmPct: 8,
          defaultRenovationMonths: 4,
        },
      },
    });
  }

  // Ensure OrgMember exists
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: "executive",
      title: "Owner",
    },
  });

  console.log(`Organisation: ${org.name} (${org.id})`);

  const orgId = org.id;

  // ─── Contacts ───
  const plumber = await prisma.contact.create({
    data: {
      orgId,
      userId: user.id,
      name: "Sipho Ndlovu",
      role: "contractor",
      profession: "Plumber",
      company: "Ndlovu Plumbing Services",
      phone: "+27 82 345 6789",
      email: "sipho@ndlovuplumbing.co.za",
      dailyRate: 1800,
      bankName: "FNB",
      accountNumber: "62845903712",
      branchCode: "250655",
      accountType: "cheque",
      notes: "Reliable, does great work on bathroom renovations.",
    },
  });

  const electrician = await prisma.contact.create({
    data: {
      orgId,
      userId: user.id,
      name: "Johan van der Merwe",
      role: "contractor",
      profession: "Electrician",
      company: "Sparks Electrical CC",
      phone: "+27 71 234 5678",
      email: "johan@sparkselectrical.co.za",
      dailyRate: 2200,
      bankName: "Standard Bank",
      accountNumber: "410258734",
      branchCode: "051001",
      accountType: "business",
      notes: "COC certified. Handles all compliance certificates.",
    },
  });

  const agent = await prisma.contact.create({
    data: {
      orgId,
      userId: user.id,
      name: "Lerato Moloi",
      role: "agent",
      profession: "Estate Agent",
      company: "Lew Geffen Sotheby's",
      phone: "+27 83 456 7890",
      email: "lerato.moloi@sothebys.co.za",
      notes: "Specialises in Rosebank and Sandton areas. 5% commission.",
    },
  });

  const contractor = await prisma.contact.create({
    data: {
      orgId,
      userId: user.id,
      name: "Thabo Mokoena",
      role: "contractor",
      profession: "General Contractor",
      company: "Mokoena Builders",
      phone: "+27 76 987 6543",
      email: "thabo@mokoenabuilders.co.za",
      dailyRate: 1500,
      bankName: "Capitec",
      accountNumber: "1234567890",
      branchCode: "470010",
      accountType: "savings",
      notes: "Good for demolition, tiling, and general reno work.",
    },
  });

  console.log("Contacts created: 4");

  // ─── Deal 1: Rosebank (renovation) ───
  const deal1 = await prisma.deal.create({
    data: {
      orgId,
      userId: user.id,
      name: "12 Oak Lane, Rosebank",
      address: "12 Oak Lane, Rosebank, Johannesburg, 2196",
      purchasePrice: 1200000,
      expectedSalePrice: 1850000,
      stage: "renovation",
      priority: "high",
      notes: "3-bed, 2-bath. Full kitchen and bathroom renovation needed.",
      tags: JSON.stringify(["jhb", "reno", "3bed"]),
      data: {
        rooms: { bedrooms: 3, bathrooms: 2, garage: 1 },
        acquisition: { transferCost: 45000, bondRegistration: 12000 },
        holding: { monthlyBond: 12500, monthlyRates: 2800, monthlyInsurance: 950 },
        resale: { agentCommission: 5, complianceCerts: 8500 },
      },
      purchaseDate: new Date("2025-11-15"),
      transferDate: new Date("2025-12-20"),
    },
  });

  await prisma.expense.createMany({
    data: [
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Kitchen cabinets and countertops", amount: 45000, date: new Date("2026-01-10"), vendor: "Builders Warehouse", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Kitchen installation labour", amount: 18000, date: new Date("2026-01-15"), vendor: "Mokoena Builders", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal1.id, category: "plumbing", description: "Bathroom replumbing and fixtures", amount: 32000, date: new Date("2026-01-20"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal1.id, category: "electrical", description: "Rewiring and new DB board", amount: 28000, date: new Date("2026-02-01"), vendor: "Sparks Electrical CC", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Floor tiles (porcelain 60x60)", amount: 15500, date: new Date("2026-02-05"), vendor: "CTM", paymentMethod: "card" },
    ],
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Demolition & Strip-out",
      description: "Remove old kitchen, strip bathrooms, remove damaged flooring",
      status: "completed", order: 1,
      dueDate: new Date("2026-01-08"), completedDate: new Date("2026-01-07"),
      tasks: {
        create: [
          { title: "Remove old kitchen units", completed: true, completedAt: new Date("2026-01-05") },
          { title: "Strip bathroom tiles and fixtures", completed: true, completedAt: new Date("2026-01-06") },
          { title: "Remove damaged flooring", completed: true, completedAt: new Date("2026-01-07") },
        ],
      },
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Plumbing & Electrical Rough-in",
      description: "First fix plumbing and electrical work before tiling",
      status: "in_progress", order: 2,
      dueDate: new Date("2026-02-15"),
      assignedContractorId: plumber.id,
      tasks: {
        create: [
          { title: "Rough-in plumbing for kitchen", completed: true, completedAt: new Date("2026-01-22") },
          { title: "Rough-in plumbing for bathrooms", completed: true, completedAt: new Date("2026-01-25") },
          { title: "Electrical rewiring and new DB board", completed: false, dueDate: new Date("2026-02-10") },
          { title: "Install geyser", completed: false, dueDate: new Date("2026-02-12") },
        ],
      },
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Kitchen & Bathroom Fit-out",
      description: "Install new kitchen, tile bathrooms, fit vanities and shower",
      status: "pending", order: 3,
      dueDate: new Date("2026-03-10"),
      tasks: {
        create: [
          { title: "Install kitchen cabinets and countertop", completed: false },
          { title: "Tile bathroom floors and walls", completed: false },
          { title: "Install vanities, toilets, and shower screens", completed: false },
        ],
      },
    },
  });

  await prisma.dealContact.createMany({
    data: [
      { orgId, dealId: deal1.id, contactId: plumber.id, workDescription: "Full bathroom replumbing" },
      { orgId, dealId: deal1.id, contactId: electrician.id, workDescription: "Rewiring and compliance certificate" },
      { orgId, dealId: deal1.id, contactId: contractor.id, workDescription: "Kitchen demo and tiling", daysWorked: 12 },
    ],
  });

  console.log("Deal 1 (Rosebank): renovation stage");

  // ─── Deal 2: Camps Bay (listed) ───
  const deal2 = await prisma.deal.create({
    data: {
      orgId,
      userId: user.id,
      name: "45 Beach Road, Camps Bay",
      address: "45 Beach Road, Camps Bay, Cape Town, 8005",
      purchasePrice: 3500000,
      expectedSalePrice: 5200000,
      stage: "listed",
      priority: "high",
      notes: "4-bed, 3-bath with sea views. Full renovation completed. Listed with Sotheby's.",
      tags: JSON.stringify(["cpt", "luxury", "sea-view", "4bed"]),
      data: {
        rooms: { bedrooms: 4, bathrooms: 3, garage: 2 },
        acquisition: { transferCost: 120000, bondRegistration: 25000 },
        holding: { monthlyBond: 36500, monthlyRates: 5200, monthlyInsurance: 2100 },
        resale: { agentCommission: 5, complianceCerts: 12000 },
      },
      purchaseDate: new Date("2025-06-01"),
      transferDate: new Date("2025-07-15"),
      listedDate: new Date("2026-01-20"),
    },
  });

  await prisma.expense.createMany({
    data: [
      { orgId, userId: user.id, dealId: deal2.id, category: "materials", description: "Imported Italian floor tiles", amount: 95000, date: new Date("2025-08-10"), vendor: "Tile Africa", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal2.id, category: "labour", description: "Full renovation labour (8 weeks)", amount: 120000, date: new Date("2025-10-15"), vendor: "Mokoena Builders", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal2.id, category: "plumbing", description: "Complete replumbing with copper", amount: 68000, date: new Date("2025-09-01"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal2.id, category: "electrical", description: "Full rewire, smart home prep, LED downlights", amount: 52000, date: new Date("2025-09-20"), vendor: "Sparks Electrical CC", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal2.id, category: "materials", description: "Kitchen appliances (Smeg)", amount: 78000, date: new Date("2025-10-01"), vendor: "Hirsch's", paymentMethod: "card" },
    ],
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal2.id,
      title: "Structural Repairs", status: "completed", order: 1,
      dueDate: new Date("2025-08-15"), completedDate: new Date("2025-08-12"),
      tasks: { create: [
        { title: "Repair roof leaks", completed: true, completedAt: new Date("2025-08-05") },
        { title: "Damp proofing on south wall", completed: true, completedAt: new Date("2025-08-10") },
        { title: "Replace rotted window frames", completed: true, completedAt: new Date("2025-08-12") },
      ] },
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal2.id,
      title: "Interior Renovation", status: "completed", order: 2,
      dueDate: new Date("2025-10-30"), completedDate: new Date("2025-10-28"),
      tasks: { create: [
        { title: "Install new kitchen", completed: true, completedAt: new Date("2025-10-10") },
        { title: "Renovate all 3 bathrooms", completed: true, completedAt: new Date("2025-10-20") },
        { title: "Install flooring throughout", completed: true, completedAt: new Date("2025-10-25") },
        { title: "Paint interior", completed: true, completedAt: new Date("2025-10-28") },
      ] },
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal2.id,
      title: "Staging & Listing", status: "completed", order: 3,
      dueDate: new Date("2026-01-20"), completedDate: new Date("2026-01-18"),
      tasks: { create: [
        { title: "Professional staging", completed: true, completedAt: new Date("2026-01-15") },
        { title: "Professional photography", completed: true, completedAt: new Date("2026-01-16") },
        { title: "List on Property24 and Private Property", completed: true, completedAt: new Date("2026-01-18") },
      ] },
    },
  });

  await prisma.dealContact.createMany({
    data: [
      { orgId, dealId: deal2.id, contactId: agent.id, workDescription: "Listing and sales agent" },
      { orgId, dealId: deal2.id, contactId: contractor.id, workDescription: "Full renovation", daysWorked: 40 },
    ],
  });

  console.log("Deal 2 (Camps Bay): listed stage");

  // ─── Deal 3: Sandton (lead) ───
  const deal3 = await prisma.deal.create({
    data: {
      orgId,
      userId: user.id,
      name: "8 Main Street, Sandton",
      address: "8 Main Street, Sandton, Johannesburg, 2196",
      purchasePrice: 2100000,
      expectedSalePrice: 3100000,
      stage: "lead",
      priority: "medium",
      notes: "Potential deal from estate sale. Needs full inspection. 4-bed, 2-bath on large stand.",
      tags: JSON.stringify(["jhb", "estate-sale", "4bed"]),
      data: {
        rooms: { bedrooms: 4, bathrooms: 2, garage: 2 },
        acquisition: { transferCost: 75000, bondRegistration: 18000 },
        holding: { monthlyBond: 21800, monthlyRates: 3500, monthlyInsurance: 1200 },
        resale: { agentCommission: 5, complianceCerts: 10000 },
      },
      offerAmount: 1950000,
      offerDate: new Date("2026-02-10"),
    },
  });

  await prisma.expense.createMany({
    data: [
      { orgId, userId: user.id, dealId: deal3.id, category: "materials", description: "Estimated renovation materials", amount: 85000, date: new Date("2026-02-10"), isProjected: true },
      { orgId, userId: user.id, dealId: deal3.id, category: "labour", description: "Estimated labour costs", amount: 65000, date: new Date("2026-02-10"), isProjected: true },
      { orgId, userId: user.id, dealId: deal3.id, category: "plumbing", description: "Estimated plumbing overhaul", amount: 40000, date: new Date("2026-02-10"), isProjected: true },
    ],
  });

  console.log("Deal 3 (Sandton): lead stage");

  // ─── Deal 4: Stellenbosch (sold) ───
  const deal4 = await prisma.deal.create({
    data: {
      orgId,
      userId: user.id,
      name: "22 Protea Avenue, Stellenbosch",
      address: "22 Protea Avenue, Stellenbosch, Western Cape, 7600",
      purchasePrice: 1800000,
      expectedSalePrice: 2400000,
      actualSalePrice: 2450000,
      stage: "sold",
      priority: "low",
      notes: "3-bed Cape Dutch cottage. Cosmetic reno only. Sold above asking!",
      tags: JSON.stringify(["wc", "cape-dutch", "cosmetic", "3bed"]),
      data: {
        rooms: { bedrooms: 3, bathrooms: 2, garage: 1 },
        acquisition: { transferCost: 62000, bondRegistration: 15000 },
        holding: { monthlyBond: 18700, monthlyRates: 2200, monthlyInsurance: 850 },
        resale: { agentCommission: 5, complianceCerts: 7500 },
      },
      purchaseDate: new Date("2025-03-01"),
      transferDate: new Date("2025-04-15"),
      listedDate: new Date("2025-08-01"),
      soldDate: new Date("2025-09-20"),
      actualSaleDate: new Date("2025-10-30"),
    },
  });

  await prisma.expense.createMany({
    data: [
      { orgId, userId: user.id, dealId: deal4.id, category: "materials", description: "Paint (Plascon double velvet, 60L)", amount: 12000, date: new Date("2025-05-05"), vendor: "Mica Hardware", paymentMethod: "card" },
      { orgId, userId: user.id, dealId: deal4.id, category: "labour", description: "Painting labour (interior and exterior)", amount: 22000, date: new Date("2025-05-20"), vendor: "Mokoena Builders", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "materials", description: "Landscaping plants and irrigation", amount: 18000, date: new Date("2025-06-01"), vendor: "Stodels Nursery", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "electrical", description: "COC certificate and minor fixes", amount: 8500, date: new Date("2025-06-10"), vendor: "Sparks Electrical CC", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "plumbing", description: "Plumbing COC and geyser service", amount: 6500, date: new Date("2025-06-12"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft" },
    ],
  });

  await prisma.dealContact.createMany({
    data: [
      { orgId, dealId: deal4.id, contactId: agent.id, workDescription: "Sales agent for Stellenbosch property" },
      { orgId, dealId: deal4.id, contactId: electrician.id, workDescription: "COC certificate" },
      { orgId, dealId: deal4.id, contactId: plumber.id, workDescription: "Plumbing COC and geyser service" },
    ],
  });

  console.log("Deal 4 (Stellenbosch): sold stage");

  // ─── Tools ───
  await prisma.tool.createMany({
    data: [
      {
        orgId, userId: user.id,
        name: "Angle Grinder", category: "power_tools", brand: "Bosch", model: "GWS 750-115",
        serialNumber: "BSH-AG-2024-001", purchaseDate: new Date("2024-06-15"),
        purchaseCost: 1299, expectedLifespanMonths: 36, replacementCost: 1499,
        status: "checked_out", condition: "good",
        currentHolderName: "Thabo Mokoena", currentHolderId: contractor.id,
        currentDealId: deal1.id, currentDealName: "12 Oak Lane, Rosebank",
        notes: "115mm disc. Used for tile cutting and general grinding.",
      },
      {
        orgId, userId: user.id,
        name: "Cordless Drill", category: "power_tools", brand: "Makita", model: "DHP482",
        serialNumber: "MKT-CD-2024-003", purchaseDate: new Date("2024-03-10"),
        purchaseCost: 3499, expectedLifespanMonths: 48, replacementCost: 3799,
        status: "available", condition: "good",
        notes: "18V Li-ion with 2x 3.0Ah batteries. Comes with full bit set.",
      },
      {
        orgId, userId: user.id,
        name: "Laser Level", category: "measuring", brand: "Bosch", model: "GLL 3-80",
        serialNumber: "BSH-LL-2025-002", purchaseDate: new Date("2025-01-20"),
        purchaseCost: 5999, expectedLifespanMonths: 60, replacementCost: 6499,
        status: "available", condition: "new",
        notes: "360-degree line laser. Essential for tiling and cabinetry.",
      },
    ],
  });

  console.log("Tools created: 3");

  // ─── Invoices ───
  await prisma.invoice.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      invoiceNumber: "INV-2026-001", contactId: plumber.id,
      status: "paid", issueDate: new Date("2026-01-25"), dueDate: new Date("2026-02-08"),
      subtotal: 32000, tax: 4800, total: 36800,
      notes: "Bathroom replumbing - 12 Oak Lane, Rosebank",
      lineItems: [
        { description: "Labour - bathroom replumbing (5 days)", quantity: 5, unitPrice: 1800, amount: 9000 },
        { description: "Copper piping and fittings", quantity: 1, unitPrice: 12000, amount: 12000 },
        { description: "Bathroom fixtures (taps, showerhead, mixer)", quantity: 1, unitPrice: 8500, amount: 8500 },
        { description: "Geyser valve and pressure regulator", quantity: 1, unitPrice: 2500, amount: 2500 },
      ],
    },
  });

  await prisma.invoice.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      invoiceNumber: "INV-2026-002", contactId: electrician.id,
      status: "sent", issueDate: new Date("2026-02-05"), dueDate: new Date("2026-02-19"),
      subtotal: 28000, tax: 4200, total: 32200,
      notes: "Electrical rewiring and DB board - 12 Oak Lane, Rosebank",
      lineItems: [
        { description: "Labour - rewiring (6 days)", quantity: 6, unitPrice: 2200, amount: 13200 },
        { description: "New DB board and breakers", quantity: 1, unitPrice: 6800, amount: 6800 },
        { description: "Wiring, conduit, and accessories", quantity: 1, unitPrice: 5500, amount: 5500 },
        { description: "LED downlights (12 units)", quantity: 12, unitPrice: 210, amount: 2520 },
      ],
    },
  });

  console.log("Invoices created: 2");

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
