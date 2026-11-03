import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { contactEmail } from "@/config/legal-entity";

export const metadata: Metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUsePage() {
  return (
    <LegalDoc title="Acceptable Use Policy" version="2026-11-04" updated="4 November 2026">
      <p>This policy is part of our Terms. It keeps the product honest and safe for everyone using it.</p>

      <h2>Please don&apos;t use the service to</h2>
      <ul>
        <li><strong>Invent credentials:</strong> add degrees, employers, titles, dates, certifications, numbers or references that aren&apos;t true.</li>
        <li><strong>Impersonate anyone:</strong> build a resume in someone else&apos;s name, or use a false identity.</li>
        <li><strong>Cheat in real interviews:</strong> use the mock interviewer or its answers during a real interview or assessment. It&apos;s for practice only.</li>
        <li><strong>Upload other people&apos;s data without permission:</strong> for example a friend&apos;s resume, or more about a recruiter than you need.</li>
        <li><strong>Automate or resell it:</strong> bots, scripts, bulk access, reselling access or outputs, or using it as a general-purpose chatbot.</li>
        <li><strong>Get around limits:</strong> multiple accounts, disposable emails or shared accounts.</li>
        <li><strong>Attack the service:</strong> prompt injection, extracting prompts, probing other people&apos;s data, uploading malware, bypassing rate limits, or load testing without permission.</li>
        <li><strong>Post illegal or harmful content:</strong> hate, harassment, sexual content, discrimination, or anything that breaks the law in Pakistan or where you live.</li>
        <li><strong>Break our AI provider&apos;s rules:</strong> anything Anthropic&apos;s Usage Policy prohibits.</li>
      </ul>

      <h2>AI-assisted applications</h2>
      <p>Some employers don&apos;t allow AI-assisted material. Checking that, and everything you submit being true, is your responsibility.</p>

      <h2>What we may do</h2>
      <p>
        We may investigate, remove content, limit, pause or close accounts, and cooperate with lawful requests. A paused
        account can still download or delete its data, unless the law prevents it.
      </p>

      <h2>Reporting</h2>
      <p>To report abuse, use Report an issue in Settings or contact {contactEmail()}.</p>
    </LegalDoc>
  );
}
