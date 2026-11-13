/** All amounts are integers in minor units. No floats in authoritative math. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "UGX"]);
const THREE_DECIMAL = new Set(["BHD", "KWD", "OMR", "JOD", "TND"]);

export function minorUnitExponent(currency: string): number {
  const c = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) throw new Error(`Invalid currency: ${currency}`);
  return ZERO_DECIMAL.has(c) ? 0 : THREE_DECIMAL.has(c) ? 3 : 2;
}

export function toMinorUnits(major: string, currency: string): bigint {
  const exp = minorUnitExponent(currency);
  const m = /^(\d+)(?:\.(\d+))?$/.exec(major.trim());
  if (!m) throw new Error("Invalid amount");
  const frac = m[2] ?? "";
  if (frac.length > exp) throw new Error("Too many decimal places");
  return BigInt(m[1] + frac.padEnd(exp, "0"));
}

export function formatMinor(minor: bigint, currency: string): string {
  const exp = minorUnitExponent(currency);
  const neg = minor < 0n;
  const s = (neg ? -minor : minor).toString().padStart(exp + 1, "0");
  const body = exp ? `${s.slice(0, -exp)}.${s.slice(-exp)}` : s;
  return `${neg ? "-" : ""}${body} ${currency.toUpperCase()}`;
}
