import { describe, expect, it } from "vitest";
import { detectDateStyle, parseDateRange } from "./dates";

describe("parseDateRange", () => {
  const cases: [string, [number, number | undefined], [number, number | undefined] | "current", boolean][] = [
    ["Jan 2022 – Present", [2022, 1], "current", true],
    ["01/2022 - 03/2023", [2022, 1], [2023, 3], false],
    ["2019 – 2021", [2019, undefined], [2021, undefined], false],
    ["March 2020 to Till Date", [2020, 3], "current", true],
    ["Feb-2021 – Current", [2021, 2], "current", true],
    ["2020-2022", [2020, undefined], [2022, undefined], false],
    ["Sept 2018 – Aug 2019", [2018, 9], [2019, 8], false],
    ["June 2017 — To Date", [2017, 6], "current", true],
    ["Mar 2021 - Now", [2021, 3], "current", true],
    ["Software Engineer (Jan 2020 - Dec 2021)", [2020, 1], [2021, 12], false],
  ];
  it.each(cases)("%s", (text, start, end, isCurrent) => {
    const r = parseDateRange(text);
    expect(r).toBeDefined();
    expect([r?.start?.year, r?.start?.month]).toEqual(start);
    expect(r?.isCurrent).toBe(isCurrent);
    if (end === "current") expect(r?.end).toBeUndefined();
    else expect([r?.end?.year, r?.end?.month]).toEqual(end);
  });

  it("returns undefined for non-dates and lone years unless allowed", () => {
    expect(parseDateRange("Built 12 services in 2021")).toBeUndefined();
    expect(parseDateRange("CGPA 3.4/4.0")).toBeUndefined();
    expect(parseDateRange("Graduated 2021", { allowSingle: true })?.start?.year).toBe(2021);
  });

  it("detects date styles", () => {
    const style = (t: string) => detectDateStyle(parseDateRange(t)!);
    expect(style("Jan 2022 – Present")).toBe("MON_YYYY");
    expect(style("January 2022 – Present")).toBe("MONTH_YYYY");
    expect(style("01/2022 - 03/2023")).toBe("MM/YYYY");
    expect(style("2019 – 2021")).toBe("YYYY");
    expect(style("Feb-2021 – Current")).toBe("MON-YYYY");
  });
});
