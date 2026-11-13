import { LayoutDashboard, ShoppingBag, FolderKanban, Package, MessageSquare, Bell, Settings, Wallet, Star, Heart, type LucideIcon } from "lucide-react";

export interface DashSection {
  slug: string;
  title: string;
  icon: LucideIcon;
  empty: { title: string; body: string; action?: { href: string; label: string } };
}

export const DASH: DashSection[] = [
  { slug: "", title: "Overview", icon: LayoutDashboard, empty: { title: "Nothing to show yet", body: "Your activity summary appears here once you have orders, projects or services.", action: { href: "/explore", label: "Explore services" } } },
  { slug: "orders", title: "Orders", icon: ShoppingBag, empty: { title: "No orders yet", body: "Orders you place or receive will be listed here with their status and deliveries.", action: { href: "/explore", label: "Find a service" } } },
  { slug: "projects", title: "Projects", icon: FolderKanban, empty: { title: "No projects yet", body: "Projects you publish, and the proposals you receive, appear here.", action: { href: "/projects/new", label: "Start a project" } } },
  { slug: "services", title: "My services", icon: Package, empty: { title: "No services yet", body: "Freelancers: create a service with Basic, Standard and Premium packages." } },
  { slug: "earnings", title: "Earnings", icon: Wallet, empty: { title: "No earnings yet", body: "Completed orders and payout requests appear here." } },
  { slug: "reviews", title: "Reviews", icon: Star, empty: { title: "No reviews yet", body: "You can review the other party once an order is completed." } },
  { slug: "favourites", title: "Favourites", icon: Heart, empty: { title: "No favourites yet", body: "Services you save appear here." } },
  { slug: "messages", title: "Messages", icon: MessageSquare, empty: { title: "No conversations", body: "Conversations with clients or freelancers appear here." } },
  { slug: "notifications", title: "Notifications", icon: Bell, empty: { title: "You're all caught up", body: "Updates about proposals, orders and payments will appear here." } },
  { slug: "settings", title: "Settings", icon: Settings, empty: { title: "Settings unavailable", body: "Profile and account settings need an account, which is not connected yet." } },
];
