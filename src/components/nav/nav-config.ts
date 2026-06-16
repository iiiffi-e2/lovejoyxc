export type NavIconKey =
  | "dashboard"
  | "schedule"
  | "log"
  | "history"
  | "shoes"
  | "profile"
  | "athletes"
  | "logs"
  | "reports"
  | "alerts"
  | "settings"
  | "people"
  | "teams";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

export const athleteNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/schedule", label: "Schedule", icon: "schedule" },
  { href: "/log", label: "Log Run", icon: "log" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/shoes", label: "Shoes", icon: "shoes" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

export const coachNav: NavItem[] = [
  { href: "/coach", label: "Dashboard", icon: "dashboard" },
  { href: "/coach/schedule", label: "Schedule", icon: "schedule" },
  { href: "/coach/athletes", label: "Athletes", icon: "athletes" },
  { href: "/coach/logs", label: "Logs", icon: "logs" },
  { href: "/coach/reports", label: "Reports", icon: "reports" },
  { href: "/coach/alerts", label: "Alerts", icon: "alerts" },
  { href: "/coach/settings", label: "Settings", icon: "settings" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/schedule", label: "Schedule", icon: "schedule" },
  { href: "/admin/users", label: "People", icon: "people" },
  { href: "/admin/teams", label: "Teams", icon: "teams" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];
