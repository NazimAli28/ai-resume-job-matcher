import { describe, expect, it } from "vitest";
import { blankNumbers, checkClaim, checkTopicSentence, namesIn, normalizeNumber, numbersIn, placeholdersIn } from "./facts";

const bullet = "Developed REST APIs in Node.js for the billing team at Arbisoft, serving 1,200 daily users";

describe("entity extraction", () => {
  it("normalizes figures however they are written", () => {
    expect(normalizeNumber("1,200")).toBe("1200");
    expect(normalizeNumber("10k")).toBe("10000");
    expect(normalizeNumber("2 lakh")).toBe("200000");
    expect(normalizeNumber("30 %")).toBe("30%");
    expect(numbersIn("cut costs by thirty percent and served twelve clients")).toEqual(expect.arrayContaining(["30%", "12"]));
  });
  it("ignores years when counting figures", () => {
    expect(numbersIn("Joined in 2021 and shipped 3 releases")).toEqual(["3"]);
  });
  it("finds proper nouns but not sentence starts or common words", () => {
    expect(namesIn("Built dashboards for Jazz and Telenor. Managed the team.")).toEqual(["Jazz", "Telenor"]);
  });
});

const helped = "Helped the billing team with REST APIs in Node.js";

describe("fabrication guard (05 §7.4)", () => {
  const ev = [bullet];
  it("passes a faithful paraphrase", () => {
    expect(checkClaim({ text: "Built REST APIs in Node.js for the billing team, serving 1,200 daily users", evidence: ev, original: bullet }).action).toBe("PASS");
  });
  it("asks for an invented metric instead of showing it", () => {
    const r = checkClaim({ text: "Built REST APIs in Node.js that increased sales by 30%", evidence: ev, original: bullet });
    expect(r).toMatchObject({ action: "ASK", reason: "NEW_NUMBER", numbers: ["30%"] });
  });
  it("catches numbers written as words", () => {
    expect(checkClaim({ text: "Built REST APIs in Node.js used by twenty teams", evidence: ev, original: bullet }).action).toBe("ASK");
  });
  it("blocks a skill the job wants but the candidate never showed", () => {
    expect(checkClaim({ text: "Built REST APIs in Node.js and deployed them with Docker", evidence: ev, original: bullet })).toMatchObject({ action: "BLOCK", reason: "NEW_SKILL" });
  });
  it("blocks a swapped employer", () => {
    expect(checkClaim({ text: "Built REST APIs in Node.js at Systems Limited", evidence: ev, original: bullet })).toMatchObject({ action: "BLOCK", reason: "NEW_NAME" });
  });
  it("blocks an added year", () => {
    expect(checkClaim({ text: "Since 2019, built REST APIs in Node.js", evidence: ev, original: bullet })).toMatchObject({ action: "BLOCK", reason: "NEW_YEAR" });
  });
  it("asks before 'helped' becomes 'led'", () => {
    expect(checkClaim({ text: "Led the REST API work in Node.js for the billing team", evidence: [helped], original: helped })).toMatchObject({ action: "ASK", reason: "STRONGER_CLAIM" });
  });
  it("asks about new scope words", () => {
    expect(checkClaim({ text: "Built company-wide REST APIs in Node.js", evidence: ev, original: bullet })).toMatchObject({ action: "ASK", reason: "WIDER_SCOPE" });
  });
  it("allows a skill once the user has confirmed it as a fact", () => {
    const r = checkClaim({ text: "Built REST APIs in Node.js and containerized them with Docker", evidence: [bullet, "Used Docker in my final year project"], original: bullet });
    expect(r.action).toBe("PASS");
  });
  it("lets job-post names through only as context, never as candidate skills", () => {
    const ctx = ["Acme Corp is hiring a Backend Developer with Docker experience"];
    expect(checkClaim({ text: "I am applying for the Backend Developer role at Acme Corp", evidence: ev, context: ctx }).action).toBe("PASS");
    expect(checkClaim({ text: "I have used Docker extensively", evidence: ev, context: ctx })).toMatchObject({ action: "BLOCK", reason: "NEW_SKILL" });
  });
  it("blocks empty output", () => {
    expect(checkClaim({ text: "  ", evidence: ev }).action).toBe("BLOCK");
  });
});

describe("topic sentences (model answers, cover letters)", () => {
  const ev = ["Built APIs in Node.js and Express for the billing module at Example Soft"];
  const topic = ["Docker experience is required. How would you get up to speed with Docker and a Dockerfile?"];
  const t = (text: string) => checkTopicSentence({ text, evidence: ev, topic }).action;
  it("lets an honest gap answer talk about the skill", () => {
    expect(t("I haven't used Docker in a job yet, and I'd rather say that plainly.")).toBe("PASS");
    expect(t("I'd write a Dockerfile for the Node.js API and run it locally first.")).toBe("PASS");
    expect(t("What I do have is a solid base: I built APIs in Node.js and Express for the billing module.")).toBe("PASS");
  });
  it("still blocks any claim of having used it", () => {
    expect(t("I used Docker at Example Soft to deploy the billing API.")).toBe("BLOCK");
    expect(t("I would say I used Docker at Example Soft.")).toBe("BLOCK");
    expect(t("I'd mention that I deployed services with Kubernetes.")).toBe("BLOCK");
  });
});

describe("placeholders", () => {
  it("blanks only the new numbers and keeps years", () => {
    expect(blankNumbers("Cut load time by 40% in 2023 for 1,200 users", ["40%"])).toBe("Cut load time by [X]% in 2023 for 1,200 users");
  });
  it("lists unresolved placeholders", () => {
    expect(placeholdersIn("Dear [Hiring manager name], I cut costs by [X]%.")).toEqual(["[Hiring manager name]", "[X]"]);
  });
});
