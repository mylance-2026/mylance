import { ProfileForm } from "@/components/profile-form";

export default function Settings() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <ProfileForm />
    </>
  );
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
