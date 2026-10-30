import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL } from "@/config/legal";

export const metadata: Metadata = { title: "How we use AI" };

export default function AiPage() {
  return (
    <LegalDoc title="How we use AI" version={LEGAL.aiDisclaimer.split("@")[1]} updated="30 October 2026">
      <h2>Code first, AI for language</h2>
      <p>
        Anything that is a number is calculated by our own code: parse health, readability, job match estimates and
        interview scores breakdowns. AI is used for language tasks: reading a job post, suggesting clearer wording,
        drafting a cover letter, and playing the interviewer.
      </p>

      <h2>It never invents your experience</h2>
      <p>
        Every suggestion must point to something in your resume or a fact you confirmed. If a job asks for a skill you
        don&apos;t list, we ask you about it; we never add it for you. Missing numbers stay as visible placeholders until
        you fill them in. Our own checker blocks new employers, dates, titles, numbers or skills that don&apos;t come from
        you.
      </p>

      <h2>What the AI receives</h2>
      <ul>
        <li>Only the text needed for the feature you asked for.</li>
        <li>Your email, phone number, address and personal links are replaced with placeholders first.</li>
        <li>Your CNIC, date of birth, religion and father&apos;s name are never sent.</li>
        <li>Our provider is Anthropic (Claude models). It does not train on this data under its commercial terms.</li>
      </ul>

      <h2>Limits</h2>
      <p>
        AI can be wrong or miss context. Treat every suggestion as a draft, check it, and only keep what is true. Scores
        are estimates, not predictions of whether you will be hired.
      </p>
    </LegalDoc>
  );
}
