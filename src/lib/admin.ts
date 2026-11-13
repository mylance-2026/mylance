import {
  LayoutDashboard, Users, Package, FolderKanban, ShoppingBag, CreditCard, Landmark, Gavel, BarChart3, Settings, ScrollText, type LucideIcon,
} from "lucide-react";

export interface AdminSection {
  slug: string;
  title: string;
  icon: LucideIcon;
  columns: string[];
  empty: string;
}

export const ADMIN: AdminSection[] = [
  { slug: "", title: "Overview", icon: LayoutDashboard, columns: [], empty: "" },
  { slug: "users", title: "Users", icon: Users, columns: ["Name", "Username", "Roles", "Status", "Joined"], empty: "No users yet." },
  { slug: "services", title: "Services", icon: Package, columns: ["Title", "Seller", "Status", "Moderation", "Created"], empty: "No services to moderate." },
  { slug: "projects", title: "Projects", icon: FolderKanban, columns: ["Title", "Owner", "Status", "Budget", "Created"], empty: "No projects yet." },
  { slug: "orders", title: "Orders", icon: ShoppingBag, columns: ["Order", "Client", "Freelancer", "Status", "Amount"], empty: "No orders yet." },
  { slug: "payments", title: "Payments", icon: CreditCard, columns: ["Payment", "Order", "Provider ref", "Status", "Amount"], empty: "No payments recorded." },
  { slug: "payouts", title: "Payouts", icon: Landmark, columns: ["Request", "Freelancer", "Status", "Amount", "Requested"], empty: "No payout requests." },
  { slug: "disputes", title: "Disputes", icon: Gavel, columns: ["Dispute", "Order", "Opened by", "Status", "Opened"], empty: "No disputes." },
  { slug: "reports", title: "Reports", icon: BarChart3, columns: ["Report", "Reporter", "Target", "Status", "Created"], empty: "No reports." },
  { slug: "audit-logs", title: "Audit logs", icon: ScrollText, columns: ["Time", "Actor", "Action", "Entity"], empty: "No audit entries." },
  { slug: "settings", title: "Settings", icon: Settings, columns: [], empty: "" },
];

export const METRICS = [
  "Registered users", "Active freelancers", "Published services", "Published projects",
  "Completed orders", "Open disputes", "Pending payout requests",
];
export const FINANCE = ["Gross transaction volume", "Platform fee revenue", "Refunds"];
