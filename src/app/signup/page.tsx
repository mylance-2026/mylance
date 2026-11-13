import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default function Signup() {
  return <AuthForm mode="signup" />;
}
