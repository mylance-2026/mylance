import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <>
      <PageHeader title="Contact" subtitle="Questions about orders, accounts or the platform." />
      <div className="mx-auto max-w-xl px-4 py-10"><ContactForm /></div>
    </>
  );
}
