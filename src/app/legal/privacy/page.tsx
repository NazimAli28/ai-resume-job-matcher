import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL } from "@/config/legal";
import { contactEmail, operatorName } from "@/config/legal-entity";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" version={LEGAL.privacy.split("@")[1]} updated="30 October 2026">
      <h2>The short version</h2>
      <ul>
        <li>We collect what you give us (your account, resumes, job posts, applications and interview answers) to run the features you use.</li>
        <li>When you use an AI feature, the relevant text is sent to our AI provider, Anthropic, with your email, phone number, address and links removed first. We never send your CNIC, date of birth, religion or father&apos;s name.</li>
        <li>We don&apos;t sell your data, show you ads, or give anything to employers or recruiters.</li>
        <li>We don&apos;t use your content to train AI models unless you opt in. That setting is off by default.</li>
        <li>You can export or delete your data yourself, any time, free.</li>
      </ul>

      <h2>Who we are</h2>
      <p>
        This service is operated by {operatorName()}. For any privacy question or request, contact {contactEmail()}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> email, name, and basic profile details from Google if you sign in with Google.</li>
        <li><strong>Your content:</strong> resumes and profile details, job descriptions, applications, notes and contacts you add, and your mock-interview answers and feedback.</li>
        <li><strong>Usage and security data:</strong> which features you use (counted on our own servers, without third-party analytics or session recording), error records with personal details removed, and a shortened version of your IP address for abuse prevention.</li>
        <li><strong>Cookies:</strong> only the essential ones that keep you signed in. No advertising or third-party tracking cookies.</li>
      </ul>

      <h2>Sensitive information</h2>
      <p>
        Resumes sometimes contain sensitive details such as health, religion or a photo. We ask for your explicit consent
        before your first upload, suggest removing details a recruiter doesn&apos;t need, and never try to infer such traits.
        A CNIC number should never be on a resume: we flag it and keep it out of AI processing.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide the service you asked for (contract).</li>
        <li>To keep the service secure, prevent abuse, and fix errors (legitimate interests).</li>
        <li>To send account emails such as confirmations and password resets (contract).</li>
        <li>To send product tips only if you ticked that box (consent, withdraw any time).</li>
        <li>To improve AI models with de-identified content only if you opt in separately (consent, off by default).</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the service providers that run the product, acting on our instructions:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and file storage, hosted in Singapore.</li>
        <li><strong>Vercel</strong>: hosting; our application servers run in Singapore and requests pass through Vercel&apos;s global network.</li>
        <li><strong>Anthropic</strong> (USA): AI processing of masked text for features you request. Anthropic does not use this data to train its models under its commercial terms and keeps it only for a limited period.</li>
        <li><strong>Resend</strong>: sending account emails.</li>
        <li><strong>GitHub</strong> (USA): stores our encrypted database backups; the encryption key is not held by GitHub.</li>
      </ul>
      <p>We share data with others only if the law requires it, or to protect people&apos;s safety and rights.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and content: until you delete them or your account.</li>
        <li>Inactive accounts: deleted after 24 months without a sign-in, after two warning emails.</li>
        <li>Raw interview answers: deleted 12 months after the interview; scores and summaries stay until you delete them.</li>
        <li>Deleted accounts: removed after a 7-day undo window, and from backups within 30 days after that.</li>
        <li>Security logs: 12 months. Error records: 90 days. Backups: 30 days.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can see, export, correct and delete your data, withdraw consent, and object to processing. Most of this is
        self-serve in Settings; anything else, email {contactEmail()} and we&apos;ll respond within 30 days. If you are in
        the EU or UK, you may also complain to your data protection authority.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Only our server can reach the database; browsers never query it
        directly. Personal details are masked before any AI step, and our team does not open your content unless you ask
        for support and grant time-limited access.
      </p>

      <h2>Children</h2>
      <p>The service is for people aged 16 or older. If we learn an account belongs to someone younger, we delete it.</p>

      <h2>Scores and automated processing</h2>
      <p>
        Fit and readability scores are estimates calculated by code from factors shown beside them. They are for you, not
        for an employer, and no decision about you is made from them.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll tell you by email and in the app before it applies.</p>
    </LegalDoc>
  );
}
