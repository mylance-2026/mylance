import { ServiceForm } from "@/components/service-form";

export default function NewService() {
  return <ServiceForm />;
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
