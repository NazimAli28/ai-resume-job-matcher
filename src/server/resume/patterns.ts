/**
 * Shared regexes. All global ones are meant to be used with String.matchAll / replace
 * (which never mutate lastIndex), not .test()/.exec().
 */

/** Modern CNIC: 5-7-1 digits, hyphens or spaces optional. Lookarounds avoid longer digit runs. */
export const CNIC_RE = /(?<![\d-])(\d{5})[-\s]?(\d{7})[-\s]?(\d)(?![\d-])/g;
export const CNIC_CONTEXT_RE = /\b(c\.?\s?n\.?\s?i\.?\s?c|n\.?i\.?c|id\s*card|identity\s*card)\b/i;
/** Old NIC (pre-2002): 3-2-6 digits; only flagged with context. */
export const OLD_NIC_RE = /(?<!\d)\d{3}-\d{2}-\d{6}(?!\d)/g;
export const PK_MOBILE_RE = /(?<!\d)(?:\+92|0092|0)[-\s]?3\d{2}[-\s]?\d{7}(?!\d)/g;
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
export const IBAN_PK_RE = /\bPK\d{2}[A-Z]{4}\d{16}\b/g;

/** Generic international phone candidate; callers filter by digit count and exclusions. */
export const PHONE_CANDIDATE_RE = /(?<![\w/])\+?\(?\d[\d\s().-]{7,17}\d(?![\w/])/g;

export const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s,;|)<>]+|\b(?:[a-z]{2,3}\.)?(?:linkedin\.com|github\.com)\/[^\s,;|)<>]+/gi;

/** Leading bullet glyph (with or without a space) or numbered-list marker. */
export const BULLET_PREFIX_RE = /^\s*(?:[•▪◦●■□·▸►➢➤✓✔❖◆◇★☆→»✦❯]\s*|[-–—*]\s+|\d{1,2}[.)]\s+)/;

/** R3 quantification: %, currency, magnitudes, counts with nouns. */
export const METRIC_RE = new RegExp(
  [
    String.raw`\d+(?:\.\d+)?\s?%`,
    String.raw`(?:PKR|Rs\.?|USD|EUR|GBP|AED|\$|£|€)\s?\d`,
    String.raw`\d[\d,.]*\s?(?:k|K|M|m|B|lakhs?|lacs?|crores?|million|billion|thousand)\b`,
    String.raw`\b\d[\d,]*\+?\s+(?:users?|customers?|clients?|people|members?|employees|engineers?|developers?|students?|teams?|projects?|products?|reports?|sales|leads?|orders?|requests?|accounts?|tickets?|pages?|hours?|days?|weeks?|months?|years?|countries|branches|stores?|vendors?|suppliers?|applications?|apps?|features?|campaigns?|articles?|videos?|visitors?|downloads?|installs?|transactions?|workshops?|sessions?|courses?|patients?|cases?|servers?|services?|endpoints?|tests?|modules?|releases?|deployments?|systems?|dashboards?|clients)\b`,
  ].join("|"),
);

export function hasMetric(text: string): boolean {
  return METRIC_RE.test(text);
}

/** Major Pakistani cities / regions used for location detection. */
export const PK_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot",
  "Gujranwala", "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur", "Larkana", "Mardan", "Gujrat",
  "Sahiwal", "Jhelum", "Wah Cantt", "Mirpur", "Muzaffarabad", "Gilgit", "Okara", "Rahim Yar Khan", "Dera Ghazi Khan",
  "Kasur", "Mingora", "Swat", "Nowshera", "Attock", "Chakwal", "Taxila", "Murree", "Jhang", "Sheikhupura",
];
export const PK_CITY_RE = new RegExp(`\\b(?:${PK_CITIES.join("|")})\\b`, "i");

export const COUNTRIES = [
  "Pakistan", "UAE", "United Arab Emirates", "Saudi Arabia", "KSA", "USA", "United States", "UK", "United Kingdom",
  "Canada", "Australia", "Germany", "Qatar", "Oman", "Kuwait", "Bahrain", "Singapore", "Malaysia", "Turkey",
];
export const COUNTRY_RE = new RegExp(`^(?:${COUNTRIES.join("|")})$`, "i");

/** Strip a string of control chars and collapse whitespace. */
export function squash(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** A segment that is only a place: "Lahore", "Lahore, Pakistan", "Remote". */
export const LOCATION_SEG_RE = new RegExp(
  String.raw`^(?:(?:${PK_CITIES.join("|")})(?:\s*,?\s*(?:${COUNTRIES.join("|")}|punjab|sindh|kpk|kp|balochistan))?|${COUNTRIES.join("|")}|remote|hybrid|on-?site)$`,
  "i",
);
