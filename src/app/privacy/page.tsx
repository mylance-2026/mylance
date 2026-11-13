import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <>
      <PageHeader title="Privacy Policy" subtitle="Draft for legal review. Not final until approved by a qualified lawyer." />
      <Prose>
        <p><strong>Draft.</strong> This describes the data Mylance is designed to handle. It has not been reviewed by legal counsel. The controller&apos;s legal name, address, retention periods and applicable laws (for example GDPR, UK GDPR, India&apos;s DPDP Act, CCPA) must be completed before launch.</p>
        <h2>Data we collect</h2>
        <ul>
          <li><strong>Account:</strong> name, email, username, country and your login credentials (stored hashed).</li>
          <li><strong>Profile:</strong> headline, biography, skills, languages and portfolio items you choose to publish.</li>
          <li><strong>Activity:</strong> orders, proposals, messages, reviews and support requests.</li>
          <li><strong>Payments:</strong> handled by our payment provider. We keep order amounts and payment status, not card numbers.</li>
        </ul>
        <h2>How we use it</h2>
        <p>To run the marketplace, process orders, prevent fraud and abuse, send service notifications and meet legal obligations. We do not sell personal data.</p>
        <h2>Who sees it</h2>
        <p>Public profile content is visible to everyone. Messages and order details are visible only to the people involved and to staff reviewing a dispute or report. Service providers (hosting, payments, email) process data on our behalf.</p>
        <h2>Your controls</h2>
        <ul>
          <li>Edit your profile and portfolio in Settings.</li>
          <li>Delete your account in Settings (blocked while you have active orders).</li>
          <li>Data export and requests under privacy law: [process to be added before launch].</li>
        </ul>
        <h2>Security and retention</h2>
        <p>Access is restricted by account and role. Financial records may be kept after account deletion where the law requires. [Retention periods to be added.]</p>
        <h2>Contact</h2>
        <p>[Privacy contact to be added.]</p>
      </Prose>
    </>
  );
}
