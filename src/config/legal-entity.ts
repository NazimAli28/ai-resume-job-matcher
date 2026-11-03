import { PRODUCT_NAME } from "./brand";

/**
 * Who the legal pages name. The founder chose the product name over a personal name (2026-11-04);
 * a lawyer should confirm this before public launch (knowledge-graph.md).
 */
export const OPERATOR = {
  name: PRODUCT_NAME,
  country: "Pakistan",
  contactEmail: "", // a monitored inbox for privacy and legal requests; FOUNDER TO PROVIDE
};

/** Finishes a sentence such as "For any privacy question, ...". */
export const contactChannel = () => (OPERATOR.contactEmail ? `email ${OPERATOR.contactEmail}` : "use Report an issue in Settings");
