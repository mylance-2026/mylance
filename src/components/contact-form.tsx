"use client";

import type { FormEvent } from "react";
import { sendContact } from "@/lib/demo/actions";
import { Field } from "./ui";
import { useResult } from "./toast";

export function ContactForm() {
  const toast = useResult();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (toast(sendContact(String(f.get("name")), String(f.get("email")), String(f.get("message"))), "Message received. We will reply by email.")) form.reset();
  };
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <Field id="name" label="Name"><input id="name" name="name" required className="input" autoComplete="name" /></Field>
      <Field id="email" label="Email"><input id="email" name="email" type="email" required className="input" autoComplete="email" /></Field>
      <Field id="msg" label="Message"><textarea id="msg" name="message" required minLength={10} rows={5} className="input" /></Field>
      <button type="submit" className="btn-primary w-full">Send message</button>
    </form>
  );
}
