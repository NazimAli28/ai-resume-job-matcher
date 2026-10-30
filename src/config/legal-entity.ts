/**
 * Who operates the service, shown in the legal pages. FOUNDER TO CONFIRM before public launch
 * (tracked in knowledge-graph.md open questions). Never guess these.
 */
export const OPERATOR = {
  name: "Muhammad Nazim Ali", // legal name of the person operating the service (founder, 2026-10-31)
  country: "Pakistan",
  contactEmail: "", // a monitored inbox for privacy and legal requests
};

export const operatorName = () => OPERATOR.name || "the operator of AI Resume & Job Matcher";
export const contactEmail = () => OPERATOR.contactEmail || "the contact address listed on this page once published";
