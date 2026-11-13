"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { deleteAccount, updateProfile } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { Field } from "./ui";
import { Loading } from "./guards";
import { PortfolioEditor } from "./portfolio-editor";
import { UploadPicker } from "./upload-picker";
import { useResult } from "./toast";

const list = (s: FormDataEntryValue | null) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Shared by onboarding (compact) and settings. */
export function ProfileForm({ onboarding }: { onboarding?: boolean }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  if (!ready || !user) return <Loading />;

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const type = String(f.get("type") ?? "");
    const r = updateProfile({
      name: String(f.get("name")), username: String(f.get("username")), country: String(f.get("country")).toUpperCase().slice(0, 2),
      headline: String(f.get("headline")), bio: String(f.get("bio") ?? ""), timezone: String(f.get("timezone") ?? ""),
      level: String(f.get("level")), skills: list(f.get("skills")), languages: list(f.get("languages")),
      available: f.get("available") === "on" || onboarding === true,
      ...(onboarding ? { isClient: type !== "freelancer", isFreelancer: type !== "client" } : {}),
    });
    if (toast(r, onboarding ? "Profile saved." : "Changes saved.") && onboarding) router.push("/dashboard");
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="card space-y-4 p-6">
        {onboarding && (
          <fieldset>
            <legend className="label">I want to</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {([["client", "Hire talent"], ["freelancer", "Offer services"], ["both", "Both"]] as const).map(([v, t]) => (
                <label key={v} className="card flex cursor-pointer items-center gap-2 p-3 text-sm has-[:checked]:border-primary">
                  <input type="radio" name="type" value={v} defaultChecked={v === (user.isClient && user.isFreelancer ? "both" : user.isFreelancer ? "freelancer" : "client")} /> {t}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Display name"><input id="name" name="name" defaultValue={user.name} maxLength={80} required className="input" /></Field>
          <Field id="username" label="Username" hint="3–30 characters: a–z, 0–9, underscore."><input id="username" name="username" defaultValue={user.username} pattern="[a-z0-9_]{3,30}" required className="input" /></Field>
          <Field id="country" label="Country (2-letter code)"><input id="country" name="country" defaultValue={user.country} maxLength={2} className="input" /></Field>
          <Field id="level" label="Experience level"><select id="level" name="level" defaultValue={user.level} className="input"><option value="entry">Entry</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></Field>
        </div>
        <Field id="headline" label="Professional headline"><input id="headline" name="headline" defaultValue={user.headline} maxLength={120} className="input" /></Field>
        <Field id="skills" label="Skills" hint="Comma separated."><input id="skills" name="skills" defaultValue={user.skills.join(", ")} className="input" /></Field>
        {!onboarding && (
          <>
            <Field id="bio" label="Biography"><textarea id="bio" name="bio" rows={4} maxLength={2000} defaultValue={user.bio} className="input" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="languages" label="Languages" hint="Comma separated."><input id="languages" name="languages" defaultValue={user.languages.join(", ")} className="input" /></Field>
              <Field id="timezone" label="Time zone"><input id="timezone" name="timezone" defaultValue={user.timezone} placeholder="e.g. Asia/Kolkata" className="input" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="available" defaultChecked={user.available} /> Available for work</label>
          </>
        )}
      </section>
      {!onboarding && <section className="card p-6"><UploadPicker id="avatar" label="Profile photo" accept="image/png,image/jpeg,image/webp" hint="Square image, up to 2 MB." /></section>}
      {!onboarding && <PortfolioEditor />}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">{onboarding ? "Finish" : "Save changes"}</button>
        {onboarding && <button type="button" onClick={() => router.push("/dashboard")} className="btn-secondary">Do this later</button>}
      </div>
      {!onboarding && (
        <section className="card space-y-3 p-6">
          <h2 className="font-semibold">Account</h2>
          <p className="text-sm text-muted">Signed in as {user.email}</p>
          <button type="button" className="btn-secondary text-danger" onClick={() => {
            if (confirm("Delete your account? This cannot be undone.")) { if (toast(deleteAccount(), "Account deleted.")) router.push("/"); }
          }}>Delete account</button>
        </section>
      )}
    </form>
  );
}
