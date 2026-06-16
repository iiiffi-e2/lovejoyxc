import type { Role } from "@prisma/client";

export function settingsPath(role: Role | string): string {
  switch (role) {
    case "ADMIN":
      return "/admin/settings";
    case "COACH":
      return "/coach/settings";
    default:
      return "/profile";
  }
}
