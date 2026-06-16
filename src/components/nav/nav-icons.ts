"use client";

import {
  Bell,
  BarChart3,
  Building2,
  CalendarPlus,
  ClipboardList,
  Footprints,
  History,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  User,
  Users,
} from "lucide-react";
import type { NavIconKey } from "./nav-config";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  log: CalendarPlus,
  history: History,
  shoes: Footprints,
  profile: User,
  athletes: Users,
  logs: ClipboardList,
  reports: BarChart3,
  alerts: Bell,
  settings: Settings,
  people: Users,
  teams: Building2,
};
