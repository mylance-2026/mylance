import Screen from "@/components/dash-pages/earnings";

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;

export default function Page() {
  return <Screen />;
}
