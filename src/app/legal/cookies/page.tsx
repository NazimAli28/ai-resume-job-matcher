import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalDoc title="Cookie Policy" version="2026-11-04" updated="4 November 2026">
      <p>
        <strong>We use only essential cookies.</strong> There are no advertising, analytics or cross-site tracking cookies,
        no third-party cookies, and no session recording.
      </p>

      <h2>What we store in your browser</h2>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Cookies and browser storage">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Purpose</th>
              <th scope="col">How long</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>sb-…-auth-token</td>
              <td>Essential cookie</td>
              <td>Keeps you signed in</td>
              <td>Until you sign out; sessions end after 7 days idle or 30 days from sign-in</td>
            </tr>
            <tr>
              <td>sb-…-auth-token-code-verifier</td>
              <td>Essential cookie</td>
              <td>Protects the Google sign-in step</td>
              <td>Only during sign-in</td>
            </tr>
            <tr>
              <td>arw-theme, arw-accent</td>
              <td>Browser storage</td>
              <td>Remembers light or dark mode and your accent color</td>
              <td>Until you clear them</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>How we count usage</h2>
      <p>
        We count which features are used on our own servers, without a cookie or device identifier. You can turn this off
        in Settings under Privacy choices.
      </p>
    </LegalDoc>
  );
}
