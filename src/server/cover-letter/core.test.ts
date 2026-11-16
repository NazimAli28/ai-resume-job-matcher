import { describe, expect, it } from "vitest";
import { checkLetter, letterParagraphs } from "./core";

const evidence = [
  { id: "b1", text: "Built REST APIs in Node.js for the billing team, serving 1,200 daily users" },
  { id: "b2", text: "Wrote unit tests with Jest for payment code" },
];
const ctx = { evidence, post: "Acme is hiring a Backend Developer in Lahore to build payment services in Node.js.", notes: null, jobTitle: "Backend Developer", company: "Acme" };

describe("cover letter check (CVL-003/004)", () => {
  it("keeps grounded sentences and the role named in the post", () => {
    const r = checkLetter([{ text: "I'm applying for the Backend Developer role at Acme. I built REST APIs in Node.js for a billing team serving 1,200 daily users.", citeIds: ["b1"] }], ctx);
    expect(r.dropped).toBe(0);
    expect(r.paragraphs[0]).toContain("1,200 daily users");
  });
  it("drops invented company facts when no notes support them", () => {
    const r = checkLetter([{ text: "I admire Acme's recent Series B funding. I built REST APIs in Node.js.", citeIds: ["b1"] }], ctx);
    expect(r.paragraphs[0]).not.toMatch(/Series B|admire/);
    expect(r.dropped).toBe(1);
  });
  it("allows a company fact the user wrote in their notes", () => {
    const r = checkLetter([{ text: "I admire Acme's mission to make payments simple.", citeIds: [] }], { ...ctx, notes: "I admire their mission to make payments simple" });
    expect(r.dropped).toBe(0);
  });
  it("drops invented skills and employers, and blanks invented figures", () => {
    const r = checkLetter([{ text: "I deployed services with Kubernetes. At Systems Limited I led QA. My tests cut bugs by 40%.", citeIds: ["b2"] }], ctx);
    expect(r.paragraphs.join(" ")).not.toMatch(/Kubernetes|Systems Limited/);
    expect(r.paragraphs.join(" ")).toContain("[X]%");
    expect(r.dropped).toBe(2);
  });
  it("splits edited text back into paragraphs", () => {
    expect(letterParagraphs("One.\n\nTwo  lines\nhere.\n\n\nThree.")).toEqual(["One.", "Two lines here.", "Three."]);
  });
});
