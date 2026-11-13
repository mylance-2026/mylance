import type { Metadata } from "next";
import { RequireAuth } from "@/components/guards";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default function Onboarding() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <p className="mb-6 mt-2 text-sm text-muted">You can change any of this later in Settings.</p>
      <RequireAuth><ProfileForm onboarding /></RequireAuth>
    </div>
  );
}
