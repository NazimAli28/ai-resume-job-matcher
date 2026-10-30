import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL, MIN_AGE } from "@/config/legal";
import { contactEmail, operatorName } from "@/config/legal-entity";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" version={LEGAL.terms.split("@")[1]} updated="30 October 2026">
      <h2>1. The agreement</h2>
      <p>
        These terms are an agreement between you and {operatorName()} for using AI Resume &amp; Job Matcher. By creating an
        account you accept them and our <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2>2. Who can use it</h2>
      <p>You must be {MIN_AGE} or older and able to agree to these terms. One person per account; keep your password safe.</p>

      <h2>3. What the service does, and doesn&apos;t</h2>
      <ul>
        <li>It helps you check and improve your resume, compare it with a job, practice interviews and track applications.</li>
        <li>Scores are estimates to guide you. We don&apos;t promise interviews, job offers, or that any applicant tracking system will rank you a certain way.</li>
        <li>The interview coach is for practice only. Don&apos;t use it during a real interview or assessment.</li>
        <li>AI output can be wrong. Read every suggestion before you use it. You are responsible for what you send to employers.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You own your resumes and everything you add. You give us permission to store and process it only to run the
        service for you, as described in the Privacy Policy. Only upload information you have the right to use; don&apos;t
        upload someone else&apos;s resume without their permission.
      </p>

      <h2>5. Honest use</h2>
      <ul>
        <li>Don&apos;t use the service to invent experience, qualifications or references.</li>
        <li>Don&apos;t try to break, overload, scrape or reverse engineer the service, or get around its limits.</li>
        <li>Don&apos;t use it to screen or rank other people&apos;s applications.</li>
      </ul>
      <p>We may pause or close accounts that break these rules, and we&apos;ll tell you why unless the law prevents it.</p>

      <h2>6. Free beta</h2>
      <p>
        The service is free during the beta, with usage limits. Features can change while we build it. Paid plans will
        come later with their own clear terms, and we will never charge you without your explicit agreement.
      </p>

      <h2>7. Ending your account</h2>
      <p>You can delete your account at any time in Settings. We may end the service with reasonable notice so you can export your data.</p>

      <h2>8. Liability</h2>
      <p>
        We provide the service with care, but as it is and as available. To the extent the law allows, we are not
        responsible for indirect losses or for job-search outcomes. Nothing here limits rights you have under consumer law.
      </p>

      <h2>9. Changes and contact</h2>
      <p>
        If these terms change in a meaningful way we&apos;ll tell you before the change applies. Questions:{" "}
        {contactEmail()}.
      </p>
    </LegalDoc>
  );
}
