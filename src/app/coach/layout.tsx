import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/nav/top-bar";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { RoleViewSwitcher } from "@/components/nav/role-view-switcher";
import { coachNav } from "@/components/nav/nav-config";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("COACH", "ADMIN");
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        items={coachNav}
        headerExtra={isAdmin ? <RoleViewSwitcher /> : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          subtitle={isAdmin ? "Coach view" : "Team training snapshot"}
          user={{
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          }}
          actions={isAdmin ? <RoleViewSwitcher compact /> : undefined}
          canSwitchViews={isAdmin}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
        <BottomNav items={coachNav} />
      </div>
    </div>
  );
}
