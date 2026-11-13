export interface LedgerEntry {
  account: string;
  debit: bigint;
  credit: bigint;
  currency: string;
}
/** Each journal must balance per currency; an entry is either a debit or a credit. */
export function assertBalanced(entries: LedgerEntry[]): void {
  const sums = new Map<string, bigint>();
  for (const e of entries) {
    if (e.debit < 0n || e.credit < 0n || (e.debit > 0n && e.credit > 0n) || (e.debit === 0n && e.credit === 0n))
      throw new Error("Invalid ledger entry");
    sums.set(e.currency, (sums.get(e.currency) ?? 0n) + e.debit - e.credit);
  }
  for (const [c, v] of sums) if (v !== 0n) throw new Error(`Unbalanced journal in ${c}`);
}
export function paymentJournal(base: bigint, clientFee: bigint, freelancerFee: bigint, currency: string): LedgerEntry[] {
  return [
    { account: "provider_clearing", debit: base + clientFee, credit: 0n, currency },
    { account: "platform_revenue", debit: 0n, credit: clientFee + freelancerFee, currency },
    { account: "freelancer_pending", debit: 0n, credit: base - freelancerFee, currency },
  ];
}
