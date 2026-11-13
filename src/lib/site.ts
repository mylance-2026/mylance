import {
  Code2, Palette, PenLine, Megaphone, Video, Music, Briefcase, LineChart, Languages, Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
}

// Taxonomy only (no marketplace data).
export const CATEGORIES: Category[] = [
  { slug: "development", name: "Development & IT", blurb: "Web, backend, DevOps and software engineering.", icon: Code2 },
  { slug: "design", name: "Design & Creative", blurb: "Brand identity, UI/UX, illustration and graphics.", icon: Palette },
  { slug: "writing", name: "Writing & Content", blurb: "Copywriting, editing, technical and long-form content.", icon: PenLine },
  { slug: "marketing", name: "Digital Marketing", blurb: "SEO, paid media, social and growth strategy.", icon: Megaphone },
  { slug: "video", name: "Video & Animation", blurb: "Editing, motion graphics and explainer videos.", icon: Video },
  { slug: "audio", name: "Music & Audio", blurb: "Voice-over, mixing, mastering and sound design.", icon: Music },
  { slug: "business", name: "Business & Admin", blurb: "Virtual assistance, consulting and operations.", icon: Briefcase },
  { slug: "data", name: "Data & Analytics", blurb: "Analysis, dashboards, machine learning and research.", icon: LineChart },
  { slug: "translation", name: "Translation", blurb: "Localization and translation across languages.", icon: Languages },
  { slug: "mobile", name: "Mobile Apps", blurb: "iOS, Android and cross-platform development.", icon: Smartphone },
];

export const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/projects", label: "Projects" },
  { href: "/freelancers", label: "Freelancers" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export const FOOTER = {
  Marketplace: [
    { href: "/explore", label: "Explore services" },
    { href: "/categories", label: "Categories" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/community-guidelines", label: "Community Guidelines" },
  ],
};
