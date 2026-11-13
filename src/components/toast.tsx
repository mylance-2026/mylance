"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Res } from "@/lib/demo/actions";

interface T { id: number; text: string; kind: "ok" | "err" }
const Ctx = createContext<(r: Res<unknown>, okMsg?: string) => boolean>(() => false);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const show = useCallback((r: Res<unknown>, okMsg?: string) => {
    if (r.ok && !okMsg) return true;
    const t: T = { id: Date.now() + Math.random(), text: r.ok ? okMsg! : r.error, kind: r.ok ? "ok" : "err" };
    setItems((x) => [...x, t]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4500);
    return r.ok;
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="card flex items-start gap-3 px-4 py-3 text-sm shadow-xl">
            {t.kind === "ok" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden /> : <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

/** Returns a function that toasts the result and tells you whether the action succeeded. */
export const useResult = () => useContext(Ctx);
