/**
 * Who operates the service, shown in the legal pages. FOUNDER TO CONFIRM before public launch
 * (tracked in knowledge-graph.md open questions). Never guess these.
 */
export const OPERATOR = {
  name: "", // legal name of the person or company operating the service
  country: "Pakistan",
  contactEmail: "", // a monitored inbox for privacy and legal requests
};

export const operatorName = () => OPERATOR.name || "the operator of AI Resume & Job Matcher";
export const contactEmail = () => OPERATOR.contactEmail || "the contact address listed on this page once published";
