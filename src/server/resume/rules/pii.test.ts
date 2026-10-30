import { describe, expect, it } from "vitest";
import { buildResumeDoc } from "../structure";
import { linesFrom, makeExtraction } from "../testing";
import { analyze } from "./index";
import { findCnics } from "./pii";

const run = (text: string, market: "PK_LOCAL" | "INTERNATIONAL" = "PK_LOCAL") => {
  const x = makeExtraction(linesFrom(text));
  return analyze(x, buildResumeDoc(x), { targetMarket: market, fileBytes: 1000 });
};

describe("findCnics", () => {
  it.each(["CNIC 35202-1234567-1", "35202 1234567 1", "CNIC: 3520212345671", "3520212345671"])("finds %s", (t) =>
    expect(findCnics(t)).toHaveLength(1),
  );

  it.each([
    "Phone 0300-1234567",
    "+92 300 1234567",
    "03001234567",
    "Account PK36SCBL0000001123456702",
    "https://example.com/35202-1234567-1",
    "Version 20240101",
  ])("does not treat %s as a CNIC", (t) => expect(findCnics(t)).toHaveLength(0));

  it("masks the number and never returns it in full", () => {
    const [hit] = findCnics("CNIC: 35202-1234567-1");
    expect(hit?.masked).toBe("CNIC 35202-•••••••-1");
    expect(hit?.confidence).toBe("HIGH");
    expect(findCnics("3520212345671")[0]?.confidence).toBe("MEDIUM");
    expect(findCnics("ID 3520212345671 (CNIC)")[0]?.confidence).toBe("HIGH");
  });
});

describe("PII findings", () => {
  const text = `Bilal Ahmed
bilal@example.com | 0300-1234567
CNIC: 35202-1234567-1
Father's Name: Ahmed Khan
Date of Birth: 12 May 1996
Religion: Islam
Marital Status: Single
Domicile: Punjab
House 12, Street 5, Lahore
Summary
Engineer.
References
Imran Ali, imran.ali@example.com, 0321-7654321`;

  it("reports ERR for CNIC with masked evidence only", () => {
    const a = run(text);
    const f = a.findings.find((x) => x.ruleId === "PII1");
    expect(f?.severity).toBe("ERR");
    expect(f?.evidence).toEqual(["CNIC 35202-•••••••-1"]);
    expect(JSON.stringify(a.findings)).not.toContain("1234567");
    expect(JSON.stringify(a.findings)).not.toContain("0321-7654321");
    expect(a.findings[0]?.severity).toBe("ERR");
  });

  it("severity depends on the target market", () => {
    const sev = (a: ReturnType<typeof run>, id: string) => a.findings.find((x) => x.ruleId === id)?.severity;
    const pk = run(text, "PK_LOCAL");
    const intl = run(text, "INTERNATIONAL");
    expect(sev(pk, "PII4")).toBe("TIP");
    expect(sev(intl, "PII4")).toBe("WARN");
    expect(sev(pk, "PII6")).toBe("WARN");
    for (const id of ["PII5", "PII7", "PII8", "PII9", "PII11"]) expect(sev(pk, id)).toBeDefined();
    expect(pk.findings.some((f) => f.ruleId === "PII10")).toBe(false);
    expect(intl.findings.some((f) => f.ruleId === "PII10")).toBe(true);
  });

  it("flags an IBAN as an ID/bank number but not as a CNIC", () => {
    const a = run("Bilal Ahmed\nIBAN PK36SCBL0000001123456702");
    expect(a.findings.some((f) => f.ruleId === "PII1")).toBe(false);
    expect(a.findings.find((f) => f.ruleId === "PII2")?.evidence?.[0]).not.toContain("1123456702");
  });
});
