import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <>
      <PageHeader title="Terms of Service" subtitle="Draft for legal review. Not final until approved by a qualified lawyer." />
      <Prose>
        <p><strong>Draft.</strong> This text describes how Mylance is designed to work. It has not been reviewed by legal counsel and must be reviewed and completed (company name, governing law, jurisdiction, contact address) before launch.</p>
        <h2>1. The service</h2>
        <p>Mylance is an online marketplace where clients hire freelancers through fixed-price services or posted projects. Mylance provides the platform; the contract for the work is between the client and the freelancer.</p>
        <h2>2. Accounts</h2>
        <ul>
          <li>You must provide accurate information and keep your credentials secure.</li>
          <li>You are responsible for activity on your account.</li>
          <li>We may suspend accounts that break these terms or the Community Guidelines.</li>
        </ul>
        <h2>3. Orders, fees and payments</h2>
        <ul>
          <li>The price, any client fee and the total are shown before you pay. Fees are recorded with each order and do not change after the order is placed.</li>
          <li>Freelancers see the platform fee deducted from their earnings before they accept work.</li>
          <li>Payments are processed by a third-party payment provider. Mylance does not store card details.</li>
        </ul>
        <h2>4. Delivery, revisions and completion</h2>
        <p>Freelancers deliver work through the order page. Clients may approve the delivery or request revisions up to the number included in the package. Approval completes the order and releases earnings to the freelancer&apos;s balance.</p>
        <h2>5. Cancellations, refunds and disputes</h2>
        <ul>
          <li>An unpaid order can be cancelled by the client at any time.</li>
          <li>On a paid order, either party can request cancellation. If you cannot agree, either party can open a dispute and Mylance staff will review it.</li>
          <li>Dispute outcomes may include completing the order, cancelling it or refunding the client.</li>
        </ul>
        <h2>6. Content and intellectual property</h2>
        <p>You keep ownership of what you create and upload. You give Mylance permission to display your profile, services and portfolio on the platform. Ownership of delivered work passes as agreed between client and freelancer.</p>
        <h2>7. Prohibited conduct</h2>
        <p>See the Community Guidelines. Taking payments outside the platform to avoid fees, fake reviews and illegal services are not allowed.</p>
        <h2>8. Liability</h2>
        <p>[To be completed by counsel: limitation of liability, warranty disclaimers, indemnity.]</p>
        <h2>9. Changes and contact</h2>
        <p>We may update these terms and will tell users about material changes. Contact details: [to be added].</p>
      </Prose>
    </>
  );
}
