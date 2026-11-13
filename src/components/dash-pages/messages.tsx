"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Languages, MessageSquare, Paperclip, Send } from "lucide-react";
import { markConversationRead, sendMessage } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { useQueryParam } from "@/lib/use-query";
import { LANGUAGES, translateText, translationSupported } from "@/lib/translate";
import { Loading } from "@/components/guards";
import { useResult } from "@/components/toast";

type Tr = { text?: string; from?: string; same?: boolean; error?: string };
const inflight = new Set<string>(); // translations in progress (module level so renders never touch refs)
const pref = (k: string, d: string) => { try { return localStorage.getItem("mylance." + k) ?? d; } catch { return d; } };
const savePref = (k: string, v: string) => { try { localStorage.setItem("mylance." + k, v); } catch { /* storage blocked */ } };

async function runTranslation(id: string, text: string, target: string, done: (key: string, r: Tr) => void) {
  const key = `${id}:${target}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  let r: Tr;
  try {
    const t = await translateText(text, target);
    r = t.kind === "same" ? { same: true } : { text: t.text, from: t.from };
  } catch (e) {
    r = { error: e instanceof Error ? e.message : "Translation failed." };
  }
  inflight.delete(key);
  done(key, r);
}

export default function Messages() {
  const { db, user } = useSession();
  const toast = useResult();
  const urlC = useQueryParam("c");
  const [selIn, setSel] = useState<string | null | undefined>(undefined);
  const sel = selIn === undefined ? urlC || null : selIn;
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState(() => typeof window !== "undefined" && pref("autoTranslate", "0") === "1");
  const [target, setTarget] = useState(() => (typeof window !== "undefined" ? pref("translateTo", "en") : "en"));
  const [tr, setTr] = useState<Record<string, Tr>>({});
  const canTranslate = translationSupported();

  const mine = db.convs.filter((c) => c.a === user?.id || c.b === user?.id);
  const current = mine.find((c) => c.id === sel);
  const msgCount = current?.messages.length ?? 0;
  useEffect(() => { if (current) markConversationRead(current.id); }, [current?.id, msgCount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [current?.id, msgCount]);

  const translate = (id: string, text: string) => runTranslation(id, text, target, (key, r) => setTr((st) => ({ ...st, [key]: r })));
  useEffect(() => {
    if (!auto || !current || !canTranslate) return;
    for (const m of current.messages) if (m.from !== user?.id && !tr[`${m.id}:${target}`]) translate(m.id, m.text);
  }, [auto, target, current?.id, msgCount, tr, canTranslate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!db.ready || !user) return <Loading />;
  const other = (c: (typeof mine)[number]) => db.users.find((u) => u.id === (c.a === user.id ? c.b : c.a));
  const unread = (c: (typeof mine)[number]) => c.messages.filter((m) => m.from !== user.id && (!c.reads[user.id] || m.at > c.reads[user.id])).length;
  const last = (c: (typeof mine)[number]) => c.messages[c.messages.length - 1]?.at ?? "";
  const list = mine
    .filter((c) => !q || (other(c)?.name ?? "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => last(b).localeCompare(last(a)));

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (current && toast(sendMessage(current.id, text))) setText("");
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      <div className="card grid min-h-[30rem] md:grid-cols-[260px_1fr]">
        <aside aria-label="Conversations" className={`border-b border-line p-4 md:border-b-0 md:border-r ${current ? "hidden md:block" : ""}`}>
          <label htmlFor="cs" className="sr-only">Search conversations</label>
          <input id="cs" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="input" />
          {list.length === 0 ? <p className="mt-6 text-center text-sm text-muted">No conversations yet. Use “Contact seller” on a service or “Message” on an order.</p> : (
            <ul className="mt-4 space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setSel(c.id)} aria-current={c.id === sel} className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm ${c.id === sel ? "glossy-pill" : "hover:bg-elevated"}`}>
                    <span className="min-w-0"><span className="block truncate font-medium">{other(c)?.name}</span><span className="block truncate text-xs text-muted">{c.context}</span></span>
                    {unread(c) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold">{unread(c)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section aria-label="Conversation" className={`flex flex-col ${current ? "" : "hidden md:flex"}`}>
          {!current ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center"><MessageSquare className="text-accent" aria-hidden /><p className="font-medium">Select a conversation</p></div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div><p className="font-semibold">{other(current)?.name}</p><p className="text-xs text-muted">{current.context}</p></div>
                <button className="btn-secondary md:hidden" onClick={() => setSel(null)}>Back</button>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" checked={auto && canTranslate} disabled={!canTranslate} onChange={(e) => { setAuto(e.target.checked); savePref("autoTranslate", e.target.checked ? "1" : "0"); }} /><Languages size={14} aria-hidden /> Auto-translate incoming messages</label>
                <label className="flex items-center gap-2"><span className="sr-only">Translate into</span>to
                  <select value={target} onChange={(e) => { setTarget(e.target.value); savePref("translateTo", e.target.value); }} className="input w-auto py-1 text-xs">{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
                </label>
                {!canTranslate && <span className="text-muted">Translation needs a browser with built-in translation (e.g. recent Chrome). A translation service will be added with the backend.</span>}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "24rem" }}>
                {current.messages.length === 0 && <p className="text-center text-sm text-muted">Say hello to start the conversation.</p>}
                {current.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === user.id ? "justify-end" : ""}`}>
                    <div className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm ${m.from === user.id ? "bg-primary text-white" : "bg-elevated"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      {m.from !== user.id && (() => {
                        const t = tr[`${m.id}:${target}`];
                        if (t?.text) return <p className="mt-2 whitespace-pre-wrap break-words border-t border-line pt-2"><span className="block text-[10px] opacity-70">Translated from {t.from}</span>{t.text}</p>;
                        if (t?.same) return <p className="mt-1 text-[10px] opacity-70">Already in the selected language</p>;
                        if (t?.error) return <p className="mt-1 text-[10px] text-warning">{t.error}</p>;
                        return canTranslate && !auto ? <button type="button" className="mt-1 text-[10px] underline opacity-80" onClick={() => translate(m.id, m.text)}>Translate</button> : null;
                      })()}
                      <p className="mt-1 text-[10px] opacity-70">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
                <button type="button" disabled aria-label="Attach file (unavailable until file storage is connected)" title="File attachments need file storage, which is not connected yet" className="btn-secondary px-3"><Paperclip size={16} aria-hidden /></button>
                <label htmlFor="msg" className="sr-only">Message</label>
                <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write a message" className="input" autoComplete="off" />
                <button type="submit" className="btn-primary px-4" aria-label="Send"><Send size={16} /></button>
              </form>
            </>
          )}
        </section>
      </div>
      <p className="mt-3 text-xs text-muted">Updates appear in other tabs of this browser. File attachments (paperclip) and cross-device delivery arrive with the real backend. Translation runs on your device where the browser supports it.</p>
    </>
  );
}
