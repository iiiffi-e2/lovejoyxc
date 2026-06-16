import {
  Bell,
  CalendarPlus,
  FileText,
  Footprints,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ClipboardList,
  Users,
  User,
  History,
  BarChart3,
  Building2,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const athleteNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log Run", icon: CalendarPlus },
  { href: "/history", label: "History", icon: History },
  { href: "/shoes", label: "Shoes", icon: Footprints },
  { href: "/profile", label: "Profile", icon: User },
];

export const coachNav: NavItem[] = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach/athletes", label: "Athletes", icon: Users },
  { href: "/coach/logs", label: "Logs", icon: ClipboardList },
  { href: "/coach/reports", label: "Reports", icon: BarChart3 },
  { href: "/coach/alerts", label: "Alerts", icon: Bell },
  { href: "/coach/settings", label: "Settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Building2 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];
