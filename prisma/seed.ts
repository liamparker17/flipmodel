import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { scrypt, randomBytes } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
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

export async function seed() {
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
  // wipe any existing deals for this org so demo dataset is deterministically rebuilt
  // Delete in dependency order (children before parents)
  await prisma.receivablePayment.deleteMany({ where: { orgId } });
  await prisma.customerReceivable.deleteMany({ where: { orgId } });
  await prisma.billPayment.deleteMany({ where: { orgId } });
  await prisma.vendorBill.deleteMany({ where: { orgId } });
  await prisma.journalEntry.deleteMany({ where: { orgId } });
  await prisma.journalEntrySequence.deleteMany({ where: { orgId } });
  await prisma.goodsReceipt.deleteMany({ where: { orgId } });
  await prisma.purchaseOrder.deleteMany({ where: { orgId } });
  await prisma.inventoryTransaction.deleteMany({ where: { orgId } });
  await prisma.inventoryItem.deleteMany({ where: { orgId } });
  await prisma.bankTransaction.deleteMany({ where: { orgId } });
  await prisma.bankAccount.deleteMany({ where: { orgId } });
  await prisma.chartOfAccount.deleteMany({ where: { orgId } });
  await prisma.financialPeriod.deleteMany({ where: { orgId } });
  await prisma.inspection.deleteMany({ where: { orgId } });
  await prisma.permit.deleteMany({ where: { orgId } });
  await prisma.comparableSale.deleteMany({ where: { orgId } });
  await prisma.insurancePolicy.deleteMany({ where: { orgId } });
  await prisma.contractorRating.deleteMany({ where: { orgId } });
  await prisma.leaveRecord.deleteMany({ where: { orgId } });
  await prisma.payslip.deleteMany({ where: { orgId } });
  await prisma.notification.deleteMany({ where: { orgId } });
  await prisma.shoppingListItem.deleteMany({ where: { orgId } });
  await prisma.deal.deleteMany({ where: { orgId } });
  await prisma.contact.deleteMany({ where: { orgId } });
  await prisma.tool.deleteMany({ where: { orgId } });
  await prisma.employee.deleteMany({ where: { orgId } });
  await prisma.invoice.deleteMany({ where: { orgId } });
  console.log("Existing demo data wiped for clean reseed");

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
      stage: "renovating",
      priority: "high",
      notes: "3-bed, 2-bath. Full kitchen and bathroom renovation needed.",
      tags: JSON.stringify(["jhb", "reno", "3bed"]),
      data: {
        mode: "quick",
        acq: { purchasePrice: 1200000, deposit: 0, bondRate: 12.75, bondTerm: 240, cashPurchase: false, transferAttorneyFees: 45000, bondRegistration: 12000, initialRepairs: 0 },
        prop: { totalSqm: 150, erfSize: 450, bedrooms: 3, bathrooms: 2, garages: 1, stories: "single" },
        rooms: [
          {
            id: "room-1",
            type: "kitchen",
            name: "Kitchen",
            sqm: 16,
            estimate: 68500,
            status: "in_progress",
            items: [
              { key: "cabinetry", label: "Cabinetry", unit: "lm", qty: 4, unitPrice: 4500, amount: 18000, completed: true },
              { key: "countertops", label: "Countertops", unit: "lm", qty: 4, unitPrice: 3800, amount: 15200, completed: true },
              { key: "sink", label: "Sink & Tap", unit: "unit", qty: 1, unitPrice: 6300, amount: 6300, completed: true },
              { key: "splashback", label: "Splashback tiling", unit: "sqm", qty: 3, unitPrice: 650, amount: 1950, completed: false },
              { key: "appliances", label: "Built-in appliances", unit: "fixed", qty: 1, unitPrice: 25000, amount: 25000, completed: false },
              { key: "electrical", label: "Electrical points (8)", unit: "point", qty: 8, unitPrice: 850, amount: 6800, completed: false },
            ],
          },
          {
            id: "room-2",
            type: "bathroom",
            name: "Main Bathroom",
            sqm: 8,
            estimate: 42800,
            status: "in_progress",
            items: [
              { key: "toilet", label: "Toilet", unit: "unit", qty: 1, unitPrice: 3500, amount: 3500, completed: true },
              { key: "basin", label: "Basin & Vanity", unit: "unit", qty: 1, unitPrice: 8300, amount: 8300, completed: true },
              { key: "showerBath", label: "Shower with glass screen", unit: "unit", qty: 1, unitPrice: 14500, amount: 14500, completed: false },
              { key: "taps", label: "Taps & mixers (2)", unit: "unit", qty: 2, unitPrice: 3200, amount: 6400, completed: true },
              { key: "floorTiles", label: "Floor tiles", unit: "sqm", qty: 8, unitPrice: 650, amount: 5200, completed: false },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 12, unitPrice: 650, amount: 7800, completed: false },
              { key: "extractorFan", label: "Extractor fan", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-3",
            type: "bathroom",
            name: "Ensuite",
            sqm: 5,
            estimate: 28500,
            status: "planned",
            items: [
              { key: "toilet", label: "Toilet", unit: "unit", qty: 1, unitPrice: 3500, amount: 3500, completed: false },
              { key: "basin", label: "Wall-mounted basin", unit: "unit", qty: 1, unitPrice: 5500, amount: 5500, completed: false },
              { key: "shower", label: "Shower enclosure", unit: "unit", qty: 1, unitPrice: 8500, amount: 8500, completed: false },
              { key: "floorTiles", label: "Floor tiles", unit: "sqm", qty: 5, unitPrice: 650, amount: 3250, completed: false },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 7.5, unitPrice: 650, amount: 4875, completed: false },
              { key: "mirror", label: "Mirror & lights", unit: "unit", qty: 1, unitPrice: 2800, amount: 2800, completed: false },
            ],
          },
          {
            id: "room-4",
            type: "bedroom",
            name: "Master Bedroom",
            sqm: 22,
            estimate: 18240,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 22, unitPrice: 320, amount: 7040, completed: false },
              { key: "painting", label: "Painting (walls)", unit: "sqm", qty: 45, unitPrice: 120, amount: 5400, completed: false },
              { key: "lightFittings", label: "Light fittings (2)", unit: "unit", qty: 2, unitPrice: 1200, amount: 2400, completed: false },
              { key: "electrical", label: "Electrical points (4)", unit: "point", qty: 4, unitPrice: 850, amount: 3400, completed: false },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 14,
            estimate: 10000,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 14, unitPrice: 320, amount: 4480, completed: false },
              { key: "painting", label: "Painting (walls)", unit: "sqm", qty: 36, unitPrice: 120, amount: 4320, completed: false },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3",
            sqm: 12,
            estimate: 9000,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 12, unitPrice: 320, amount: 3840, completed: false },
              { key: "painting", label: "Painting (walls)", unit: "sqm", qty: 33, unitPrice: 120, amount: 3960, completed: false },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Dining",
            sqm: 30,
            estimate: 30360,
            status: "planned",
            items: [
              { key: "flooring", label: "Porcelain floor tiles", unit: "sqm", qty: 30, unitPrice: 480, amount: 14400, completed: false },
              { key: "painting", label: "Painting (walls)", unit: "sqm", qty: 53, unitPrice: 120, amount: 6360, completed: false },
              { key: "lightFittings", label: "Light fittings (3)", unit: "unit", qty: 3, unitPrice: 1500, amount: 4500, completed: false },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 850, amount: 5100, completed: false },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Passage",
            sqm: 8,
            estimate: 7080,
            status: "planned",
            items: [
              { key: "flooring", label: "Tile flooring", unit: "sqm", qty: 8, unitPrice: 480, amount: 3840, completed: false },
              { key: "painting", label: "Painting (walls)", unit: "sqm", qty: 27, unitPrice: 120, amount: 3240, completed: false },
            ],
          },
        ],
        nextRoomId: 9,
        contractors: [],
        costDb: {},
        contingencyPct: 10,
        pmPct: 8,
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
      // Completed expenses
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Demolition waste removal", amount: 8500, date: new Date("2025-12-28"), vendor: "Waste Removal SA", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Demolition and strip-out labour (5 days)", amount: 12000, date: new Date("2026-01-05"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Structural inspection and repairs", amount: 6500, date: new Date("2026-01-08"), vendor: "BuildTest CC", paymentMethod: "card", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "plumbing", description: "Rough-in plumbing - kitchen & bathrooms", amount: 16800, date: new Date("2026-01-15"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "electrical", description: "Electrical rough-in and DB board", amount: 24500, date: new Date("2026-01-20"), vendor: "Sparks Electrical CC", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Geyser and hot water pipes", amount: 8200, date: new Date("2026-01-22"), vendor: "Builders Warehouse", paymentMethod: "card", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Plasterboard and drywall materials", amount: 12500, date: new Date("2026-01-25"), vendor: "Plasterboard SA", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Plastering and drywall labour (6 days)", amount: 14400, date: new Date("2026-02-02"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: false },
      
      // In-progress expenses
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Kitchen cabinets and countertops", amount: 45000, date: new Date("2026-02-05"), vendor: "Builders Warehouse", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Floor tiles (porcelain 60x60)", amount: 15500, date: new Date("2026-02-05"), vendor: "CTM", paymentMethod: "card", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Bathroom tiles and grout", amount: 8900, date: new Date("2026-02-08"), vendor: "CTM", paymentMethod: "card", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Kitchen installation labour", amount: 18000, date: new Date("2026-02-10"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: false },
      { orgId, userId: user.id, dealId: deal1.id, category: "plumbing", description: "Bathroom replumbing and fixtures", amount: 32000, date: new Date("2026-02-12"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft", isProjected: false },
      
      // Projected/upcoming expenses
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Flooring installation labour (4 days)", amount: 9600, date: new Date("2026-02-20"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Tiling labour for bathrooms (3 days)", amount: 7200, date: new Date("2026-02-25"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Paint and primer (15 rooms)", amount: 9800, date: new Date("2026-03-01"), vendor: "Builders Warehouse", paymentMethod: "card", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Painting labour (5 days)", amount: 12000, date: new Date("2026-03-05"), vendor: "Mokoena Builders", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Light fittings and switches (complete set)", amount: 11200, date: new Date("2026-03-08"), vendor: "Hirsch's", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Final electrical inspection and COC", amount: 5500, date: new Date("2026-03-12"), vendor: "Sparks Electrical CC", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "labour", description: "Plumbing final inspection", amount: 3200, date: new Date("2026-03-14"), vendor: "Ndlovu Plumbing Services", paymentMethod: "eft", isProjected: true },
      { orgId, userId: user.id, dealId: deal1.id, category: "materials", description: "Contingency - punch-list items", amount: 15000, date: new Date("2026-03-20"), vendor: "Various", paymentMethod: "eft", isProjected: true },
    ],
  });

  // Phase 1: Demolition & Strip-out
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Demolition & Strip-out",
      description: "Remove old kitchen, bathrooms, flooring, prepare for major works",
      status: "completed", order: 1,
      dueDate: new Date("2026-01-08"), completedDate: new Date("2026-01-07"),
      assignedContractorId: contractor.id,
      tasks: {
        create: [
          { title: "Assess and mark areas for demolition", completed: true, completedAt: new Date("2026-01-02") },
          { title: "Remove old kitchen units and appliances", completed: true, completedAt: new Date("2026-01-04") },
          { title: "Strip bathroom tiles, fixtures and fittings", completed: true, completedAt: new Date("2026-01-05") },
          { title: "Remove damaged and deteriorated flooring", completed: true, completedAt: new Date("2026-01-06") },
          { title: "Clear and remove all waste", completed: true, completedAt: new Date("2026-01-07") },
        ],
      },
    },
  });

  // Phase 2: Structural & Pest Treatment
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Structural Repairs & Treatment",
      description: "Address any structural issues, damp proofing, pest treatment",
      status: "completed", order: 2,
      dueDate: new Date("2026-01-15"), completedDate: new Date("2026-01-14"),
      tasks: {
        create: [
          { title: "Inspect for structural damage and cracks", completed: true, completedAt: new Date("2026-01-08") },
          { title: "Apply damp proofing to affected areas", completed: true, completedAt: new Date("2026-01-10") },
          { title: "Treat for termites and pests", completed: true, completedAt: new Date("2026-01-12") },
          { title: "Repair any cracked walls or ceilings", completed: true, completedAt: new Date("2026-01-14") },
        ],
      },
    },
  });

  // Phase 3: Plumbing & Electrical Rough-in
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Plumbing & Electrical Rough-in",
      description: "First fix plumbing and electrical - all pipes and wiring laid out",
      status: "in_progress", order: 3,
      dueDate: new Date("2026-02-10"),
      assignedContractorId: plumber.id,
      tasks: {
        create: [
          { title: "Rough-in plumbing for kitchen sink and appliances", completed: true, completedAt: new Date("2026-01-20") },
          { title: "Rough-in plumbing for main bathroom", completed: true, completedAt: new Date("2026-01-22") },
          { title: "Rough-in plumbing for ensuite and second bathroom", completed: true, completedAt: new Date("2026-01-24") },
          { title: "Install geyser and hot water connections", completed: true, completedAt: new Date("2026-01-26") },
          { title: "Electrical cabling throughout property", completed: false, dueDate: new Date("2026-02-05") },
          { title: "Install new DB board and earthing", completed: false, dueDate: new Date("2026-02-08") },
          { title: "Electrical COC inspection", completed: false, dueDate: new Date("2026-02-10") },
        ],
      },
    },
  });

  // Phase 4: Plastering & Drywall
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Plastering & Drywall",
      description: "Prepare all surfaces with drywall and plaster ready for painting",
      status: "in_progress", order: 4,
      dueDate: new Date("2026-02-18"),
      tasks: {
        create: [
          { title: "Install plasterboard to walls (kitchen, bathrooms)", completed: true, completedAt: new Date("2026-02-01") },
          { title: "Plaster and skim finish all walls", completed: true, completedAt: new Date("2026-02-08") },
          { title: "Fill and sand all joints and imperfections", completed: false, dueDate: new Date("2026-02-15") },
          { title: "Patch and repair damaged ceiling areas", completed: false, dueDate: new Date("2026-02-16") },
          { title: "Final plaster prep for painting", completed: false, dueDate: new Date("2026-02-18") },
        ],
      },
    },
  });

  // Phase 5: Flooring Installation
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Flooring Installation",
      description: "Install all flooring - tiles, laminates, and other finishes",
      status: "pending", order: 5,
      dueDate: new Date("2026-02-25"),
      tasks: {
        create: [
          { title: "Prepare and level all floor surfaces", completed: false, dueDate: new Date("2026-02-18") },
          { title: "Install porcelain tiles in kitchen and dining area", completed: false, dueDate: new Date("2026-02-20") },
          { title: "Install laminate flooring in bedrooms", completed: false, dueDate: new Date("2026-02-22") },
          { title: "Install tile flooring in bathrooms", completed: false, dueDate: new Date("2026-02-24") },
          { title: "Grout, seal and finish all flooring", completed: false, dueDate: new Date("2026-02-25") },
        ],
      },
    },
  });

  // Phase 6: Bathroom & Kitchen Fit-out
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Kitchen & Bathroom Fit-out",
      description: "Install fixtures, fittings, cabinets and all bathroom items",
      status: "pending", order: 6,
      dueDate: new Date("2026-03-08"),
      tasks: {
        create: [
          { title: "Install kitchen cabinets and island", completed: false, dueDate: new Date("2026-02-20") },
          { title: "Install kitchen countertops and splashback", completed: false, dueDate: new Date("2026-02-22") },
          { title: "Install kitchen sink and taps", completed: false, dueDate: new Date("2026-02-23") },
          { title: "Install bathroom vanities and mirrors", completed: false, dueDate: new Date("2026-02-25") },
          { title: "Install toilets, baths and shower enclosures", completed: false, dueDate: new Date("2026-02-28") },
          { title: "Fit shower and bath screens and hardware", completed: false, dueDate: new Date("2026-03-02") },
          { title: "Install taps and bathroom fittings", completed: false, dueDate: new Date("2026-03-05") },
          { title: "Bathroom seal and final inspection", completed: false, dueDate: new Date("2026-03-08") },
        ],
      },
    },
  });

  // Phase 7: Finishes & Painting
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Painting & Interior Finishes",
      description: "Paint all interior surfaces and apply final finishes",
      status: "pending", order: 7,
      dueDate: new Date("2026-03-15"),
      tasks: {
        create: [
          { title: "Preparation - fill, sand, prime all surfaces", completed: false, dueDate: new Date("2026-03-01") },
          { title: "Paint bedrooms (2 coats)", completed: false, dueDate: new Date("2026-03-05") },
          { title: "Paint kitchen and dining area", completed: false, dueDate: new Date("2026-03-07") },
          { title: "Paint bathrooms and passages", completed: false, dueDate: new Date("2026-03-09") },
          { title: "Paint trim, doors and door frames", completed: false, dueDate: new Date("2026-03-12") },
          { title: "Touch-ups and final painting inspection", completed: false, dueDate: new Date("2026-03-15") },
        ],
      },
    },
  });

  // Phase 8: Final Fixtures & Testing
  await prisma.milestone.create({
    data: {
      orgId, userId: user.id, dealId: deal1.id,
      title: "Final Fixtures & Inspections",
      description: "Install all light fittings, do final electrical and plumbing checks",
      status: "pending", order: 8,
      dueDate: new Date("2026-03-20"),
      tasks: {
        create: [
          { title: "Install all light fittings and switches", completed: false, dueDate: new Date("2026-03-12") },
          { title: "Install skirting and trim", completed: false, dueDate: new Date("2026-03-13") },
          { title: "Final electrical inspection and testing", completed: false, dueDate: new Date("2026-03-15") },
          { title: "Final plumbing inspection and pressure test", completed: false, dueDate: new Date("2026-03-16") },
          { title: "Electrical Certificate of Compliance issued", completed: false, dueDate: new Date("2026-03-17") },
          { title: "Plumbing Certificate of Compliance issued", completed: false, dueDate: new Date("2026-03-18") },
          { title: "Final walk-through and punch-list items", completed: false, dueDate: new Date("2026-03-20") },
        ],
      },
    },
  });

  await prisma.dealContact.createMany({
    skipDuplicates: true,
    data: [
      { orgId, dealId: deal1.id, contactId: contractor.id, workDescription: "Demolition, plastering, flooring & general works", daysWorked: 16 },
      { orgId, dealId: deal1.id, contactId: plumber.id, workDescription: "Plumbing rough-in and bathroom fixtures", daysWorked: 8 },
      { orgId, dealId: deal1.id, contactId: electrician.id, workDescription: "Electrical rough-in, DB board, and final inspection", daysWorked: 6 },
    ],
  });

  // Activity logs for project tracking
  await prisma.activity.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, dealId: deal1.id, type: "deal_created", description: "Deal created and added to pipeline", timestamp: new Date("2025-11-10") },
      { orgId, userId: user.id, dealId: deal1.id, type: "deal_moved", description: "Moved to 'purchased' stage", metadata: { fromStage: "offer_made", toStage: "purchased" }, timestamp: new Date("2025-11-20") },
      { orgId, userId: user.id, dealId: deal1.id, type: "deal_moved", description: "Moved to 'renovating' stage - work commenced", metadata: { fromStage: "purchased", toStage: "renovating" }, timestamp: new Date("2025-12-20") },
      { orgId, userId: user.id, dealId: deal1.id, type: "note_added", description: "Inspection completed - no major structural issues found", metadata: { inspector: "BuildTest CC", date: "2026-01-08" }, timestamp: new Date("2026-01-08") },
      { orgId, userId: user.id, dealId: deal1.id, type: "task_completed", description: "Demolition phase completed on schedule", metadata: { phase: "Demolition & Strip-out", daysAhead: 1 }, timestamp: new Date("2026-01-07") },
      { orgId, userId: user.id, dealId: deal1.id, type: "contractor_added", description: "Assigned Mokoena Builders for primary construction work", metadata: { contractor: "Thabo Mokoena" }, timestamp: new Date("2026-01-08") },
      { orgId, userId: user.id, dealId: deal1.id, type: "contractor_added", description: "Assigned Ndlovu Plumbing Services for plumbing works", metadata: { contractor: "Sipho Ndlovu" }, timestamp: new Date("2026-01-12") },
      { orgId, userId: user.id, dealId: deal1.id, type: "expense_logged", description: "Completed expenses: R45,000 (demolition & labour)", metadata: { total: 45000, category: "completed" }, timestamp: new Date("2026-01-15") },
      { orgId, userId: user.id, dealId: deal1.id, type: "milestone_started", description: "Structural repairs and treatment started", metadata: { milestone: "Structural Repairs & Treatment" }, timestamp: new Date("2026-01-08") },
      { orgId, userId: user.id, dealId: deal1.id, type: "note_added", description: "Electrical contractor (Sparks CC) on standby for final sign-off", metadata: { contractor: "Johan van der Merwe" }, timestamp: new Date("2026-02-01") },
    ],
  });

  console.log("Deal 1 (Rosebank): renovating stage - 40% complete (2 of 8 phases done)");

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
        rooms: [
          {
            id: "room-1",
            type: "kitchen",
            name: "Kitchen / Scullery",
            sqm: 28,
            estimate: 186500,
            status: "completed",
            items: [
              { key: "cabinetry", label: "Custom cabinetry (Italian)", unit: "lm", qty: 6, unitPrice: 7500, amount: 45000, completed: true },
              { key: "countertops", label: "Granite countertops", unit: "lm", qty: 6, unitPrice: 5500, amount: 33000, completed: true },
              { key: "sink", label: "Premium sink & tap", unit: "unit", qty: 1, unitPrice: 12000, amount: 12000, completed: true },
              { key: "splashback", label: "Marble splashback tiling", unit: "sqm", qty: 5, unitPrice: 1200, amount: 6000, completed: true },
              { key: "appliances", label: "Premium appliances (Smeg)", unit: "fixed", qty: 1, unitPrice: 78000, amount: 78000, completed: true },
              { key: "extractorHood", label: "Professional hood", unit: "unit", qty: 1, unitPrice: 8500, amount: 8500, completed: true },
              { key: "electrical", label: "Electrical points (10)", unit: "point", qty: 10, unitPrice: 850, amount: 8500, completed: true },
            ],
          },
          {
            id: "room-2",
            type: "bathroom",
            name: "Main Bathroom (Master)",
            sqm: 14,
            estimate: 78900,
            status: "completed",
            items: [
              { key: "toilet", label: "Premium toilet", unit: "unit", qty: 1, unitPrice: 6500, amount: 6500, completed: true },
              { key: "basin", label: "Designer basin & vanity", unit: "unit", qty: 1, unitPrice: 18000, amount: 18000, completed: true },
              { key: "showerBath", label: "Freestanding soaking tub", unit: "unit", qty: 1, unitPrice: 22000, amount: 22000, completed: true },
              { key: "shower", label: "Walk-in shower with glass", unit: "unit", qty: 1, unitPrice: 16000, amount: 16000, completed: true },
              { key: "floorTiles", label: "Marble floor tiles", unit: "sqm", qty: 14, unitPrice: 1100, amount: 15400, completed: true },
              { key: "wallTiles", label: "Feature wall tiles", unit: "sqm", qty: 15, unitPrice: 950, amount: 14250, completed: true },
              { key: "lighting", label: "Luxury lighting", unit: "unit", qty: 3, unitPrice: 2800, amount: 8400, completed: true },
              { key: "heating", label: "Heated floor and towel rail", unit: "unit", qty: 1, unitPrice: 3500, amount: 3500, completed: true },
            ],
          },
          {
            id: "room-3",
            type: "bathroom",
            name: "Guest Bathroom",
            sqm: 7,
            estimate: 33400,
            status: "completed",
            items: [
              { key: "toilet", label: "Toilet", unit: "unit", qty: 1, unitPrice: 5000, amount: 5000, completed: true },
              { key: "basin", label: "Wall-mounted basin", unit: "unit", qty: 1, unitPrice: 8000, amount: 8000, completed: true },
              { key: "shower", label: "Shower enclosure", unit: "unit", qty: 1, unitPrice: 10000, amount: 10000, completed: true },
              { key: "floorTiles", label: "Marble floor tiles", unit: "sqm", qty: 7, unitPrice: 1100, amount: 7700, completed: true },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 8, unitPrice: 950, amount: 7600, completed: true },
            ],
          },
          {
            id: "room-4",
            type: "bathroom",
            name: "Ensuite (Bedroom 2)",
            sqm: 6,
            estimate: 28500,
            status: "completed",
            items: [
              { key: "toilet", label: "Toilet", unit: "unit", qty: 1, unitPrice: 4500, amount: 4500, completed: true },
              { key: "basin", label: "Basin with vanity", unit: "unit", qty: 1, unitPrice: 7500, amount: 7500, completed: true },
              { key: "shower", label: "Shower enclosure", unit: "unit", qty: 1, unitPrice: 9000, amount: 9000, completed: true },
              { key: "floorTiles", label: "Marble floor tiles", unit: "sqm", qty: 6, unitPrice: 1100, amount: 6600, completed: true },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 6, unitPrice: 950, amount: 5700, completed: true },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Master Bedroom",
            sqm: 38,
            estimate: 41320,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 38, unitPrice: 350, amount: 13300, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 59, unitPrice: 180, amount: 10620, completed: true },
              { key: "lightFittings", label: "Designer light fittings (3)", unit: "unit", qty: 3, unitPrice: 2200, amount: 6600, completed: true },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 1000, amount: 6000, completed: true },
              { key: "curtains", label: "Custom curtains & Rails", unit: "unit", qty: 1, unitPrice: 4800, amount: 4800, completed: true },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 24,
            estimate: 21260,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 24, unitPrice: 350, amount: 8400, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 47, unitPrice: 180, amount: 8460, completed: true },
              { key: "lightFittings", label: "Designer light fittings (2)", unit: "unit", qty: 2, unitPrice: 2200, amount: 4400, completed: true },
            ],
          },
          {
            id: "room-7",
            type: "bedroom",
            name: "Bedroom 3 / Study",
            sqm: 18,
            estimate: 15880,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 18, unitPrice: 350, amount: 6300, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 41, unitPrice: 180, amount: 7380, completed: true },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 2200, amount: 2200, completed: true },
            ],
          },
          {
            id: "room-8",
            type: "bedroom",
            name: "Bedroom 4 / Media Room",
            sqm: 20,
            estimate: 21140,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 20, unitPrice: 350, amount: 7000, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 43, unitPrice: 180, amount: 7740, completed: true },
              { key: "lightFittings", label: "Recessed lighting (4)", unit: "unit", qty: 4, unitPrice: 1600, amount: 6400, completed: true },
            ],
          },
          {
            id: "room-9",
            type: "lounge",
            name: "Lounge / Living Area",
            sqm: 48,
            estimate: 54850,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian floor tiles", unit: "sqm", qty: 48, unitPrice: 500, amount: 24000, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 67, unitPrice: 150, amount: 10050, completed: true },
              { key: "lightFittings", label: "Designer light fittings (4)", unit: "unit", qty: 4, unitPrice: 2800, amount: 11200, completed: true },
              { key: "electrical", label: "Electrical points (8)", unit: "point", qty: 8, unitPrice: 1200, amount: 9600, completed: true },
            ],
          },
          {
            id: "room-10",
            type: "lounge",
            name: "Formal Dining Room",
            sqm: 28,
            estimate: 31250,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian floor tiles", unit: "sqm", qty: 28, unitPrice: 500, amount: 14000, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 51, unitPrice: 150, amount: 7650, completed: true },
              { key: "lightFittings", label: "Chandelier & lights (3)", unit: "unit", qty: 3, unitPrice: 3200, amount: 9600, completed: true },
            ],
          },
          {
            id: "room-11",
            type: "entrance",
            name: "Main Entrance & Foyer",
            sqm: 18,
            estimate: 23950,
            status: "completed",
            items: [
              { key: "flooring", label: "Marble floor tiles", unit: "sqm", qty: 18, unitPrice: 600, amount: 10800, completed: true },
              { key: "painting", label: "Premium paint finish (walls)", unit: "sqm", qty: 41, unitPrice: 150, amount: 6150, completed: true },
              { key: "lighting", label: "Accent lighting", unit: "unit", qty: 2, unitPrice: 3500, amount: 7000, completed: true },
            ],
          },
          {
            id: "room-12",
            type: "patio",
            name: "Terrace / Patio",
            sqm: 35,
            estimate: 24500,
            status: "completed",
            items: [
              { key: "paving", label: "Premium paving tiles", unit: "sqm", qty: 35, unitPrice: 550, amount: 19250, completed: true },
              { key: "ceiling", label: "Patio ceiling & fans", unit: "unit", qty: 1, unitPrice: 8500, amount: 8500, completed: true },
              { key: "lighting", label: "Outdoor lighting (6)", unit: "unit", qty: 6, unitPrice: 1800, amount: 10800, completed: true },
            ],
          },
        ],
        nextRoomId: 13,
        contractors: [],
        costDb: {},
        contingencyPct: 10,
        pmPct: 8,
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
        rooms: [
          {
            id: "room-1",
            type: "kitchen",
            name: "Kitchen",
            sqm: 18,
            estimate: 28050,
            status: "completed",
            items: [
              { key: "cabinetry", label: "Cabinet refresh / varnish", unit: "lm", qty: 4, unitPrice: 2500, amount: 10000, completed: true },
              { key: "countertops", label: "Countertop restoration", unit: "lm", qty: 4, unitPrice: 1500, amount: 6000, completed: true },
              { key: "sink", label: "Sink cleaning & tap replacement", unit: "unit", qty: 1, unitPrice: 3500, amount: 3500, completed: true },
              { key: "splashback", label: "Splashback update", unit: "sqm", qty: 2, unitPrice: 400, amount: 800, completed: true },
              { key: "painting", label: "Kitchen painting (walls)", unit: "sqm", qty: 41, unitPrice: 150, amount: 6150, completed: true },
              { key: "fixtures", label: "Lighting & fixtures", unit: "unit", qty: 2, unitPrice: 800, amount: 1600, completed: true },
            ],
          },
          {
            id: "room-2",
            type: "bathroom",
            name: "Main Bathroom",
            sqm: 7,
            estimate: 18500,
            status: "completed",
            items: [
              { key: "cleaning", label: "Deep clean & grout sealing", unit: "sqm", qty: 7, unitPrice: 250, amount: 1750, completed: true },
              { key: "fixtures", label: "Tap & mixer upgrade", unit: "unit", qty: 2, unitPrice: 1800, amount: 3600, completed: true },
              { key: "paint", label: "Paint bathroom", unit: "sqm", qty: 7, unitPrice: 120, amount: 840, completed: true },
              { key: "lighting", label: "Lighting upgrade", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: true },
              { key: "ventilation", label: "Extractor fan", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: true },
              { key: "mirror", label: "Mirror & accessories", unit: "unit", qty: 1, unitPrice: 1500, amount: 1500, completed: true },
            ],
          },
          {
            id: "room-3",
            type: "bathroom",
            name: "Second Bathroom",
            sqm: 5,
            estimate: 12000,
            status: "completed",
            items: [
              { key: "cleaning", label: "Deep clean", unit: "sqm", qty: 5, unitPrice: 250, amount: 1250, completed: true },
              { key: "paint", label: "Paint bathroom", unit: "sqm", qty: 5, unitPrice: 120, amount: 600, completed: true },
              { key: "fixtures", label: "Tap replacement", unit: "unit", qty: 1, unitPrice: 1500, amount: 1500, completed: true },
              { key: "lighting", label: "Lighting", unit: "unit", qty: 1, unitPrice: 1000, amount: 1000, completed: true },
            ],
          },
          {
            id: "room-4",
            type: "bedroom",
            name: "Master Bedroom",
            sqm: 26,
            estimate: 11230,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint (walls)", unit: "sqm", qty: 49, unitPrice: 150, amount: 7350, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 26, unitPrice: 80, amount: 2080, completed: true },
              { key: "lighting", label: "Lighting upgrade", unit: "unit", qty: 2, unitPrice: 900, amount: 1800, completed: true },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 16,
            estimate: 7880,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint (walls)", unit: "sqm", qty: 38, unitPrice: 150, amount: 5700, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 16, unitPrice: 80, amount: 1280, completed: true },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 900, amount: 900, completed: true },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3",
            sqm: 14,
            estimate: 7420,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint (walls)", unit: "sqm", qty: 36, unitPrice: 150, amount: 5400, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 14, unitPrice: 80, amount: 1120, completed: true },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 900, amount: 900, completed: true },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Dining",
            sqm: 35,
            estimate: 14950,
            status: "completed",
            items: [
              { key: "painting", label: "Feature wall & general paint (walls)", unit: "sqm", qty: 57, unitPrice: 150, amount: 8550, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 35, unitPrice: 80, amount: 2800, completed: true },
              { key: "lighting", label: "Ceiling roses & lights", unit: "unit", qty: 3, unitPrice: 1200, amount: 3600, completed: true },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Passage",
            sqm: 12,
            estimate: 7110,
            status: "completed",
            items: [
              { key: "painting", label: "Paint entrance (walls)", unit: "sqm", qty: 33, unitPrice: 150, amount: 4950, completed: true },
              { key: "flooring", label: "Polish & seal", unit: "sqm", qty: 12, unitPrice: 80, amount: 960, completed: true },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: true },
            ],
          },
          {
            id: "room-9",
            type: "patio",
            name: "Garden & Landscaping",
            sqm: 40,
            estimate: 18000,
            status: "completed",
            items: [
              { key: "landscaping", label: "Garden landscaping", unit: "sqm", qty: 40, unitPrice: 280, amount: 11200, completed: true },
              { key: "irrigation", label: "Irrigation system", unit: "fixed", qty: 1, unitPrice: 4500, amount: 4500, completed: true },
              { key: "fencing", label: "Fence repair", unit: "lm", qty: 25, unitPrice: 280, amount: 7000, completed: true },
            ],
          },
        ],
        nextRoomId: 10,
        contractors: [],
        costDb: {},
        contingencyPct: 10,
        pmPct: 8,
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
        rooms: [
          {
            id: "room-1",
            type: "kitchen",
            name: "Kitchen",
            sqm: 14,
            estimate: 58000,
            status: "planned",
            items: [
              { key: "cabinetry", label: "Cabinetry upgrade", unit: "lm", qty: 3.5, unitPrice: 5000, amount: 17500, completed: false },
              { key: "countertops", label: "Quartz countertops", unit: "lm", qty: 3.5, unitPrice: 4000, amount: 14000, completed: false },
              { key: "sink", label: "Premium sink & tap", unit: "unit", qty: 1, unitPrice: 6000, amount: 6000, completed: false },
              { key: "splashback", label: "Feature tile splashback", unit: "sqm", qty: 2.5, unitPrice: 800, amount: 2000, completed: false },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 900, amount: 5400, completed: false },
              { key: "lighting", label: "Under-cabinet lighting", unit: "unit", qty: 1, unitPrice: 2500, amount: 2500, completed: false },
            ],
          },
          {
            id: "room-2",
            type: "bathroom",
            name: "Main Bathroom",
            sqm: 8,
            estimate: 38000,
            status: "planned",
            items: [
              { key: "toilet", label: "Contemporary toilet", unit: "unit", qty: 1, unitPrice: 4500, amount: 4500, completed: false },
              { key: "basin", label: "Double basin with vanity", unit: "unit", qty: 1, unitPrice: 12000, amount: 12000, completed: false },
              { key: "shower", label: "Rainfall shower with screen", unit: "unit", qty: 1, unitPrice: 12000, amount: 12000, completed: false },
              { key: "floorTiles", label: "Non-slip floor tiles", unit: "sqm", qty: 8, unitPrice: 700, amount: 5600, completed: false },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 12, unitPrice: 650, amount: 7800, completed: false },
              { key: "lighting", label: "LED recessed lights", unit: "unit", qty: 3, unitPrice: 1200, amount: 3600, completed: false },
            ],
          },
          {
            id: "room-3",
            type: "bathroom",
            name: "Ensuite / Guest Bath",
            sqm: 5,
            estimate: 22500,
            status: "planned",
            items: [
              { key: "toilet", label: "Toilet", unit: "unit", qty: 1, unitPrice: 4000, amount: 4000, completed: false },
              { key: "basin", label: "Wall basin", unit: "unit", qty: 1, unitPrice: 5500, amount: 5500, completed: false },
              { key: "shower", label: "Shower enclosure", unit: "unit", qty: 1, unitPrice: 8000, amount: 8000, completed: false },
              { key: "floorTiles", label: "Floor tiles", unit: "sqm", qty: 5, unitPrice: 700, amount: 3500, completed: false },
              { key: "wallTiles", label: "Wall tiles", unit: "sqm", qty: 6, unitPrice: 650, amount: 3900, completed: false },
            ],
          },
          {
            id: "room-4",
            type: "bedroom",
            name: "Master Bedroom",
            sqm: 20,
            estimate: 20560,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 20, unitPrice: 450, amount: 9000, completed: false },
              { key: "painting", label: "Premium paint (walls)", unit: "sqm", qty: 43, unitPrice: 120, amount: 5160, completed: false },
              { key: "lightFittings", label: "Pendant lights (2)", unit: "unit", qty: 2, unitPrice: 1400, amount: 2800, completed: false },
              { key: "electrical", label: "Electrical points (4)", unit: "point", qty: 4, unitPrice: 900, amount: 3600, completed: false },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 14,
            estimate: 11820,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 14, unitPrice: 450, amount: 6300, completed: false },
              { key: "painting", label: "Paint (walls)", unit: "sqm", qty: 36, unitPrice: 120, amount: 4320, completed: false },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3 / Study",
            sqm: 12,
            estimate: 10560,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 12, unitPrice: 450, amount: 5400, completed: false },
              { key: "painting", label: "Paint (walls)", unit: "sqm", qty: 33, unitPrice: 120, amount: 3960, completed: false },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Living Area",
            sqm: 32,
            estimate: 32200,
            status: "planned",
            items: [
              { key: "flooring", label: "Premium tile flooring", unit: "sqm", qty: 32, unitPrice: 500, amount: 16000, completed: false },
              { key: "painting", label: "Paint (walls)", unit: "sqm", qty: 54, unitPrice: 100, amount: 5400, completed: false },
              { key: "lighting", label: "Feature lighting (3)", unit: "unit", qty: 3, unitPrice: 1800, amount: 5400, completed: false },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 900, amount: 5400, completed: false },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Foyer",
            sqm: 8,
            estimate: 6700,
            status: "planned",
            items: [
              { key: "flooring", label: "Tile flooring", unit: "sqm", qty: 8, unitPrice: 500, amount: 4000, completed: false },
              { key: "painting", label: "Paint (walls)", unit: "sqm", qty: 27, unitPrice: 100, amount: 2700, completed: false },
            ],
          },
        ],
        nextRoomId: 9,
        contractors: [],
        costDb: {},
        contingencyPct: 10,
        pmPct: 8,
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

  // ─── Chart of Accounts ───
  const accounts = [
    { orgId, code: "1000", name: "FNB Business Cheque", type: "asset", subtype: "bank", isSystemAccount: true },
    { orgId, code: "1100", name: "Accounts Receivable", type: "asset", subtype: "accounts_receivable", isSystemAccount: true },
    { orgId, code: "1200", name: "Inventory", type: "asset", subtype: "inventory" },
    { orgId, code: "1300", name: "Fixed Assets - Tools & Equipment", type: "asset", subtype: "fixed_asset" },
    { orgId, code: "1400", name: "VAT Input (Receivable)", type: "asset", subtype: "other_current_asset" },
    { orgId, code: "2000", name: "Accounts Payable", type: "liability", subtype: "accounts_payable", isSystemAccount: true },
    { orgId, code: "2100", name: "VAT Output (Payable)", type: "liability", subtype: "other_current_liability" },
    { orgId, code: "2200", name: "Salaries Payable", type: "liability", subtype: "other_current_liability" },
    { orgId, code: "3000", name: "Owner's Equity", type: "equity", subtype: "owners_equity" },
    { orgId, code: "3100", name: "Retained Earnings", type: "equity", subtype: "retained_earnings" },
    { orgId, code: "4000", name: "Property Sale Revenue", type: "revenue", subtype: "sales" },
    { orgId, code: "4100", name: "Other Income", type: "revenue", subtype: "other_income" },
    { orgId, code: "5000", name: "Cost of Sales - Materials", type: "expense", subtype: "cost_of_sales" },
    { orgId, code: "5100", name: "Cost of Sales - Labour", type: "expense", subtype: "cost_of_sales" },
    { orgId, code: "5200", name: "Plumbing Expenses", type: "expense", subtype: "cost_of_sales" },
    { orgId, code: "5300", name: "Electrical Expenses", type: "expense", subtype: "cost_of_sales" },
    { orgId, code: "6000", name: "Professional Fees", type: "expense", subtype: "operating_expense" },
    { orgId, code: "6100", name: "Insurance", type: "expense", subtype: "operating_expense" },
    { orgId, code: "6200", name: "Rates & Taxes", type: "expense", subtype: "operating_expense" },
    { orgId, code: "6300", name: "Salaries & Wages", type: "expense", subtype: "operating_expense" },
  ];
  for (const acct of accounts) {
    await prisma.chartOfAccount.upsert({
      where: { orgId_code: { orgId, code: acct.code } },
      update: {},
      create: acct,
    });
  }
  console.log(`Chart of Accounts created: ${accounts.length}`);

  // ─── Financial Periods ───
  await prisma.financialPeriod.upsert({
    where: { orgId_name: { orgId, name: "2026-01" } },
    update: {},
    create: { orgId, name: "2026-01", startDate: new Date("2026-01-01"), endDate: new Date("2026-01-31"), status: "closed", closedBy: user.id, closedAt: new Date("2026-02-05") },
  });
  await prisma.financialPeriod.upsert({
    where: { orgId_name: { orgId, name: "2026-02" } },
    update: {},
    create: { orgId, name: "2026-02", startDate: new Date("2026-02-01"), endDate: new Date("2026-02-28"), status: "open" },
  });
  await prisma.financialPeriod.upsert({
    where: { orgId_name: { orgId, name: "2026-03" } },
    update: {},
    create: { orgId, name: "2026-03", startDate: new Date("2026-03-01"), endDate: new Date("2026-03-31"), status: "open" },
  });
  console.log("Financial Periods created: 3");

  // ─── Bank Account (get reference for transactions) ───
  const bankAccount = await prisma.bankAccount.findFirst({ where: { orgId } });

  // ─── Bank Transactions ───
  if (bankAccount) {
    await prisma.bankTransaction.createMany({
      data: [
        { orgId, bankAccountId: bankAccount.id, date: new Date("2025-12-28"), description: "EFT - Waste Removal SA", amount: -8500, type: "withdrawal", reference: "WR-DEC-001", category: "materials", isReconciled: true, reconciledAt: new Date("2026-01-05") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-05"), description: "EFT - Mokoena Builders (demolition)", amount: -12000, type: "withdrawal", reference: "MB-JAN-001", category: "labour", isReconciled: true, reconciledAt: new Date("2026-01-10") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-08"), description: "CARD - BuildTest CC", amount: -6500, type: "withdrawal", reference: "BT-JAN-001", category: "labour", isReconciled: true, reconciledAt: new Date("2026-01-15") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-15"), description: "EFT - Ndlovu Plumbing Services", amount: -16800, type: "withdrawal", reference: "NP-JAN-001", category: "plumbing", isReconciled: true, reconciledAt: new Date("2026-01-20") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-20"), description: "EFT - Sparks Electrical CC", amount: -24500, type: "withdrawal", reference: "SE-JAN-001", category: "electrical", isReconciled: true, reconciledAt: new Date("2026-01-25") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-22"), description: "CARD - Builders Warehouse (geyser)", amount: -8200, type: "withdrawal", reference: "BW-JAN-001", category: "materials", isReconciled: true, reconciledAt: new Date("2026-01-28") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-25"), description: "EFT - Plasterboard SA", amount: -12500, type: "withdrawal", reference: "PS-JAN-001", category: "materials", isReconciled: true, reconciledAt: new Date("2026-02-01") },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-02"), description: "EFT - Mokoena Builders (plastering)", amount: -14400, type: "withdrawal", reference: "MB-FEB-001", category: "labour", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-05"), description: "EFT - Builders Warehouse (kitchen)", amount: -45000, type: "withdrawal", reference: "BW-FEB-001", category: "materials", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-05"), description: "CARD - CTM (floor tiles)", amount: -15500, type: "withdrawal", reference: "CTM-FEB-001", category: "materials", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-08"), description: "CARD - CTM (bathroom tiles)", amount: -8900, type: "withdrawal", reference: "CTM-FEB-002", category: "materials", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-10"), description: "EFT - Mokoena Builders (kitchen install)", amount: -18000, type: "withdrawal", reference: "MB-FEB-002", category: "labour", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-02-01"), description: "FNB - Monthly account fee", amount: -249, type: "fee", reference: "FNB-FEB-FEE", isReconciled: false },
        { orgId, bankAccountId: bankAccount.id, date: new Date("2026-01-01"), description: "Deposit - Investment capital", amount: 500000, type: "deposit", reference: "DEP-JAN-001", isReconciled: true, reconciledAt: new Date("2026-01-05") },
      ],
    });
    console.log("Bank Transactions created: 14");
  }

  // ─── Vendor Bills + Lines + Payments ───
  const bill1 = await prisma.vendorBill.create({
    data: {
      orgId, userId: user.id,
      billNumber: "BILL-001", contactId: contractor.id, dealId: deal1.id,
      status: "paid", issueDate: new Date("2026-01-10"), dueDate: new Date("2026-01-24"),
      subtotal: 26400, tax: 3960, total: 30360, amountPaid: 30360,
      currency: "ZAR", notes: "Demolition and initial plastering work",
      lines: {
        create: [
          { description: "Demolition labour (5 days @ R1500)", quantity: 5, unitPrice: 1500, amount: 7500, accountCode: "5100", dealId: deal1.id, order: 1 },
          { description: "Plastering labour (6 days @ R1500)", quantity: 6, unitPrice: 1500, amount: 9000, accountCode: "5100", dealId: deal1.id, order: 2 },
          { description: "Waste removal and rubble disposal", quantity: 1, unitPrice: 4500, amount: 4500, accountCode: "5000", dealId: deal1.id, order: 3 },
          { description: "Plasterboard materials supply", quantity: 1, unitPrice: 5400, amount: 5400, accountCode: "5000", dealId: deal1.id, order: 4 },
        ],
      },
    },
  });

  await prisma.billPayment.create({
    data: {
      orgId, vendorBillId: bill1.id, amount: 30360,
      paymentDate: new Date("2026-01-24"), paymentMethod: "eft",
      reference: "EFT-MB-001", idempotencyKey: "pay-bill1-full",
      bankAccountId: bankAccount?.id,
    },
  });

  const bill2 = await prisma.vendorBill.create({
    data: {
      orgId, userId: user.id,
      billNumber: "BILL-002", contactId: plumber.id, dealId: deal1.id,
      status: "partially_paid", issueDate: new Date("2026-01-28"), dueDate: new Date("2026-02-11"),
      subtotal: 48800, tax: 7320, total: 56120, amountPaid: 30000,
      currency: "ZAR", notes: "Plumbing rough-in and bathroom fixtures",
      lines: {
        create: [
          { description: "Rough-in plumbing labour (8 days @ R1800)", quantity: 8, unitPrice: 1800, amount: 14400, accountCode: "5200", dealId: deal1.id, order: 1 },
          { description: "Copper piping and fittings", quantity: 1, unitPrice: 12000, amount: 12000, accountCode: "5200", dealId: deal1.id, order: 2 },
          { description: "Bathroom fixture supply (taps, mixers, shower)", quantity: 1, unitPrice: 14200, amount: 14200, accountCode: "5200", dealId: deal1.id, order: 3 },
          { description: "Geyser and hot water connections", quantity: 1, unitPrice: 8200, amount: 8200, accountCode: "5200", dealId: deal1.id, order: 4 },
        ],
      },
    },
  });

  await prisma.billPayment.create({
    data: {
      orgId, vendorBillId: bill2.id, amount: 30000,
      paymentDate: new Date("2026-02-01"), paymentMethod: "eft",
      reference: "EFT-NP-001", idempotencyKey: "pay-bill2-partial",
      bankAccountId: bankAccount?.id,
    },
  });

  const bill3 = await prisma.vendorBill.create({
    data: {
      orgId, userId: user.id,
      billNumber: "BILL-003", contactId: electrician.id, dealId: deal1.id,
      status: "approved", issueDate: new Date("2026-02-05"), dueDate: new Date("2026-02-19"),
      subtotal: 28000, tax: 4200, total: 32200, amountPaid: 0,
      currency: "ZAR", notes: "Electrical rewiring, DB board, and downlights",
      lines: {
        create: [
          { description: "Electrical rewiring labour (6 days @ R2200)", quantity: 6, unitPrice: 2200, amount: 13200, accountCode: "5300", dealId: deal1.id, order: 1 },
          { description: "DB board and breakers", quantity: 1, unitPrice: 6800, amount: 6800, accountCode: "5300", dealId: deal1.id, order: 2 },
          { description: "Wiring, conduit and accessories", quantity: 1, unitPrice: 5500, amount: 5500, accountCode: "5300", dealId: deal1.id, order: 3 },
          { description: "LED downlights (12 units)", quantity: 12, unitPrice: 210, amount: 2520, accountCode: "5300", dealId: deal1.id, order: 4 },
        ],
      },
    },
  });

  await prisma.vendorBill.create({
    data: {
      orgId, userId: user.id,
      billNumber: "BILL-004", contactId: contractor.id, dealId: deal1.id,
      status: "draft", issueDate: new Date("2026-02-15"), dueDate: new Date("2026-03-01"),
      subtotal: 18000, tax: 2700, total: 20700, amountPaid: 0,
      currency: "ZAR", notes: "Kitchen installation labour - draft pending approval",
      lines: {
        create: [
          { description: "Kitchen cabinet installation (5 days @ R1500)", quantity: 5, unitPrice: 1500, amount: 7500, accountCode: "5100", dealId: deal1.id, order: 1 },
          { description: "Countertop fitting and splashback tiling", quantity: 1, unitPrice: 6500, amount: 6500, accountCode: "5100", dealId: deal1.id, order: 2 },
          { description: "Kitchen sink and appliance hookups", quantity: 1, unitPrice: 4000, amount: 4000, accountCode: "5100", dealId: deal1.id, order: 3 },
        ],
      },
    },
  });

  console.log("Vendor Bills created: 4 (with payments: 2)");

  // ─── Purchase Orders + Lines + Goods Receipts ───
  const po1 = await prisma.purchaseOrder.create({
    data: {
      orgId, userId: user.id,
      poNumber: "PO-000001", dealId: deal1.id,
      status: "received", orderDate: new Date("2026-02-01"), expectedDate: new Date("2026-02-05"),
      subtotal: 24400, tax: 3660, total: 28060, shippingCost: 0,
      deliveryAddress: "12 Oak Lane, Rosebank, Johannesburg, 2196",
      notes: "Floor and bathroom tiles for Rosebank renovation",
      approvedBy: user.id, approvedAt: new Date("2026-02-01"),
      lines: {
        create: [
          { description: "Porcelain floor tiles 60x60 (30 sqm)", quantity: 30, unitPrice: 480, amount: 14400, accountCode: "5000", order: 1 },
          { description: "Bathroom wall tiles (20 sqm)", quantity: 20, unitPrice: 350, amount: 7000, accountCode: "5000", order: 2 },
          { description: "Tile grout (20kg bags)", quantity: 6, unitPrice: 250, amount: 1500, accountCode: "5000", order: 3 },
          { description: "Tile adhesive (25kg bags)", quantity: 6, unitPrice: 250, amount: 1500, accountCode: "5000", order: 4 },
        ],
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      orgId, purchaseOrderId: po1.id, receivedDate: new Date("2026-02-04"), receivedBy: supervisorUser.name!,
      notes: "All items received in good condition. Tiles stored on site.",
      items: [
        { lineId: "line-1", quantityReceived: 30, condition: "good" },
        { lineId: "line-2", quantityReceived: 20, condition: "good" },
        { lineId: "line-3", quantityReceived: 6, condition: "good" },
        { lineId: "line-4", quantityReceived: 6, condition: "good" },
      ],
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orgId, userId: user.id,
      poNumber: "PO-000002", dealId: deal1.id,
      status: "partially_received", orderDate: new Date("2026-02-05"), expectedDate: new Date("2026-02-12"),
      subtotal: 45000, tax: 6750, total: 51750, shippingCost: 1500,
      deliveryAddress: "12 Oak Lane, Rosebank, Johannesburg, 2196",
      notes: "Kitchen cabinets and countertops from Builders Warehouse",
      approvedBy: user.id, approvedAt: new Date("2026-02-05"),
      lines: {
        create: [
          { description: "Kitchen base cabinets (4 units)", quantity: 4, unitPrice: 4500, amount: 18000, accountCode: "5000", order: 1 },
          { description: "Kitchen wall cabinets (3 units)", quantity: 3, unitPrice: 3500, amount: 10500, accountCode: "5000", order: 2 },
          { description: "Granite countertop (4 linear metres)", quantity: 4, unitPrice: 3800, amount: 15200, accountCode: "5000", order: 3 },
          { description: "Undermount sink", quantity: 1, unitPrice: 1300, amount: 1300, accountCode: "5000", order: 4 },
        ],
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      orgId, purchaseOrderId: po2.id, receivedDate: new Date("2026-02-10"), receivedBy: supervisorUser.name!,
      notes: "Cabinets received. Countertops on backorder — expected next week.",
      items: [
        { lineId: "line-1", quantityReceived: 4, condition: "good" },
        { lineId: "line-2", quantityReceived: 3, condition: "good" },
        { lineId: "line-3", quantityReceived: 0, condition: "pending" },
        { lineId: "line-4", quantityReceived: 1, condition: "good" },
      ],
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      orgId, userId: user.id,
      poNumber: "PO-000003", dealId: deal1.id,
      status: "approved", orderDate: new Date("2026-02-15"), expectedDate: new Date("2026-02-25"),
      subtotal: 11200, tax: 1680, total: 12880, shippingCost: 0,
      deliveryAddress: "12 Oak Lane, Rosebank, Johannesburg, 2196",
      notes: "Electrical supplies for final fitout",
      approvedBy: user.id, approvedAt: new Date("2026-02-16"),
      lines: {
        create: [
          { description: "LED downlight fittings (15 units)", quantity: 15, unitPrice: 280, amount: 4200, accountCode: "5300", order: 1 },
          { description: "Light switches and sockets (20 units)", quantity: 20, unitPrice: 120, amount: 2400, accountCode: "5300", order: 2 },
          { description: "Electrical cable (100m roll)", quantity: 2, unitPrice: 1800, amount: 3600, accountCode: "5300", order: 3 },
          { description: "DB board isolators", quantity: 4, unitPrice: 250, amount: 1000, accountCode: "5300", order: 4 },
        ],
      },
    },
  });

  console.log("Purchase Orders created: 3 (with receipts: 2)");

  // ─── Inventory Items + Transactions ───
  const inventoryItems = [
    { orgId, sku: "MAT-CEM-50", name: "Cement (50kg bags)", category: "materials", unit: "each", quantityOnHand: 12, reorderPoint: 5, reorderQuantity: 20, costPrice: 95, lastPurchasePrice: 95, location: "Rosebank Site" },
    { orgId, sku: "MAT-TILE-P60", name: "Porcelain Tiles 60x60", category: "materials", unit: "m2", quantityOnHand: 8, reorderPoint: 10, reorderQuantity: 30, costPrice: 480, lastPurchasePrice: 480, location: "Rosebank Site" },
    { orgId, sku: "MAT-PAINT-DV", name: "Plascon Double Velvet (5L)", category: "materials", unit: "each", quantityOnHand: 0, reorderPoint: 4, reorderQuantity: 12, costPrice: 650, lastPurchasePrice: 650, location: "Warehouse" },
    { orgId, sku: "MAT-PIPE-CU15", name: "Copper Piping 15mm (3m lengths)", category: "materials", unit: "each", quantityOnHand: 6, reorderPoint: 3, reorderQuantity: 10, costPrice: 185, lastPurchasePrice: 185, location: "Warehouse" },
    { orgId, sku: "MAT-CABLE-25", name: "Electrical Cable 2.5mm (100m)", category: "materials", unit: "each", quantityOnHand: 1, reorderPoint: 1, reorderQuantity: 3, costPrice: 1800, lastPurchasePrice: 1800, location: "Warehouse" },
    { orgId, sku: "MAT-PBOARD", name: "Plasterboard Sheets (2.4x1.2m)", category: "materials", unit: "each", quantityOnHand: 4, reorderPoint: 5, reorderQuantity: 15, costPrice: 165, lastPurchasePrice: 165, location: "Rosebank Site" },
    { orgId, sku: "MAT-GROUT-W", name: "Tile Grout White (20kg)", category: "consumables", unit: "each", quantityOnHand: 3, reorderPoint: 2, reorderQuantity: 6, costPrice: 250, lastPurchasePrice: 250, location: "Rosebank Site" },
    { orgId, sku: "MAT-SCREW-MX", name: "Mixed Screws & Fixings Box", category: "consumables", unit: "box", quantityOnHand: 5, reorderPoint: 2, reorderQuantity: 5, costPrice: 120, lastPurchasePrice: 120, location: "Rosebank Site" },
  ];

  const createdInventory: Record<string, string> = {};
  for (const item of inventoryItems) {
    const inv = await prisma.inventoryItem.upsert({
      where: { orgId_sku: { orgId, sku: item.sku } },
      update: {},
      create: item,
    });
    createdInventory[item.sku] = inv.id;
  }

  // Inventory transactions
  const invTransactions = [
    { orgId, inventoryItemId: createdInventory["MAT-CEM-50"], type: "purchase", quantity: 20, unitCost: 95, totalCost: 1900, reference: "PO-BW-Jan", referenceType: "purchase_order", performedBy: supervisorUser.name!, notes: "Initial stock for Rosebank site" },
    { orgId, inventoryItemId: createdInventory["MAT-CEM-50"], type: "usage", quantity: -8, unitCost: 95, totalCost: -760, reference: "12 Oak Lane, Rosebank", referenceType: "deal", dealId: deal1.id, performedBy: fieldUser.name!, notes: "Used for plastering and tiling prep" },
    { orgId, inventoryItemId: createdInventory["MAT-TILE-P60"], type: "purchase", quantity: 30, unitCost: 480, totalCost: 14400, reference: "PO-000001", referenceType: "purchase_order", performedBy: supervisorUser.name!, notes: "CTM order for Rosebank" },
    { orgId, inventoryItemId: createdInventory["MAT-TILE-P60"], type: "usage", quantity: -22, unitCost: 480, totalCost: -10560, reference: "12 Oak Lane, Rosebank", referenceType: "deal", dealId: deal1.id, performedBy: fieldUser.name!, notes: "Installed in kitchen and passage" },
    { orgId, inventoryItemId: createdInventory["MAT-PAINT-DV"], type: "purchase", quantity: 8, unitCost: 650, totalCost: 5200, reference: "Mica Hardware", referenceType: "purchase_order", performedBy: supervisorUser.name!, notes: "Stellenbosch property" },
    { orgId, inventoryItemId: createdInventory["MAT-PAINT-DV"], type: "usage", quantity: -8, unitCost: 650, totalCost: -5200, reference: "22 Protea Ave, Stellenbosch", referenceType: "deal", dealId: deal4.id, performedBy: fieldUser.name!, notes: "Full interior paint" },
    { orgId, inventoryItemId: createdInventory["MAT-PBOARD"], type: "purchase", quantity: 15, unitCost: 165, totalCost: 2475, reference: "Plasterboard SA", referenceType: "purchase_order", performedBy: supervisorUser.name! },
    { orgId, inventoryItemId: createdInventory["MAT-PBOARD"], type: "usage", quantity: -11, unitCost: 165, totalCost: -1815, reference: "12 Oak Lane, Rosebank", referenceType: "deal", dealId: deal1.id, performedBy: fieldUser.name!, notes: "Kitchen and bathroom walls" },
  ];
  await prisma.inventoryTransaction.createMany({ data: invTransactions });
  console.log(`Inventory Items created: ${inventoryItems.length} (with ${invTransactions.length} transactions)`);

  // ─── Journal Entry Sequence ───
  await prisma.journalEntrySequence.upsert({
    where: { orgId },
    update: { lastSeq: 4 },
    create: { orgId, lastSeq: 4 },
  });

  // ─── Journal Entries + Lines ───
  const je1 = await prisma.journalEntry.create({
    data: {
      orgId, userId: user.id,
      entryNumber: "JE-000001", date: new Date("2026-01-24"),
      description: "Record vendor payment - Mokoena Builders (demolition & plastering)",
      reference: "BILL-001", sourceType: "vendor_bill", sourceId: bill1.id,
      status: "posted", periodName: "2026-01", postedAt: new Date("2026-01-24"), postedBy: user.id,
      lines: {
        create: [
          { accountCode: "5100", accountName: "Cost of Sales - Labour", description: "Demolition and plastering labour", debit: 16500, credit: 0, dealId: deal1.id, order: 1 },
          { accountCode: "5000", accountName: "Cost of Sales - Materials", description: "Waste removal and plasterboard", debit: 9900, credit: 0, dealId: deal1.id, order: 2 },
          { accountCode: "1400", accountName: "VAT Input (Receivable)", description: "VAT @ 15%", debit: 3960, credit: 0, order: 3 },
          { accountCode: "1000", accountName: "FNB Business Cheque", description: "EFT payment", debit: 0, credit: 30360, order: 4 },
        ],
      },
    },
  });

  const je2 = await prisma.journalEntry.create({
    data: {
      orgId, userId: user.id,
      entryNumber: "JE-000002", date: new Date("2026-02-01"),
      description: "Record partial payment - Ndlovu Plumbing Services",
      reference: "BILL-002", sourceType: "vendor_bill", sourceId: bill2.id,
      status: "posted", periodName: "2026-02", postedAt: new Date("2026-02-01"), postedBy: user.id,
      lines: {
        create: [
          { accountCode: "2000", accountName: "Accounts Payable", description: "Partial payment on plumbing bill", debit: 30000, credit: 0, order: 1 },
          { accountCode: "1000", accountName: "FNB Business Cheque", description: "EFT payment", debit: 0, credit: 30000, order: 2 },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      orgId, userId: user.id,
      entryNumber: "JE-000003", date: new Date("2026-02-10"),
      description: "Record Rosebank renovation expenses - February batch",
      sourceType: "expense",
      status: "draft",
      lines: {
        create: [
          { accountCode: "5000", accountName: "Cost of Sales - Materials", description: "Kitchen cabinets, tiles, grout", debit: 69400, credit: 0, dealId: deal1.id, order: 1 },
          { accountCode: "5100", accountName: "Cost of Sales - Labour", description: "Kitchen installation", debit: 18000, credit: 0, dealId: deal1.id, order: 2 },
          { accountCode: "1400", accountName: "VAT Input (Receivable)", description: "VAT @ 15%", debit: 13110, credit: 0, order: 3 },
          { accountCode: "1000", accountName: "FNB Business Cheque", description: "Various payments", debit: 0, credit: 100510, order: 4 },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      orgId, userId: user.id,
      entryNumber: "JE-000004", date: new Date("2026-02-15"),
      description: "Record Stellenbosch property sale",
      reference: "SALE-STELL-001", sourceType: "manual",
      status: "draft",
      lines: {
        create: [
          { accountCode: "1000", accountName: "FNB Business Cheque", description: "Sale proceeds received", debit: 2450000, credit: 0, order: 1 },
          { accountCode: "4000", accountName: "Property Sale Revenue", description: "Sale of 22 Protea Ave, Stellenbosch", debit: 0, credit: 2450000, dealId: deal4.id, order: 2 },
        ],
      },
    },
  });

  console.log("Journal Entries created: 4 (2 posted, 2 draft)");

  // ─── Customer Receivables + Payments ───
  await prisma.customerReceivable.create({
    data: {
      orgId, userId: user.id,
      contactId: agent.id, dealId: deal2.id,
      status: "outstanding", totalAmount: 260000, amountPaid: 0,
      dueDate: new Date("2026-04-30"),
      notes: "Expected deposit from buyer on Camps Bay property (5% of R5.2M asking price)",
    },
  });

  const stellReceivable = await prisma.customerReceivable.create({
    data: {
      orgId, userId: user.id,
      dealId: deal4.id,
      status: "paid", totalAmount: 2450000, amountPaid: 2450000,
      dueDate: new Date("2025-11-30"),
      notes: "Sale proceeds from Stellenbosch property",
    },
  });

  await prisma.receivablePayment.create({
    data: {
      orgId, customerReceivableId: stellReceivable.id,
      amount: 2450000, paymentDate: new Date("2025-10-30"),
      paymentMethod: "eft", reference: "CONV-ATT-STELL",
      idempotencyKey: "recv-stell-full",
      bankAccountId: bankAccount?.id,
      notes: "Transfer from conveyancing attorney",
    },
  });

  console.log("Customer Receivables created: 2 (with 1 payment)");

  // ─── Tool Checkouts ───
  const tools = await prisma.tool.findMany({ where: { orgId } });
  const angleGrinder = tools.find(t => t.name === "Angle Grinder");
  const cordlessDrill = tools.find(t => t.name === "Cordless Drill");
  const circularSaw = tools.find(t => t.name === "Circular Saw");
  const rotaryHammer = tools.find(t => t.name === "Rotary Hammer Drill");

  if (angleGrinder) {
    await prisma.toolCheckout.create({
      data: {
        orgId, userId: user.id, toolId: angleGrinder.id,
        contractorName: "Thabo Mokoena", contractorId: contractor.id,
        dealId: deal1.id, dealName: "12 Oak Lane, Rosebank",
        propertyAddress: "12 Oak Lane, Rosebank, Johannesburg, 2196",
        checkedOutAt: new Date("2026-01-10"), expectedReturnDate: new Date("2026-03-20"),
        conditionOut: "good", notes: "For tile cutting and general grinding on Rosebank project",
      },
    });
  }

  if (cordlessDrill) {
    await prisma.toolCheckout.create({
      data: {
        orgId, userId: user.id, toolId: cordlessDrill.id,
        contractorName: "Pieter Botha", contractorId: pmUser.id,
        dealId: deal5.id, dealName: "7 Loader Street, Green Point",
        propertyAddress: "7 Loader Street, Green Point, Cape Town, 8005",
        checkedOutAt: new Date("2026-02-22"), expectedReturnDate: new Date("2026-02-28"),
        conditionOut: "good", notes: "Quick assessment drilling at Green Point property",
      },
    });

    // Update tool status
    await prisma.tool.update({
      where: { id: cordlessDrill.id },
      data: {
        status: "checked_out", currentHolderName: "Pieter Botha",
        currentDealId: deal5.id, currentDealName: "7 Loader Street, Green Point",
      },
    });
  }

  if (circularSaw) {
    // A returned checkout for history
    await prisma.toolCheckout.create({
      data: {
        orgId, userId: user.id, toolId: circularSaw.id,
        contractorName: "Thabo Mokoena", contractorId: contractor.id,
        dealId: deal4.id, dealName: "22 Protea Avenue, Stellenbosch",
        propertyAddress: "22 Protea Avenue, Stellenbosch, Western Cape, 7600",
        checkedOutAt: new Date("2025-05-15"), expectedReturnDate: new Date("2025-07-15"),
        returnedAt: new Date("2025-07-10"), conditionOut: "good", conditionIn: "good",
        notes: "Used for skirting and trim cutting at Stellenbosch property",
      },
    });
  }

  console.log("Tool Checkouts created: 3");

  // ─── Tool Maintenance ───
  if (rotaryHammer) {
    await prisma.toolMaintenance.create({
      data: {
        orgId, userId: user.id, toolId: rotaryHammer.id,
        date: new Date("2026-02-15"), type: "repair",
        description: "Chuck mechanism seized — sent to Hilti service centre for replacement",
        cost: 1200, performedBy: "Hilti Service Centre, Randburg",
        notes: "Expected return by 2026-03-01. Under extended warranty.",
      },
    });
  }

  if (angleGrinder) {
    await prisma.toolMaintenance.create({
      data: {
        orgId, userId: user.id, toolId: angleGrinder.id,
        date: new Date("2026-01-08"), type: "blade_change",
        description: "Replaced grinding disc with diamond tile cutting blade",
        cost: 350, performedBy: "Bongani Zulu (on-site)",
        notes: "Switched to tile cutting disc for Rosebank bathroom tiling work",
      },
    });
  }

  console.log("Tool Maintenance records created: 2");

  // ─── Tool Incident ───
  if (circularSaw) {
    await prisma.toolIncident.create({
      data: {
        orgId, userId: user.id, toolId: circularSaw.id,
        date: new Date("2026-02-12"), type: "damaged",
        contractorName: "Mandla Khumalo", contractorId: fieldUser.id,
        dealId: deal1.id, dealName: "12 Oak Lane, Rosebank",
        description: "Blade guard spring broke during cutting. Tool still functional but safety guard doesn't retract properly.",
        estimatedCost: 450, recoveryStatus: "pending",
        notes: "Ordered replacement part from DeWalt. Mandla to use hand saw in the interim.",
      },
    });
  }

  console.log("Tool Incidents created: 1");

  // ─── Shopping List Items ───
  await prisma.shoppingListItem.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "paint-interior-white", category: "materials", label: "Interior paint - white (Plascon Double Velvet 5L)", qty: 8, unit: "each", unitPrice: 650, purchased: false, notes: "For bedrooms and passage — need 8 tins minimum" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "light-fittings-led", category: "fixtures", label: "LED downlight fittings", qty: 15, unit: "each", unitPrice: 280, purchased: false, notes: "Warm white 3000K, IP44 for bathrooms" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "skirting-pine-90mm", category: "materials", label: "Pine skirting 90mm (3m lengths)", qty: 20, unit: "each", unitPrice: 85, purchased: false, notes: "For all bedrooms, passage and lounge" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "grout-white-20kg", category: "consumables", label: "Tile grout white (20kg bag)", qty: 4, unit: "each", unitPrice: 250, purchased: true, actualPrice: 230, actualQty: 4, vendor: "CTM", purchasedDate: new Date("2026-02-08"), notes: "Got 8% discount for bulk" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "silicone-clear", category: "consumables", label: "Silicone sealant clear (280ml)", qty: 6, unit: "each", unitPrice: 85, purchased: false, notes: "For bathroom shower screens and basin sealing" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "shower-screen-glass", category: "fixtures", label: "Frameless glass shower screen (900mm)", qty: 2, unit: "each", unitPrice: 4500, purchased: false, notes: "Main bathroom and ensuite — get quotes from Glass Guru" },
      { orgId, userId: user.id, dealId: deal1.id, materialKey: "door-handles-chrome", category: "fixtures", label: "Door handles - chrome lever (sets)", qty: 6, unit: "each", unitPrice: 320, purchased: false, notes: "All interior doors — matching chrome finish" },
    ],
  });
  console.log("Shopping List Items created: 7");

  // ─── Inspections + Defects ───
  const inspection1 = await prisma.inspection.create({
    data: {
      orgId, dealId: deal1.id,
      type: "structural", inspector: "BuildTest CC",
      inspectionDate: new Date("2026-01-08"), status: "passed",
      findings: "Property structurally sound overall. Minor cracks in north-facing bedroom wall (cosmetic, settling). Damp patch in main bathroom floor area — damp proofing recommended before tiling. No evidence of subsidence or major structural concerns.",
      estimatedRepairCost: 8500,
      defects: {
        create: [
          {
            location: "Bedroom 3 - North wall",
            description: "Hairline crack along ceiling cornice, approximately 1.5m long. Typical settling crack, non-structural.",
            severity: "minor", estimatedCost: 1500, status: "remediated",
            remediatedAt: new Date("2026-01-14"), notes: "Filled with flexible filler during plastering phase",
          },
          {
            location: "Main Bathroom - Floor",
            description: "Damp rising from floor slab in south-west corner. Approximately 1 sqm affected area. Likely failed or absent DPC.",
            severity: "moderate", estimatedCost: 5000, status: "remediated",
            remediatedAt: new Date("2026-01-12"), notes: "Applied bitumen-based damp proof course and waterproofing membrane before tiling",
          },
          {
            location: "Kitchen - Window frame",
            description: "Wooden window frame showing early signs of rot at bottom rail. Water ingress from outside.",
            severity: "minor", estimatedCost: 2000, status: "remediated",
            remediatedAt: new Date("2026-01-15"), notes: "Frame treated with wood hardener and sealed. External flashing corrected.",
          },
        ],
      },
    },
  });

  await prisma.inspection.create({
    data: {
      orgId, dealId: deal1.id,
      type: "electrical", inspector: "Johan van der Merwe (Sparks Electrical CC)",
      inspectionDate: new Date("2026-03-15"), status: "scheduled",
      findings: "",
      estimatedRepairCost: 0,
    },
  });

  console.log("Inspections created: 2 (with 3 defects)");

  // ─── Permits ───
  await prisma.permit.create({
    data: {
      orgId, dealId: deal1.id,
      permitType: "building", permitNumber: "BP/2025/JHB/4521",
      status: "approved", appliedDate: new Date("2025-11-20"), approvedDate: new Date("2025-12-15"),
      expiryDate: new Date("2026-12-15"), issuingAuthority: "City of Johannesburg",
      cost: 3500, notes: "Building plan approval for kitchen and bathroom renovation. Covers internal structural changes.",
    },
  });

  await prisma.permit.create({
    data: {
      orgId, dealId: deal1.id,
      permitType: "electrical", permitNumber: "",
      status: "applied", appliedDate: new Date("2026-02-20"),
      issuingAuthority: "City of Johannesburg",
      cost: 1200, notes: "Electrical Certificate of Compliance — application submitted, pending inspection after rewiring completion.",
    },
  });

  console.log("Permits created: 2");

  // ─── Comparable Sales ───
  await prisma.comparableSale.createMany({
    data: [
      {
        orgId, dealId: deal1.id,
        address: "8 Keyes Avenue, Rosebank, Johannesburg",
        salePrice: 1950000, saleDate: new Date("2025-10-15"),
        sqm: 160, pricePerSqm: 12187, bedrooms: 3, bathrooms: 2,
        condition: "good", source: "property24",
        notes: "Fully renovated 3-bed, sold quickly. Similar spec to our target.",
      },
      {
        orgId, dealId: deal1.id,
        address: "15 Bath Avenue, Rosebank, Johannesburg",
        salePrice: 2100000, saleDate: new Date("2025-09-20"),
        sqm: 180, pricePerSqm: 11667, bedrooms: 3, bathrooms: 2,
        condition: "excellent", source: "agent",
        notes: "Premium renovation with pool. Higher end market. Agent: Lerato Moloi.",
      },
      {
        orgId, dealId: deal1.id,
        address: "22 Jellicoe Avenue, Rosebank, Johannesburg",
        salePrice: 1720000, saleDate: new Date("2025-11-05"),
        sqm: 145, pricePerSqm: 11862, bedrooms: 3, bathrooms: 1,
        condition: "average", source: "lightstone",
        notes: "Only 1 bathroom — our property will command premium with 2 full baths + ensuite.",
      },
      {
        orgId, dealId: deal1.id,
        address: "3 Cradock Avenue, Parktown, Johannesburg",
        salePrice: 1850000, saleDate: new Date("2025-08-30"),
        sqm: 170, pricePerSqm: 10882, bedrooms: 4, bathrooms: 2,
        condition: "good", source: "lightstone",
        notes: "Adjacent suburb. 4-bed but older finishes. Supports our R1.85M pricing.",
      },
    ],
  });
  console.log("Comparable Sales created: 4");

  // ─── Insurance Policies ───
  await prisma.insurancePolicy.create({
    data: {
      orgId, dealId: deal1.id,
      policyType: "builders_risk", provider: "Santam",
      policyNumber: "SAN-BR-2025-7821",
      coverAmount: 1500000, monthlyPremium: 950,
      startDate: new Date("2025-12-20"), endDate: new Date("2026-06-20"),
      status: "active",
      notes: "Covers fire, storm, theft, and accidental damage during renovation. Excess: R5,000.",
    },
  });

  await prisma.insurancePolicy.create({
    data: {
      orgId,
      policyType: "liability", provider: "Old Mutual iWyze",
      policyNumber: "OM-PL-2024-1234",
      coverAmount: 5000000, monthlyPremium: 1200,
      startDate: new Date("2024-06-01"), endDate: new Date("2026-06-01"),
      status: "active",
      notes: "Public liability for all sites. Covers injury to third parties and property damage. R10,000 excess.",
    },
  });

  console.log("Insurance Policies created: 2");

  // ─── Contractor Ratings ───
  await prisma.contractorRating.create({
    data: {
      orgId, contactId: contractor.id, dealId: deal4.id,
      qualityScore: 4, timelinessScore: 5, communicationScore: 4, valueScore: 4,
      overallScore: 4.25, wouldRehire: true,
      review: "Thabo and his team delivered the Stellenbosch cosmetic reno ahead of schedule. Clean work, minimal punch-list items. Fair pricing. Would use again for similar scope.",
    },
  });

  await prisma.contractorRating.create({
    data: {
      orgId, contactId: plumber.id, dealId: deal4.id,
      qualityScore: 5, timelinessScore: 4, communicationScore: 5, valueScore: 3,
      overallScore: 4.25, wouldRehire: true,
      review: "Sipho's plumbing work is top quality — no callbacks. COC issued first time. Slightly pricier than alternatives but worth it for the reliability and compliance.",
    },
  });

  console.log("Contractor Ratings created: 2");

  // ─── Leave Records ───
  const employees = await prisma.employee.findMany({ where: { orgId } });
  const empBongani = employees.find(e => e.firstName === "Bongani");
  const empMandla = employees.find(e => e.firstName === "Mandla");
  const empNomsa = employees.find(e => e.firstName === "Nomsa");

  if (empBongani) {
    await prisma.leaveRecord.create({
      data: {
        orgId, employeeId: empBongani.id,
        leaveType: "sick", startDate: new Date("2026-02-03"), endDate: new Date("2026-02-04"),
        days: 2, status: "approved", reason: "Flu — doctor's note provided",
        approvedBy: user.id, approvedAt: new Date("2026-02-03"),
      },
    });
  }

  if (empMandla) {
    await prisma.leaveRecord.create({
      data: {
        orgId, employeeId: empMandla.id,
        leaveType: "annual", startDate: new Date("2026-03-10"), endDate: new Date("2026-03-14"),
        days: 5, status: "approved", reason: "Family event in Durban",
        approvedBy: pmUser.id, approvedAt: new Date("2026-02-20"),
      },
    });
  }

  if (empNomsa) {
    await prisma.leaveRecord.create({
      data: {
        orgId, employeeId: empNomsa.id,
        leaveType: "annual", startDate: new Date("2026-04-01"), endDate: new Date("2026-04-04"),
        days: 4, status: "pending", reason: "Easter break",
      },
    });
  }

  console.log("Leave Records created: 3");

  // ─── Payslips ───
  if (empBongani) {
    await prisma.payslip.create({
      data: {
        orgId, employeeId: empBongani.id,
        periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31"),
        basePay: 28000, grossPay: 28000, paye: 3920, uif: 280, medicalAid: 1400,
        totalDeductions: 5600, netPay: 22400,
        status: "paid", paymentDate: new Date("2026-01-25"), paymentRef: "SAL-JAN-001",
        notes: "January 2026 salary. Deductions: PAYE R3,920 + UIF R280 + medical aid R1,400.",
      },
    });
    await prisma.payslip.create({
      data: {
        orgId, employeeId: empBongani.id,
        periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28"),
        basePay: 28000, grossPay: 28000, paye: 3920, uif: 280, medicalAid: 1400,
        totalDeductions: 5600, netPay: 22400,
        status: "paid", paymentDate: new Date("2026-02-25"), paymentRef: "SAL-FEB-001",
        notes: "February 2026 salary. 2 sick days taken (paid).",
      },
    });
  }

  if (empMandla) {
    await prisma.payslip.create({
      data: {
        orgId, employeeId: empMandla.id,
        periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31"),
        basePay: 12000, grossPay: 12000, paye: 1200, uif: 120, otherDeductions: 360,
        totalDeductions: 1680, netPay: 10320,
        status: "paid", paymentDate: new Date("2026-01-25"), paymentRef: "SAL-JAN-002",
        notes: "January 2026 salary.",
      },
    });
    await prisma.payslip.create({
      data: {
        orgId, employeeId: empMandla.id,
        periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28"),
        basePay: 12000, grossPay: 12000, paye: 1200, uif: 120, otherDeductions: 360,
        totalDeductions: 1680, netPay: 10320,
        status: "draft",
        notes: "February 2026 salary — pending approval.",
      },
    });
  }

  if (empNomsa) {
    await prisma.payslip.create({
      data: {
        orgId, employeeId: empNomsa.id,
        periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31"),
        basePay: 45000, grossPay: 45000, paye: 10125, uif: 450, medicalAid: 2025,
        totalDeductions: 12600, netPay: 32400,
        status: "paid", paymentDate: new Date("2026-01-25"), paymentRef: "SAL-JAN-003",
        notes: "January 2026 salary. Higher PAYE bracket.",
      },
    });
  }

  console.log("Payslips created: 5");

  // ─── Additional Notifications ───
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { orgId, userId: user.id, type: "budget_alert", title: "Rosebank renovation at 78% of budget", message: "12 Oak Lane renovation spend has reached R234,800 of R300,000 budget (78%). Approaching 80% alert threshold.", read: false },
      { orgId, userId: user.id, type: "tool_overdue", title: "Tool return overdue: Cordless Drill", message: "The Makita DHP482 cordless drill checked out to Pieter Botha was expected back by 28 Feb.", read: false },
      { orgId, userId: pmUser.id, type: "deadline_warning", title: "Milestone approaching: Flooring Installation", message: "Flooring Installation at 12 Oak Lane is due on 25 Feb 2026 — 3 days away.", read: false },
    ],
  });

  console.log("Additional Notifications created: 3");

  console.log("\nSeed completed successfully!");
}

// When executed as a script (e.g. npx prisma db seed) run the seeding function
if (require.main === module) {
  seed()
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
