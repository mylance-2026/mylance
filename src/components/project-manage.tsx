"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { acceptProposal, cancelProject, publishProject, setProposalStatus, startConversation } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { money } from "@/lib/format";
import { Loading } from "./guards";
import { StatusBadge } from "./cards";
import { useResult } from "./toast";

export function ProjectManage({ id }: { id: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  if (!ready) return <Loading />;
  const p = db.projects.find((x) => x.id === id && x.ownerId === user?.id);
  if (!p) notFound();
  const props = db.proposals.filter((x) => x.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const who = (uid: string) => db.users.find((u) => u.id === uid);
  const order = db.orders.find((o) => o.projectId === p.id);

  const msg = (uid: string) => { const r = startConversation(uid, p.title); if (toast(r)) router.push(`/dashboard/messages?c=${(r as { data: string }).data}`); };
  const accept = (pid: string) => { const r = acceptProposal(pid); if (toast(r, "Proposal accepted. Order created.")) router.push(`/dashboard/orders/${(r as { data: string }).data}`); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{p.title}</h1><StatusBadge status={p.status} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/projects/${p.id}`} className="btn-secondary">View public page</Link>
        {p.status === "draft" && <button className="btn-primary" onClick={() => toast(publishProject(p.id), "Project published.")}>Publish</button>}
        {["draft", "published"].includes(p.status) && <button className="btn-secondary" onClick={() => confirm("Cancel this project?") && toast(cancelProject(p.id), "Project cancelled.")}>Cancel project</button>}
        {order && <Link href={`/dashboard/orders/${order.id}`} className="btn-primary">Open order</Link>}
      </div>
      <h2 className="text-lg font-semibold">Proposals ({props.length})</h2>
      {props.length === 0 ? <p className="text-sm text-muted">No proposals yet.</p> : (
        <ul className="space-y-3">
          {props.map((x) => {
            const f = who(x.freelancerId);
            const active = ["submitted", "viewed", "shortlisted"].includes(x.status);
            return (
              <li key={x.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold"><Link className="hover:underline" href={`/freelancers/${f?.username}`}>{f?.name}</Link></p>
                  <div className="flex items-center gap-3 text-sm"><span>{money(x.priceMinor, x.currency)}</span><span className="text-muted">{x.days} days</span><StatusBadge status={x.status} /></div>
                </div>
                <p className="whitespace-pre-line text-sm text-muted">{x.cover}</p>
                <div className="flex flex-wrap gap-2">
                  {active && p.status === "published" && <button className="btn-primary" onClick={() => confirm(`Accept this proposal for ${money(x.priceMinor, x.currency)}? Other proposals will be declined.`) && accept(x.id)}>Accept</button>}
                  {active && x.status !== "shortlisted" && <button className="btn-secondary" onClick={() => toast(setProposalStatus(x.id, "shortlisted"), "Shortlisted.")}>Shortlist</button>}
                  {active && <button className="btn-secondary" onClick={() => toast(setProposalStatus(x.id, "rejected"), "Proposal rejected.")}>Reject</button>}
                  <button className="btn-secondary" onClick={() => msg(x.freelancerId)}>Message</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
