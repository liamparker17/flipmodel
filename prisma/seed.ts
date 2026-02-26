import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { scrypt, randomBytes } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Inline password hashing for seed (matches app/lib/password.ts format)
function hashPasswordSync(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function main() {
  console.log("Seeding database...");

  // ─── Demo User ───
  const passwordHash = await hashPasswordSync("demo1234");

  const user = await prisma.user.upsert({
    where: { email: "demo@flipmodel.co.za" },
    update: { passwordHash },
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

  // ─── Additional Role Users ───
  const financeUser = await prisma.user.upsert({
    where: { email: "finance@flipmodel.co.za" },
    update: { passwordHash },
    create: {
      email: "finance@flipmodel.co.za",
      name: "Nomsa Dlamini",
      company: "FlipModel Properties",
      passwordHash,
    },
  });

  const pmUser = await prisma.user.upsert({
    where: { email: "pm@flipmodel.co.za" },
    update: { passwordHash },
    create: {
      email: "pm@flipmodel.co.za",
      name: "Pieter Botha",
      company: "FlipModel Properties",
      passwordHash,
    },
  });

  const supervisorUser = await prisma.user.upsert({
    where: { email: "supervisor@flipmodel.co.za" },
    update: { passwordHash },
    create: {
      email: "supervisor@flipmodel.co.za",
      name: "Bongani Zulu",
      company: "FlipModel Properties",
      passwordHash,
    },
  });

  const fieldUser = await prisma.user.upsert({
    where: { email: "field@flipmodel.co.za" },
    update: { passwordHash },
    create: {
      email: "field@flipmodel.co.za",
      name: "Mandla Khumalo",
      company: "FlipModel Properties",
      passwordHash,
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@flipmodel.co.za" },
    update: { passwordHash },
    create: {
      email: "viewer@flipmodel.co.za",
      name: "Sarah van Niekerk",
      company: "FlipModel Properties",
      passwordHash,
    },
  });

  console.log("Role users created: 6");

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

  // ─── Departments ───
  const constructionDept = await prisma.department.upsert({
    where: { id: "dept-construction" },
    update: {},
    create: { id: "dept-construction", orgId: org.id, name: "Construction" },
  });

  const financeDept = await prisma.department.upsert({
    where: { id: "dept-finance" },
    update: {},
    create: { id: "dept-finance", orgId: org.id, name: "Finance" },
  });

  // ─── OrgMembers for all roles ───
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: financeUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: financeUser.id,
      role: "finance_manager",
      title: "Financial Manager",
      departmentId: financeDept.id,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: pmUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: pmUser.id,
      role: "project_manager",
      title: "Project Manager",
      departmentId: constructionDept.id,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: supervisorUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: supervisorUser.id,
      role: "site_supervisor",
      title: "Site Supervisor",
      departmentId: constructionDept.id,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: fieldUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: fieldUser.id,
      role: "field_worker",
      title: "General Labourer",
      departmentId: constructionDept.id,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: viewerUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: viewerUser.id,
      role: "viewer",
      title: "Investor",
    },
  });

  console.log(`Organisation: ${org.name} (${org.id})`);
  console.log("All 6 role members created");

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
        mode: "quick",
        acq: { purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 12000, initialRepairs: 0 },
        prop: { totalSqm: 150, erfSize: 450, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 4, ratesAndTaxes: 2800, utilities: 1200, insurance: 950, security: 0, levies: 0 },
        resale: { expectedPrice: 1850000, areaBenchmarkPsqm: 12000, agentCommission: 5 },
        quickRenoEstimate: 300000,
      },
      purchaseDate: new Date("2025-11-15"),
      transferDate: new Date("2025-12-20"),
    },
  });

  await prisma.expense.createMany({
    skipDuplicates: true,
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
    skipDuplicates: true,
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
        mode: "quick",
        acq: { purchasePrice: 3500000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 120000, bondRegistration: 25000, initialRepairs: 0 },
        prop: { totalSqm: 280, erfSize: 800, bedrooms: 4, bathrooms: 3, garages: 2, stories: "double" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 5, ratesAndTaxes: 5200, utilities: 2000, insurance: 2100, security: 3500, levies: 0 },
        resale: { expectedPrice: 5200000, areaBenchmarkPsqm: 22000, agentCommission: 5 },
        quickRenoEstimate: 800000,
      },
      purchaseDate: new Date("2025-06-01"),
      transferDate: new Date("2025-07-15"),
      listedDate: new Date("2026-01-20"),
    },
  });

  await prisma.expense.createMany({
    skipDuplicates: true,
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
    skipDuplicates: true,
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
        mode: "quick",
        acq: { purchasePrice: 2100000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 75000, bondRegistration: 18000, initialRepairs: 0 },
        prop: { totalSqm: 220, erfSize: 900, bedrooms: 4, bathrooms: 2, garages: 2, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 4, ratesAndTaxes: 3500, utilities: 1500, insurance: 1200, security: 2000, levies: 0 },
        resale: { expectedPrice: 3100000, areaBenchmarkPsqm: 15000, agentCommission: 5 },
        quickRenoEstimate: 450000,
      },
      offerAmount: 1950000,
      offerDate: new Date("2026-02-10"),
    },
  });

  await prisma.expense.createMany({
    skipDuplicates: true,
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
        mode: "quick",
        acq: { purchasePrice: 1800000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 62000, bondRegistration: 15000, initialRepairs: 0 },
        prop: { totalSqm: 160, erfSize: 500, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 3, ratesAndTaxes: 2200, utilities: 900, insurance: 850, security: 0, levies: 0 },
        resale: { expectedPrice: 2400000, areaBenchmarkPsqm: 14000, agentCommission: 5 },
        quickRenoEstimate: 150000,
      },
      purchaseDate: new Date("2025-03-01"),
      transferDate: new Date("2025-04-15"),
      listedDate: new Date("2025-08-01"),
      soldDate: new Date("2025-09-20"),
      actualSaleDate: new Date("2025-10-30"),
    },
  });

  await prisma.expense.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, dealId: deal4.id, category: "materials", description: "Paint (Plascon double velvet, 60L)", amount: 12000, date: new Date("2025-05-05"), vendor: "Mica Hardware", paymentMethod: "card" },
      { orgId, userId: user.id, dealId: deal4.id, category: "labour", description: "Painting labour (interior and exterior)", amount: 22000, date: new Date("2025-05-20"), vendor: "Mokoena Builders", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "materials", description: "Landscaping plants and irrigation", amount: 18000, date: new Date("2025-06-01"), vendor: "Stodels Nursery", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "electrical", description: "COC certificate and minor fixes", amount: 8500, date: new Date("2025-06-10"), vendor: "Sparks Electrical CC", paymentMethod: "eft" },
      { orgId, userId: user.id, dealId: deal4.id, category: "plumbing", description: "Plumbing COC and geyser service", amount: 6500, date: new Date("2025-06-12"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft" },
    ],
  });

  await prisma.dealContact.createMany({
    skipDuplicates: true,
    data: [
      { orgId, dealId: deal4.id, contactId: agent.id, workDescription: "Sales agent for Stellenbosch property" },
      { orgId, dealId: deal4.id, contactId: electrician.id, workDescription: "COC certificate" },
      { orgId, dealId: deal4.id, contactId: plumber.id, workDescription: "Plumbing COC and geyser service" },
    ],
  });

  console.log("Deal 4 (Stellenbosch): sold stage");

  // ─── Deal 5: Greenpoint (purchased, early stage) ───
  const deal5 = await prisma.deal.create({
    data: {
      orgId,
      userId: user.id,
      name: "7 Loader Street, Green Point",
      address: "7 Loader Street, Green Point, Cape Town, 8005",
      purchasePrice: 2800000,
      expectedSalePrice: 4100000,
      stage: "purchased",
      priority: "high",
      notes: "3-bed apartment with mountain views. Transfer complete, planning renovation.",
      tags: JSON.stringify(["cpt", "apartment", "mountain-view", "3bed"]),
      data: {
        mode: "quick",
        acq: { purchasePrice: 2800000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 95000, bondRegistration: 20000, initialRepairs: 0 },
        prop: { totalSqm: 130, erfSize: 0, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [], nextRoomId: 0, contractors: [],
        costDb: {}, contingencyPct: 10, pmPct: 8,
        holding: { renovationMonths: 4, ratesAndTaxes: 4100, utilities: 1800, insurance: 1500, security: 2500, levies: 3200 },
        resale: { expectedPrice: 4100000, areaBenchmarkPsqm: 28000, agentCommission: 5 },
        quickRenoEstimate: 500000,
      },
      purchaseDate: new Date("2026-01-15"),
      transferDate: new Date("2026-02-20"),
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal5.id,
      title: "Planning & Design",
      description: "Architect drawings, council approval, contractor quotes",
      status: "in_progress", order: 1,
      dueDate: new Date("2026-03-15"),
      tasks: {
        create: [
          { title: "Get architect drawings", completed: true, completedAt: new Date("2026-02-25"), assignedTo: pmUser.name },
          { title: "Submit to council for approval", completed: false, dueDate: new Date("2026-03-05"), assignedTo: pmUser.name },
          { title: "Get 3 contractor quotes", completed: false, dueDate: new Date("2026-03-10"), assignedTo: pmUser.name },
          { title: "Finalise renovation scope", completed: false, dueDate: new Date("2026-03-15"), assignedTo: supervisorUser.name },
        ],
      },
    },
  });

  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal5.id,
      title: "Demolition",
      description: "Strip out old kitchen, bathrooms, and flooring",
      status: "pending", order: 2,
      dueDate: new Date("2026-04-01"),
      tasks: {
        create: [
          { title: "Remove old kitchen units", completed: false, dueDate: new Date("2026-03-20"), assignedTo: fieldUser.name },
          { title: "Strip bathroom tiles", completed: false, dueDate: new Date("2026-03-22"), assignedTo: fieldUser.name },
          { title: "Remove flooring", completed: false, dueDate: new Date("2026-03-25"), assignedTo: fieldUser.name },
          { title: "Clear rubble and disposal", completed: false, dueDate: new Date("2026-03-28"), assignedTo: supervisorUser.name },
        ],
      },
    },
  });

  await prisma.expense.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, dealId: deal5.id, category: "materials", description: "Estimated kitchen & bathroom materials", amount: 120000, date: new Date("2026-02-20"), isProjected: true },
      { orgId, userId: user.id, dealId: deal5.id, category: "labour", description: "Estimated labour (6 weeks)", amount: 90000, date: new Date("2026-02-20"), isProjected: true },
    ],
  });

  await prisma.dealContact.createMany({
    skipDuplicates: true,
    data: [
      { orgId, dealId: deal5.id, contactId: contractor.id, workDescription: "Main contractor for renovation" },
      { orgId, dealId: deal5.id, contactId: plumber.id, workDescription: "Bathroom plumbing" },
    ],
  });

  console.log("Deal 5 (Green Point): purchased stage");

  // ─── Documents ───
  await prisma.document.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, dealId: deal1.id, name: "Title Deed - 12 Oak Lane", type: "title_deed", url: "https://example.com/docs/title-deed-rosebank.pdf", notes: "Original title deed from transfer attorney" },
      { orgId, userId: user.id, dealId: deal1.id, name: "Floor Plan - Ground Floor", type: "floor_plan", url: "https://example.com/docs/floor-plan-rosebank.pdf", notes: "Architect drawing showing kitchen layout changes" },
      { orgId, userId: user.id, dealId: deal1.id, name: "Electrical COC", type: "compliance_certificate", url: "https://example.com/docs/coc-electrical-rosebank.pdf", notes: "Pending - to be issued after rewiring complete" },
      { orgId, userId: user.id, dealId: deal2.id, name: "Valuation Report - Camps Bay", type: "valuation", url: "https://example.com/docs/valuation-camps-bay.pdf", notes: "Bank valuation for bond application" },
      { orgId, userId: user.id, dealId: deal2.id, name: "Offer to Purchase", type: "offer_to_purchase", url: "https://example.com/docs/otp-camps-bay.pdf" },
      { orgId, userId: user.id, dealId: deal5.id, name: "Architect Drawings - Green Point", type: "floor_plan", url: "https://example.com/docs/architect-greenpoint.pdf", notes: "Renovation layout plan from architect" },
      { orgId, userId: user.id, dealId: deal5.id, name: "Council Submission", type: "other", url: "https://example.com/docs/council-greenpoint.pdf", notes: "Building plan submission to City of Cape Town" },
    ],
  });

  console.log("Documents created: 7");

  // ─── Notifications ───
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, type: "deadline_warning", title: "Task overdue: Electrical rewiring", message: "The electrical rewiring task at 12 Oak Lane is past its due date.", read: false },
      { orgId, userId: pmUser.id, type: "milestone_overdue", title: "Milestone due soon: Planning & Design", message: "Planning & Design at 7 Loader Street is due in 2 weeks.", read: false },
      { orgId, userId: supervisorUser.id, type: "general", title: "New task assigned: Clear rubble", message: "You have been assigned to clear rubble at 7 Loader Street.", read: false },
      { orgId, userId: fieldUser.id, type: "general", title: "New tasks assigned", message: "You have 3 new tasks at 7 Loader Street, Green Point.", read: false },
      { orgId, userId: financeUser.id, type: "deadline_warning", title: "Invoice overdue: INV-2026-002", message: "Invoice INV-2026-002 from Sparks Electrical is past due.", read: false },
    ],
  });

  console.log("Notifications created: 5");

  // ─── Bank Account ───
  await prisma.bankAccount.create({
    data: {
      orgId,
      name: "FlipModel Business Account",
      bankName: "FNB",
      accountNumber: "62800001234",
      branchCode: "250655",
      accountType: "business",
      currency: "ZAR",
      currentBalance: 1250000,
    },
  });

  console.log("Bank account created: 1");

  // ─── Tools ───
  await prisma.tool.createMany({
    skipDuplicates: true,
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

  // Tool checked out to field worker
  await prisma.tool.create({
    data: {
      orgId, userId: user.id,
      name: "Circular Saw", category: "power_tools", brand: "DeWalt", model: "DWE575",
      serialNumber: "DW-CS-2025-001", purchaseDate: new Date("2025-02-15"),
      purchaseCost: 2899, expectedLifespanMonths: 48, replacementCost: 3199,
      status: "checked_out", condition: "good",
      currentHolderName: fieldUser.name, currentHolderId: fieldUser.id,
      currentDealId: deal1.id, currentDealName: "12 Oak Lane, Rosebank",
      notes: "185mm blade. For cutting floor boards and skirting.",
    },
  });

  // Tool in maintenance
  await prisma.tool.create({
    data: {
      orgId, userId: user.id,
      name: "Rotary Hammer Drill", category: "power_tools", brand: "Hilti", model: "TE 30-A36",
      serialNumber: "HLT-RH-2024-002", purchaseDate: new Date("2024-09-01"),
      purchaseCost: 8999, expectedLifespanMonths: 60, replacementCost: 9499,
      status: "maintenance", condition: "fair",
      notes: "SDS-plus. Chuck needs servicing — sent to Hilti centre.",
    },
  });

  console.log("Tools created: 5");

  // ─── Employees (HR module) ───
  await prisma.employee.createMany({
    skipDuplicates: true,
    data: [
      {
        orgId, userId: supervisorUser.id,
        employeeNumber: "EMP-001", firstName: "Bongani", lastName: "Zulu",
        email: "supervisor@flipmodel.co.za", phone: "+27 82 111 2222",
        position: "Site Supervisor", department: "Construction",
        startDate: new Date("2024-06-01"), employmentType: "full_time",
        status: "active", baseSalary: 28000, taxNumber: "9876543210",
      },
      {
        orgId, userId: fieldUser.id,
        employeeNumber: "EMP-002", firstName: "Mandla", lastName: "Khumalo",
        email: "field@flipmodel.co.za", phone: "+27 73 333 4444",
        position: "General Labourer", department: "Construction",
        startDate: new Date("2025-01-15"), employmentType: "full_time",
        status: "active", baseSalary: 12000, taxNumber: "1122334455",
      },
      {
        orgId, userId: financeUser.id,
        employeeNumber: "EMP-003", firstName: "Nomsa", lastName: "Dlamini",
        email: "finance@flipmodel.co.za", phone: "+27 84 555 6666",
        position: "Financial Manager", department: "Finance",
        startDate: new Date("2024-03-01"), employmentType: "full_time",
        status: "active", baseSalary: 45000, taxNumber: "5566778899",
      },
      {
        orgId, userId: pmUser.id,
        employeeNumber: "EMP-004", firstName: "Pieter", lastName: "Botha",
        email: "pm@flipmodel.co.za", phone: "+27 61 777 8888",
        position: "Project Manager", department: "Construction",
        startDate: new Date("2024-08-01"), employmentType: "full_time",
        status: "active", baseSalary: 38000, taxNumber: "6677889900",
      },
    ],
  });

  console.log("Employees created: 4");

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
