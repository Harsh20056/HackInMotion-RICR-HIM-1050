import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required seed env var: ${name}`);
  return v;
}

const DEPARTMENTS = [
  { code: "water_supply", nameEn: "Jal Board / Water Corporation", nameHi: "जल बोर्ड" },
  { code: "sanitation", nameEn: "Municipal Solid Waste Management", nameHi: "नगर निगम स्वच्छता विभाग" },
  { code: "electricity", nameEn: "State Electricity Board / DISCOM", nameHi: "राज्य विद्युत बोर्ड" },
  { code: "roads", nameEn: "Public Works Department (PWD)", nameHi: "लोक निर्माण विभाग" },
  { code: "parks", nameEn: "Horticulture Department", nameHi: "उद्यान विभाग" },
  { code: "buildings", nameEn: "Building & Construction Department", nameHi: "भवन एवं निर्माण विभाग" },
];

const CATEGORIES = [
  { code: "water", nameEn: "Water Supply", nameHi: "जल आपूर्ति", dept: "water_supply", priority: 2, radius: 100, window: 72 },
  { code: "sanitation", nameEn: "Sanitation", nameHi: "स्वच्छता", dept: "sanitation", priority: 3, radius: 75, window: 48 },
  { code: "electricity", nameEn: "Electricity", nameHi: "बिजली", dept: "electricity", priority: 1, radius: 100, window: 24 },
  { code: "roads", nameEn: "Roads", nameHi: "सड़कें", dept: "roads", priority: 3, radius: 50, window: 168 },
  { code: "parks", nameEn: "Parks & Gardens", nameHi: "पार्क और बगीचे", dept: "parks", priority: 4, radius: 75, window: 168 },
  { code: "buildings", nameEn: "Buildings", nameHi: "भवन", dept: "buildings", priority: 2, radius: 50, window: 168 },
];

// Demonstrates multi-department routing via data, not code: sanitation
// issues also notify the roads department (garbage often blocks roadways).
const EXTRA_ROUTING_RULES: { categoryCode: string; departmentCode: string; role: "supporting" | "notify"; priority: number }[] = [
  { categoryCode: "sanitation", departmentCode: "roads", role: "notify", priority: 5 },
];

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
];

const ISSUE_STATUSES = ["reported", "acknowledged", "in_progress", "resolved", "rejected"] as const;

const TITLES: Record<string, string[]> = {
  water: ["Water pipeline leak on main road", "No water supply for 3 days", "Contaminated water in tap"],
  sanitation: ["Overflowing garbage bin", "Garbage not collected for a week", "Open dumping near residential area"],
  electricity: ["Streetlight outage on residential lane", "Frequent power cuts", "Exposed live wire near park"],
  roads: ["Large pothole near market road", "Road caved in after rains", "Broken footpath tiles"],
  parks: ["Overgrown park needs maintenance", "Broken play equipment in park", "Park lighting not working"],
  buildings: ["Crack in municipal building wall", "Unsafe staircase railing", "Water seepage in community hall"],
};

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitterCoord(base: number, magnitude = 0.05): number {
  return base + (Math.random() - 0.5) * magnitude;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function upsertDepartments() {
  const map = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { code: dept.code },
      update: { nameEn: dept.nameEn, nameHi: dept.nameHi },
      create: dept,
    });
    map.set(dept.code, row.id);
  }
  return map;
}

async function upsertCategories(deptIds: Map<string, string>) {
  const map = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const departmentId = deptIds.get(cat.dept)!;
    const row = await prisma.issueCategory.upsert({
      where: { code: cat.code },
      update: {
        nameEn: cat.nameEn,
        nameHi: cat.nameHi,
        defaultDepartmentId: departmentId,
        defaultPriority: cat.priority,
        dedupRadiusM: cat.radius,
        dedupWindowHours: cat.window,
      },
      create: {
        code: cat.code,
        nameEn: cat.nameEn,
        nameHi: cat.nameHi,
        defaultDepartmentId: departmentId,
        defaultPriority: cat.priority,
        dedupRadiusM: cat.radius,
        dedupWindowHours: cat.window,
      },
    });
    map.set(cat.code, row.id);
  }
  return map;
}

async function upsertRoutingRules(deptIds: Map<string, string>, catIds: Map<string, string>) {
  // Primary rule: every category routes to its own default department.
  for (const cat of CATEGORIES) {
    await prisma.categoryDepartmentRule.upsert({
      where: {
        categoryId_departmentId_role: {
          categoryId: catIds.get(cat.code)!,
          departmentId: deptIds.get(cat.dept)!,
          role: "primary",
        },
      },
      update: { priority: cat.priority },
      create: {
        categoryId: catIds.get(cat.code)!,
        departmentId: deptIds.get(cat.dept)!,
        role: "primary",
        priority: cat.priority,
      },
    });
  }

  for (const rule of EXTRA_ROUTING_RULES) {
    await prisma.categoryDepartmentRule.upsert({
      where: {
        categoryId_departmentId_role: {
          categoryId: catIds.get(rule.categoryCode)!,
          departmentId: deptIds.get(rule.departmentCode)!,
          role: rule.role,
        },
      },
      update: { priority: rule.priority },
      create: {
        categoryId: catIds.get(rule.categoryCode)!,
        departmentId: deptIds.get(rule.departmentCode)!,
        role: rule.role,
        priority: rule.priority,
      },
    });
  }
}

async function upsertUsers(deptIds: Map<string, string>) {
  const superAdminEmail = requireEnv("SEED_SUPER_ADMIN_EMAIL");
  const superAdminPassword = requireEnv("SEED_SUPER_ADMIN_PASSWORD");
  const deptAdminPassword = requireEnv("SEED_DEPT_ADMIN_PASSWORD");
  const citizenPassword = requireEnv("SEED_CITIZEN_PASSWORD");

  const superAdminHash = await bcrypt.hash(superAdminPassword, BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: { email: superAdminEmail, passwordHash: superAdminHash, fullName: "Super Admin", role: "super_admin" },
  });

  const deptAdminHash = await bcrypt.hash(deptAdminPassword, BCRYPT_ROUNDS);
  const deptAdminIds = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const email = `${dept.code}.admin@samadhan.gov.in`;
    const row = await prisma.user.upsert({
      where: { email },
      update: { departmentId: deptIds.get(dept.code) },
      create: {
        email,
        passwordHash: deptAdminHash,
        fullName: `${dept.nameEn} Admin`,
        role: "dept_admin",
        departmentId: deptIds.get(dept.code),
      },
    });
    deptAdminIds.set(dept.code, row.id);
  }

  const citizenHash = await bcrypt.hash(citizenPassword, BCRYPT_ROUNDS);
  const citizenNames = ["Rajesh Kumar", "Priya Sharma", "Amit Patel"];
  const citizenIds: string[] = [];
  for (let i = 0; i < citizenNames.length; i++) {
    const email = `citizen${i + 1}@samadhan.gov.in`;
    const row = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: citizenHash, fullName: citizenNames[i], role: "citizen" },
    });
    citizenIds.push(row.id);
  }

  return { citizenIds };
}

async function seedIssues(catIds: Map<string, string>, deptIds: Map<string, string>, citizenIds: string[]) {
  const existingCount = await prisma.issue.count();
  if (existingCount > 0) {
    console.log(`Skipping issue seed — ${existingCount} issues already exist (idempotent).`);
    return;
  }

  const rules = await prisma.categoryDepartmentRule.findMany();

  for (let i = 0; i < 40; i++) {
    const category = randomFrom(CATEGORIES);
    const city = randomFrom(CITIES);
    const status = randomFrom(ISSUE_STATUSES);
    const reporterId = randomFrom(citizenIds);
    const createdAt = daysAgo(Math.floor(Math.random() * 60));
    const lat = jitterCoord(city.lat);
    const lng = jitterCoord(city.lng);
    const publicRef = `SAM-${createdAt.getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const [{ id: issueId }] = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO issues (public_ref, title, description, category_id, status, priority, reported_by, address, location, created_at)
      VALUES (
        ${publicRef}, ${randomFrom(TITLES[category.code])}, ${"Reported via seed data for local development."},
        ${catIds.get(category.code)!}::uuid, ${status}::"IssueStatus", ${category.priority}, ${reporterId}::uuid,
        ${city.name + ", India"},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${createdAt}
      )
      RETURNING id
    `);

    await prisma.issueReport.create({
      data: {
        issueId,
        reporterId,
        description: "Reported via seed data for local development.",
        isPrimary: true,
        createdAt,
      },
    });

    const categoryRules = rules.filter((r) => r.categoryId === catIds.get(category.code));
    for (const [idx, rule] of categoryRules.entries()) {
      const woStatus =
        status === "reported" ? "pending" : status === "acknowledged" ? "acknowledged" : status === "in_progress" ? "in_progress" : status === "resolved" ? "done" : "rejected";

      await prisma.workOrder.create({
        data: {
          issueId,
          departmentId: rule.departmentId,
          role: rule.role,
          status: woStatus,
          priority: rule.priority,
          sequence: idx,
          createdAt,
          completedAt: woStatus === "done" || woStatus === "rejected" ? daysAgo(Math.max(0, Math.floor(Math.random() * 5))) : null,
        },
      });
    }

    await prisma.issueStatusHistory.create({
      data: {
        issueId,
        fromStatus: null,
        toStatus: "reported",
        actorId: reporterId,
        actorRole: "citizen",
        reason: "Issue reported",
        createdAt,
      },
    });
  }

  console.log("Seeded 40 issues.");
}

async function main() {
  console.log("Seeding departments...");
  const deptIds = await upsertDepartments();

  console.log("Seeding categories...");
  const catIds = await upsertCategories(deptIds);

  console.log("Seeding routing rules...");
  await upsertRoutingRules(deptIds, catIds);

  console.log("Seeding users...");
  const { citizenIds } = await upsertUsers(deptIds);

  console.log("Seeding issues...");
  await seedIssues(catIds, deptIds, citizenIds);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
