import type { Metadata } from "next";
import { ForgotForm } from "@/components/reset-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Forgot() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">Enter your email and we will send a reset link.</p>
      <ForgotForm />
    </div>
  );
}
