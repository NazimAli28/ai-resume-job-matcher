import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";
import { LEGAL } from "@/config/legal";
import { contactChannel, OPERATOR } from "@/config/legal-entity";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" version={LEGAL.privacy.split("@")[1]} updated="18 November 2026">
      <h2>The short version</h2>
      <ul>
        <li>We collect what you give us (your account, resumes, job posts, applications and interview answers) to run the features you use.</li>
        <li>When you use an AI feature, the relevant text is sent to our AI provider, Anthropic, with your email, phone number, address and links removed first. We never send your CNIC, date of birth, religion or father&apos;s name.</li>
        <li>We don&apos;t sell your data, show you ads, or give anything to employers or recruiters.</li>
        <li>We ask you once whether we may keep de-identified examples to test and improve our AI. Nothing is kept unless you say Yes, and you can switch it off any time, which deletes them. We don&apos;t train any AI model yet.</li>
        <li>You can export or delete your data yourself, any time, free.</li>
      </ul>

      <h2>Who we are</h2>
      <p>
        {OPERATOR.name} is run from {OPERATOR.country}. In this policy, &quot;we&quot; means {OPERATOR.name}. For any privacy
        question or request, {contactChannel()}.
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
        <li>To test and improve our AI with de-identified examples, only if you said Yes (consent, withdraw any time).</li>
      </ul>

      <h2 id="ai-improvement">Helping improve our AI (only if you say Yes)</h2>
      <p>
        When you sign up, or the next time you sign in, we ask whether we may keep examples to test and improve our AI.
        Neither answer is chosen for you. If you say No, nothing is kept. If you say Yes:
      </p>
      <ul>
        <li>
          <strong>What we keep:</strong> which AI task ran (for example reading a job post, resume suggestions, a cover
          letter or interview scoring), the version of our instructions and the AI model used, the text the AI was given
          and what it answered, and what you did with it: accepted, edited (with your edited version), rejected or left
          it, plus retries and scores where they apply.
        </li>
        <li>
          <strong>De-identified first:</strong> before anything is saved we remove names, email addresses, phone numbers,
          CNIC and other ID numbers, street addresses, links, and the names of the employers and schools on your resume.
          Your other details, such as skills and job titles, stay so the example is useful. De-identification lowers the
          risk but can&apos;t promise that no one could ever recognise an example, so leave things out of your resume you
          wouldn&apos;t want kept.
        </li>
        <li>
          <strong>Kept apart from your account:</strong> examples are stored in a separate table without your name, email
          or account ID. A one-way code lets us find and delete your examples, but not read them back to you as a person.
        </li>
        <li>
          <strong>How we use them:</strong> only to test and improve the quality of our own AI features. We don&apos;t
          train any AI model yet; if we start, we&apos;ll update this policy first. We don&apos;t sell or share examples, and
          they stay with our database provider in Singapore.
        </li>
        <li>
          <strong>Your control:</strong> switch it off any time in Settings and all your examples are deleted straight
          away. Deleting your account deletes them too. They are included in your data download.
        </li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the service providers that run the product, acting on our instructions:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in, file storage and account emails, hosted in Singapore.</li>
        <li><strong>Vercel</strong>: hosting; our application servers run in Singapore and requests pass through Vercel&apos;s global network.</li>
        <li><strong>Anthropic</strong> (USA): AI processing of masked text for features you request. Anthropic does not use this data to train its models under its commercial terms and keeps it only for a limited period.</li>      </ul>
      <p>We share data with others only if the law requires it, or to protect people&apos;s safety and rights.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and content: until you delete them or your account.</li>
        <li>Inactive accounts: deleted after 24 months without a sign-in, after two warning emails.</li>
        <li>Raw interview answers: deleted 12 months after the interview; scores and summaries stay until you delete them.</li>
        <li>Deleted accounts: removed after a 7-day undo window.</li>
        <li>AI-improvement examples (only if you said Yes): up to 2 years, or until you switch it off or delete your account.</li>
        <li>Security logs: 12 months. Error records: 90 days.</li>
        <li>Backups: we don&apos;t keep separate backups during the beta. If that changes, we&apos;ll update this policy first.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can see, export, correct and delete your data, withdraw consent, and object to processing. Most of this is
        self-serve in Settings; for anything else, {contactChannel()} and we&apos;ll respond within 30 days. If you are in
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
