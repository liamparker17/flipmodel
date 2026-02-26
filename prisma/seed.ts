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
  await prisma.deal.deleteMany({ where: { orgId } });
  console.log("Existing deals deleted (demo refresh)");

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
            estimate: 11200,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 22, unitPrice: 320, amount: 7040, completed: false },
              { key: "painting", label: "Painting", unit: "sqm", qty: 22, unitPrice: 120, amount: 2640, completed: false },
              { key: "lightFittings", label: "Light fittings (2)", unit: "unit", qty: 2, unitPrice: 1200, amount: 2400, completed: false },
              { key: "electrical", label: "Electrical points (4)", unit: "point", qty: 4, unitPrice: 850, amount: 3400, completed: false },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 14,
            estimate: 7500,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 14, unitPrice: 320, amount: 4480, completed: false },
              { key: "painting", label: "Painting", unit: "sqm", qty: 14, unitPrice: 120, amount: 1680, completed: false },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3",
            sqm: 12,
            estimate: 6800,
            status: "planned",
            items: [
              { key: "flooring", label: "Laminate flooring", unit: "sqm", qty: 12, unitPrice: 320, amount: 3840, completed: false },
              { key: "painting", label: "Painting", unit: "sqm", qty: 12, unitPrice: 120, amount: 1440, completed: false },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Dining",
            sqm: 30,
            estimate: 14200,
            status: "planned",
            items: [
              { key: "flooring", label: "Porcelain floor tiles", unit: "sqm", qty: 30, unitPrice: 480, amount: 14400, completed: false },
              { key: "painting", label: "Painting", unit: "sqm", qty: 30, unitPrice: 120, amount: 3600, completed: false },
              { key: "lightFittings", label: "Light fittings (3)", unit: "unit", qty: 3, unitPrice: 1500, amount: 4500, completed: false },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 850, amount: 5100, completed: false },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Passage",
            sqm: 8,
            estimate: 3800,
            status: "planned",
            items: [
              { key: "flooring", label: "Tile flooring", unit: "sqm", qty: 8, unitPrice: 480, amount: 3840, completed: false },
              { key: "painting", label: "Painting", unit: "sqm", qty: 8, unitPrice: 120, amount: 960, completed: false },
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
            estimate: 18200,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 38, unitPrice: 350, amount: 13300, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 38, unitPrice: 180, amount: 6840, completed: true },
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
            estimate: 11800,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 24, unitPrice: 350, amount: 8400, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 24, unitPrice: 180, amount: 4320, completed: true },
              { key: "lightFittings", label: "Designer light fittings (2)", unit: "unit", qty: 2, unitPrice: 2200, amount: 4400, completed: true },
            ],
          },
          {
            id: "room-7",
            type: "bedroom",
            name: "Bedroom 3 / Study",
            sqm: 18,
            estimate: 8900,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 18, unitPrice: 350, amount: 6300, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 18, unitPrice: 180, amount: 3240, completed: true },
              { key: "lightFittings", label: "Light fitting (1)", unit: "unit", qty: 1, unitPrice: 2200, amount: 2200, completed: true },
            ],
          },
          {
            id: "room-8",
            type: "bedroom",
            name: "Bedroom 4 / Media Room",
            sqm: 20,
            estimate: 15800,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian tiles", unit: "sqm", qty: 20, unitPrice: 350, amount: 7000, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 20, unitPrice: 180, amount: 3600, completed: true },
              { key: "lightFittings", label: "Recessed lighting (4)", unit: "unit", qty: 4, unitPrice: 1600, amount: 6400, completed: true },
            ],
          },
          {
            id: "room-9",
            type: "lounge",
            name: "Lounge / Living Area",
            sqm: 48,
            estimate: 28600,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian floor tiles", unit: "sqm", qty: 48, unitPrice: 500, amount: 24000, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 48, unitPrice: 150, amount: 7200, completed: true },
              { key: "lightFittings", label: "Designer light fittings (4)", unit: "unit", qty: 4, unitPrice: 2800, amount: 11200, completed: true },
              { key: "electrical", label: "Electrical points (8)", unit: "point", qty: 8, unitPrice: 1200, amount: 9600, completed: true },
            ],
          },
          {
            id: "room-10",
            type: "lounge",
            name: "Formal Dining Room",
            sqm: 28,
            estimate: 16200,
            status: "completed",
            items: [
              { key: "flooring", label: "Imported Italian floor tiles", unit: "sqm", qty: 28, unitPrice: 500, amount: 14000, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 28, unitPrice: 150, amount: 4200, completed: true },
              { key: "lightFittings", label: "Chandelier & lights (3)", unit: "unit", qty: 3, unitPrice: 3200, amount: 9600, completed: true },
            ],
          },
          {
            id: "room-11",
            type: "entrance",
            name: "Main Entrance & Foyer",
            sqm: 18,
            estimate: 12400,
            status: "completed",
            items: [
              { key: "flooring", label: "Marble floor tiles", unit: "sqm", qty: 18, unitPrice: 600, amount: 10800, completed: true },
              { key: "painting", label: "Premium paint finish", unit: "sqm", qty: 18, unitPrice: 150, amount: 2700, completed: true },
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
            estimate: 42000,
            status: "completed",
            items: [
              { key: "cabinetry", label: "Cabinet refresh / varnish", unit: "lm", qty: 4, unitPrice: 2500, amount: 10000, completed: true },
              { key: "countertops", label: "Countertop restoration", unit: "lm", qty: 4, unitPrice: 1500, amount: 6000, completed: true },
              { key: "sink", label: "Sink cleaning & tap replacement", unit: "unit", qty: 1, unitPrice: 3500, amount: 3500, completed: true },
              { key: "splashback", label: "Splashback update", unit: "sqm", qty: 2, unitPrice: 400, amount: 800, completed: true },
              { key: "painting", label: "Kitchen painting", unit: "sqm", qty: 18, unitPrice: 150, amount: 2700, completed: true },
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
            estimate: 6500,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint (warm neutrals)", unit: "sqm", qty: 26, unitPrice: 150, amount: 3900, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 26, unitPrice: 80, amount: 2080, completed: true },
              { key: "lighting", label: "Lighting upgrade", unit: "unit", qty: 2, unitPrice: 900, amount: 1800, completed: true },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 16,
            estimate: 4200,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint", unit: "sqm", qty: 16, unitPrice: 150, amount: 2400, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 16, unitPrice: 80, amount: 1280, completed: true },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 900, amount: 900, completed: true },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3",
            sqm: 14,
            estimate: 3700,
            status: "completed",
            items: [
              { key: "painting", label: "Interior paint", unit: "sqm", qty: 14, unitPrice: 150, amount: 2100, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 14, unitPrice: 80, amount: 1120, completed: true },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 900, amount: 900, completed: true },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Dining",
            sqm: 35,
            estimate: 8800,
            status: "completed",
            items: [
              { key: "painting", label: "Feature wall & general paint", unit: "sqm", qty: 35, unitPrice: 150, amount: 5250, completed: true },
              { key: "flooring", label: "Floor polish & seal", unit: "sqm", qty: 35, unitPrice: 80, amount: 2800, completed: true },
              { key: "lighting", label: "Ceiling roses & lights", unit: "unit", qty: 3, unitPrice: 1200, amount: 3600, completed: true },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Passage",
            sqm: 12,
            estimate: 3200,
            status: "completed",
            items: [
              { key: "painting", label: "Paint entrance", unit: "sqm", qty: 12, unitPrice: 150, amount: 1800, completed: true },
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
            estimate: 12500,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 20, unitPrice: 450, amount: 9000, completed: false },
              { key: "painting", label: "Premium paint", unit: "sqm", qty: 20, unitPrice: 120, amount: 2400, completed: false },
              { key: "lightFittings", label: "Pendant lights (2)", unit: "unit", qty: 2, unitPrice: 1400, amount: 2800, completed: false },
              { key: "electrical", label: "Electrical points (4)", unit: "point", qty: 4, unitPrice: 900, amount: 3600, completed: false },
            ],
          },
          {
            id: "room-5",
            type: "bedroom",
            name: "Bedroom 2",
            sqm: 14,
            estimate: 7500,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 14, unitPrice: 450, amount: 6300, completed: false },
              { key: "painting", label: "Paint", unit: "sqm", qty: 14, unitPrice: 120, amount: 1680, completed: false },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-6",
            type: "bedroom",
            name: "Bedroom 3 / Study",
            sqm: 12,
            estimate: 6200,
            status: "planned",
            items: [
              { key: "flooring", label: "Engineered timber flooring", unit: "sqm", qty: 12, unitPrice: 450, amount: 5400, completed: false },
              { key: "painting", label: "Paint", unit: "sqm", qty: 12, unitPrice: 120, amount: 1440, completed: false },
              { key: "lighting", label: "Light fitting", unit: "unit", qty: 1, unitPrice: 1200, amount: 1200, completed: false },
            ],
          },
          {
            id: "room-7",
            type: "lounge",
            name: "Lounge / Living Area",
            sqm: 32,
            estimate: 16800,
            status: "planned",
            items: [
              { key: "flooring", label: "Premium tile flooring", unit: "sqm", qty: 32, unitPrice: 500, amount: 16000, completed: false },
              { key: "painting", label: "Paint", unit: "sqm", qty: 32, unitPrice: 100, amount: 3200, completed: false },
              { key: "lighting", label: "Feature lighting (3)", unit: "unit", qty: 3, unitPrice: 1800, amount: 5400, completed: false },
              { key: "electrical", label: "Electrical points (6)", unit: "point", qty: 6, unitPrice: 900, amount: 5400, completed: false },
            ],
          },
          {
            id: "room-8",
            type: "entrance",
            name: "Entrance / Foyer",
            sqm: 8,
            estimate: 4800,
            status: "planned",
            items: [
              { key: "flooring", label: "Tile flooring", unit: "sqm", qty: 8, unitPrice: 500, amount: 4000, completed: false },
              { key: "painting", label: "Paint", unit: "sqm", qty: 8, unitPrice: 100, amount: 800, completed: false },
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
