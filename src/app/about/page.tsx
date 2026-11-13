import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <>
      <PageHeader title="About Mylance" />
      <Prose>
        <p>Mylance makes it easier for businesses to discover skilled professionals, hire confidently, manage projects and pay through a transparent marketplace.</p>
        <h2>What we believe</h2>
        <ul>
          <li>Pricing and fees should be clear before anyone commits.</li>
          <li>Reviews should come only from real, completed work.</li>
          <li>Private project files and conversations should stay private.</li>
        </ul>
      </Prose>
    </>
  );
}
