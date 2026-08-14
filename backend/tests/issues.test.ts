import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, seedCategoryWithDepartment, insertRawIssue } from "./helpers/testApp.js";
import { prisma } from "../src/shared/lib/prisma.js";

async function loginAs(email: string, password: string) {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.accessToken as string;
}

describe("issue dedup + routing pipeline", () => {
  it("creates a new issue and its work order when no nearby duplicate exists (dedup miss)", async () => {
    const { category, department } = await seedCategoryWithDepartment({ categoryCode: `roads-${Date.now()}` });
    const { email, password } = await createTestUser("citizen");
    const token = await loginAs(email, password);

    const res = await request(app)
      .post("/issues")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Pothole near market",
        description: "Deep pothole causing traffic issues",
        categoryCode: category.code,
        latitude: 22.7196,
        longitude: 75.8577,
      });

    expect(res.status).toBe(201);
    expect(res.body.issue).toBeTruthy();
    expect(res.body.issue.category.code).toBe(category.code);

    const workOrders = await prisma.workOrder.findMany({ where: { issueId: res.body.issue.id } });
    expect(workOrders).toHaveLength(1);
    expect(workOrders[0].departmentId).toBe(department.id);
    expect(workOrders[0].role).toBe("primary");
  });

  it("returns a duplicateCandidate instead of creating a new issue when one is nearby (dedup hit)", async () => {
    const { category } = await seedCategoryWithDepartment({ categoryCode: `sanitation-${Date.now()}`, radiusM: 200 });
    const { user, email, password } = await createTestUser("citizen");
    const token = await loginAs(email, password);

    const existingIssueId = await insertRawIssue({
      categoryId: category.id,
      reportedBy: user.id,
      latitude: 22.72,
      longitude: 75.86,
      title: "Existing garbage report",
    });

    // Report the "same" issue ~50m away — well within the 200m radius.
    const res = await request(app)
      .post("/issues")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Garbage pile nearby",
        description: "Same overflowing bin, different angle",
        categoryCode: category.code,
        latitude: 22.7205,
        longitude: 75.8605,
      });

    expect(res.status).toBe(200);
    expect(res.body.duplicateCandidate).toBeTruthy();
    expect(res.body.duplicateCandidate.id).toBe(existingIssueId);

    const totalIssuesWithThatCategory = await prisma.issue.count({ where: { categoryId: category.id } });
    expect(totalIssuesWithThatCategory).toBe(1); // no new row inserted
  });

  it("does NOT dedup a report far outside the category's radius", async () => {
    const { category } = await seedCategoryWithDepartment({ categoryCode: `elec-${Date.now()}`, radiusM: 50 });
    const { user, email, password } = await createTestUser("citizen");
    const token = await loginAs(email, password);

    await insertRawIssue({ categoryId: category.id, reportedBy: user.id, latitude: 22.72, longitude: 75.86 });

    // ~1km away — outside a 50m dedup radius.
    const res = await request(app)
      .post("/issues")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Unrelated outage",
        description: "Different location entirely",
        categoryCode: category.code,
        latitude: 22.73,
        longitude: 75.86,
      });

    expect(res.status).toBe(201);
    expect(res.body.issue).toBeTruthy();
  });
});

describe("work order status transitions", () => {
  it("rejects an invalid transition (pending -> done, skipping acknowledged/in_progress)", async () => {
    const { category, department } = await seedCategoryWithDepartment({ categoryCode: `buildings-${Date.now()}` });
    const { email: citizenEmail, password: citizenPassword } = await createTestUser("citizen");
    const citizenToken = await loginAs(citizenEmail, citizenPassword);

    const create = await request(app)
      .post("/issues")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({ title: "Cracked wall", description: "Visible crack", categoryCode: category.code, latitude: 23.2599, longitude: 77.4126 });

    const workOrder = await prisma.workOrder.findFirstOrThrow({ where: { issueId: create.body.issue.id } });

    const { email: adminEmail, password: adminPassword } = await createTestUser("dept_admin", department.id);
    const adminToken = await loginAs(adminEmail, adminPassword);

    const res = await request(app)
      .patch(`/work-orders/${workOrder.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "done" });

    // 422, not 400: the request is well-formed, the state change is what's
    // rejected. Matches the issue lifecycle endpoint's contract.
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ILLEGAL_TRANSITION");
  });

  it("accepts a valid transition and propagates status to the parent issue for a primary work order", async () => {
    const { category, department } = await seedCategoryWithDepartment({ categoryCode: `parks-${Date.now()}` });
    const { email: citizenEmail, password: citizenPassword } = await createTestUser("citizen");
    const citizenToken = await loginAs(citizenEmail, citizenPassword);

    const create = await request(app)
      .post("/issues")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({ title: "Broken swing", description: "Unsafe for kids", categoryCode: category.code, latitude: 23.2599, longitude: 77.4126 });

    const workOrder = await prisma.workOrder.findFirstOrThrow({ where: { issueId: create.body.issue.id } });

    const { email: adminEmail, password: adminPassword } = await createTestUser("dept_admin", department.id);
    const adminToken = await loginAs(adminEmail, adminPassword);

    const res = await request(app)
      .patch(`/work-orders/${workOrder.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "acknowledged" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("acknowledged");

    const issue = await prisma.issue.findUniqueOrThrow({ where: { id: create.body.issue.id } });
    expect(issue.status).toBe("acknowledged");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
