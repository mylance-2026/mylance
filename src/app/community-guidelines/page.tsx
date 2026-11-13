import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function Guidelines() {
  return (
    <>
      <PageHeader title="Community Guidelines" subtitle="How we keep Mylance fair and safe for clients and freelancers." />
      <Prose>
        <h2>Be honest</h2>
        <p>Describe your skills, experience and services accurately. Do not post fake reviews, buy reviews or review your own work.</p>
        <h2>Keep deals on Mylance</h2>
        <p>Agree scope, price and delivery inside Mylance so both sides are protected by the order process. Asking someone to pay outside the platform to avoid fees is not allowed.</p>
        <h2>Respect others</h2>
        <p>Harassment, hate, discrimination, threats and spam are not allowed in messages, proposals or profiles.</p>
        <h2>Original and lawful work</h2>
        <ul>
          <li>Only offer work you have the right to deliver.</li>
          <li>No plagiarism, no illegal services, no academic cheating services.</li>
          <li>No malware, scams or attempts to collect other people&apos;s credentials.</li>
        </ul>
        <h2>Reporting and enforcement</h2>
        <p>Use the report button on a service or contact us about a problem. Staff may remove content, pause services, suspend accounts or refuse payouts for confirmed violations. Where possible we explain the decision.</p>
        <p><em>Staff review: these guidelines should be reviewed together with the Terms before launch.</em></p>
      </Prose>
    </>
  );
}
