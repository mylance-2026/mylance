export type Tier = "basic" | "standard" | "premium";

export interface Package {
  tier: Tier;
  priceMinor: number;
  currency: string;
  deliveryDays: number;
  revisions: number;
  description: string;
  features: string[];
}
export interface Service {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  sellerUsername: string;
  sellerName: string;
  tags: string[];
  requirements: string;
  packages: Package[];
}
export interface Freelancer {
  username: string;
  name: string;
  headline: string;
  bio: string;
  country: string;
  skills: string[];
  languages: string[];
  level: string;
  available: boolean;
}
export interface Project {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  skills: string[];
  budgetType: "fixed" | "hourly";
  minMinor: number;
  maxMinor: number;
  currency: string;
  deadline?: string;
  status: string;
}
export type OrderStatus =
  | "pending_payment" | "payment_confirmed" | "in_progress" | "delivered"
  | "revision_requested" | "completed" | "cancelled" | "refunded" | "disputed";
export interface Order {
  id: string;
  title: string;
  counterpart: string;
  status: OrderStatus;
  baseMinor: number;
  clientFeeMinor: number;
  freelancerFeeMinor: number;
  currency: string;
  deadline?: string;
  events: { at: string; text: string }[];
}
