/** Rates are basis points (400 = 4%). Rounding: half-up, integer only. */
export interface FeeRates {
  clientFeeBps: number;
  freelancerFeeBps: number;
}
export interface FeeBreakdown extends FeeRates {
  currency: string;
  baseAmount: bigint;
  clientFee: bigint;
  freelancerFee: bigint;
  clientTotal: bigint;
  freelancerNet: bigint;
  platformGross: bigint;
}

export function bpsOf(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error("Invalid bps");
  return (amount * BigInt(bps) + 5_000n) / 10_000n;
}

export function calculateFees(base: bigint, currency: string, rates: FeeRates): FeeBreakdown {
  if (base <= 0n) throw new Error("Amount must be positive");
  const clientFee = bpsOf(base, rates.clientFeeBps);
  const freelancerFee = bpsOf(base, rates.freelancerFeeBps);
  return {
    currency: currency.toUpperCase(),
    baseAmount: base,
    clientFee,
    freelancerFee,
    clientTotal: base + clientFee,
    freelancerNet: base - freelancerFee,
    platformGross: clientFee + freelancerFee,
    ...rates,
  };
}
