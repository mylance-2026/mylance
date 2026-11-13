"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

/** Reads a URL query parameter on the client ("" during server rendering). */
export function useQueryParam(name: string): string {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(location.search).get(name) ?? "",
    () => "",
  );
}
