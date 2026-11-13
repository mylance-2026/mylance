import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NewProjectForm } from "@/components/project-forms";

export const metadata: Metadata = { title: "Start a project", robots: { index: false } };

export default function NewProject() {
  return (
    <>
      <PageHeader title="Start a project" subtitle="Describe what you need and receive proposals from freelancers." />
      <div className="mx-auto max-w-2xl px-4 py-10"><NewProjectForm /></div>
    </>
  );
}
