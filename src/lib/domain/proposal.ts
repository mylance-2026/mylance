export interface ProposalCtx {
  projectOwnerId: string;
  projectStatus: "draft" | "published" | "in_progress" | "completed" | "cancelled";
  freelancerId: string;
  existingActiveProposal: boolean;
}
const ACTIVE = ["submitted", "viewed", "shortlisted"];
export function isActiveProposal(status: string) {
  return ACTIVE.includes(status);
}

export function canSubmitProposal(c: ProposalCtx): { ok: boolean; reason?: string } {
  if (c.freelancerId === c.projectOwnerId) return { ok: false, reason: "own_project" };
  if (c.projectStatus !== "published") return { ok: false, reason: "project_not_open" };
  if (c.existingActiveProposal) return { ok: false, reason: "duplicate" };
  return { ok: true };
}
export function canAcceptProposal(actorId: string, ownerId: string, status: string) {
  return actorId === ownerId && isActiveProposal(status);
}
