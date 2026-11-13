import { describe, expect, it } from "vitest";
import { calculateFees, bpsOf } from "./fees";
import { toMinorUnits, formatMinor } from "./money";
import { canTransition, assertTransition } from "./order-state";
import { canSubmitProposal, canAcceptProposal } from "./proposal";
import { assertBalanced, paymentJournal } from "./ledger";

describe("money", () => {
  it("parses by currency exponent", () => {
    expect(toMinorUnits("10.50", "INR")).toBe(1050n);
    expect(toMinorUnits("500", "JPY")).toBe(500n);
    expect(toMinorUnits("1.234", "KWD")).toBe(1234n);
    expect(() => toMinorUnits("1.5", "JPY")).toThrow();
    expect(() => toMinorUnits("-1", "USD")).toThrow();
  });
  it("formats", () => {
    expect(formatMinor(1050n, "inr")).toBe("10.50 INR");
    expect(formatMinor(5n, "USD")).toBe("0.05 USD");
  });
});

describe("fees", () => {
  const r = { clientFeeBps: 400, freelancerFeeBps: 400 };
  it("computes 4% + 4%", () => {
    const f = calculateFees(100_000n, "INR", r);
    expect(f.clientTotal).toBe(104_000n);
    expect(f.freelancerNet).toBe(96_000n);
    expect(f.platformGross).toBe(8_000n);
  });
  it("rounds half up with integers", () => {
    expect(bpsOf(1n, 5000)).toBe(1n);
    expect(bpsOf(1n, 4999)).toBe(0n);
  });
  it("rejects bad input", () => {
    expect(() => calculateFees(0n, "USD", r)).toThrow();
    expect(() => bpsOf(1n, 10_001)).toThrow();
  });
});

describe("order state", () => {
  it("allows legitimate and blocks illegal transitions", () => {
    expect(canTransition("pending_payment", "payment_confirmed", "system")).toBe(true);
    expect(canTransition("pending_payment", "payment_confirmed", "freelancer")).toBe(false);
    expect(canTransition("delivered", "completed", "freelancer")).toBe(false);
    expect(canTransition("completed", "in_progress", "admin")).toBe(false);
    expect(() => assertTransition("in_progress", "completed", "client")).toThrow();
  });
});

describe("proposals", () => {
  const base = { projectOwnerId: "o", projectStatus: "published" as const, freelancerId: "f", existingActiveProposal: false };
  it("enforces eligibility", () => {
    expect(canSubmitProposal(base).ok).toBe(true);
    expect(canSubmitProposal({ ...base, freelancerId: "o" }).reason).toBe("own_project");
    expect(canSubmitProposal({ ...base, existingActiveProposal: true }).reason).toBe("duplicate");
    expect(canSubmitProposal({ ...base, projectStatus: "draft" }).ok).toBe(false);
  });
  it("only the owner accepts an active proposal", () => {
    expect(canAcceptProposal("o", "o", "submitted")).toBe(true);
    expect(canAcceptProposal("x", "o", "submitted")).toBe(false);
    expect(canAcceptProposal("o", "o", "withdrawn")).toBe(false);
  });
});

describe("ledger", () => {
  it("balances the payment journal", () => {
    const f = calculateFees(100_001n, "USD", { clientFeeBps: 400, freelancerFeeBps: 400 });
    expect(() => assertBalanced(paymentJournal(f.baseAmount, f.clientFee, f.freelancerFee, "USD"))).not.toThrow();
  });
  it("rejects an unbalanced journal", () => {
    expect(() => assertBalanced([{ account: "a", debit: 5n, credit: 0n, currency: "USD" }])).toThrow();
  });
});
