import type { Metadata } from "next";
import { ResetForm } from "@/components/reset-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function Reset() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <ResetForm />
    </div>
  );
}
