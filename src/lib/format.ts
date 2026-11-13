import { formatMinor } from "./domain/money";

export const money = (minor: number, currency: string) => formatMinor(BigInt(minor), currency);
export const label = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
