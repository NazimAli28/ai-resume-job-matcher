import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Integration test against the real database. Runs locally (where .env.local exists);
// skipped in CI, which has no database credentials.
config({ path: ".env.local", quiet: true });
vi.mock("server-only", () => ({}));
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("profile authorization (cross-account access)", async () => {
  const { db } = await import("../db");
  const svc = await import("./service");
  const alice = randomUUID();
  const bob = randomUUID();
  let aliceRole = "";
  let aliceFact = "";
  let aliceSkill = "";

  beforeAll(async () => {
    await db.user.createMany({
      data: [
        { id: alice, email: `authz-${alice}@test.invalid` },
        { id: bob, email: `authz-${bob}@test.invalid` },
      ],
    });
    const role = await svc.createExperience(alice, { title: "Dev", employer: "Kinara", location: null, startDate: new Date("2023-01-01"), endDate: null, bullets: ["Built X"] });
    aliceRole = role.id;
    aliceFact = (await svc.createFact(alice, { statement: "Set up Docker for local dev", metric: null, skillName: "Docker", experienceId: role.id })).id;
    aliceSkill = (await svc.upsertSkill(alice, { name: "React", level: 4, years: 2 })).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [alice, bob] } } }); // cascades to profile rows
    await db.$disconnect();
  });

  it("bob cannot edit or delete alice's role", async () => {
    await expect(svc.updateExperience(bob, aliceRole, { title: "Hacked", employer: "X", location: null, startDate: new Date("2020-01-01"), endDate: null, bullets: [] })).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.deleteExperience(bob, aliceRole)).rejects.toBeInstanceOf(svc.NotFoundError);
    expect((await db.experience.findUnique({ where: { id: aliceRole } }))?.title).toBe("Dev");
  });

  it("bob cannot touch alice's evidence or skills", async () => {
    await expect(svc.deleteFact(bob, aliceFact)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.deleteSkill(bob, aliceSkill)).rejects.toBeInstanceOf(svc.NotFoundError);
    await expect(svc.updateFact(bob, aliceFact, { statement: "Changed by someone else", metric: null, skillName: null, experienceId: null })).rejects.toBeInstanceOf(svc.NotFoundError);
  });

  it("bob cannot attach his evidence to alice's role", async () => {
    await expect(svc.createFact(bob, { statement: "Linking to a role I don't own", metric: null, skillName: null, experienceId: aliceRole })).rejects.toBeInstanceOf(svc.NotFoundError);
  });

  it("bob's profile read never includes alice's data", async () => {
    await svc.ensureProfile(bob);
    const p = await svc.getFullProfile(bob);
    expect(p?.experiences).toHaveLength(0);
    expect(p?.facts).toHaveLength(0);
    expect(p?.skills).toHaveLength(0);
  });

  it("alice can still manage her own data", async () => {
    await svc.deleteSkill(alice, aliceSkill);
    expect(await db.skill.count({ where: { id: aliceSkill } })).toBe(0);
  });
});
