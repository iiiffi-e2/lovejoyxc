import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getLinkedAthletes } from "@/lib/parent-access";
import { TopBar } from "@/components/nav/top-bar";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { parentNav } from "@/components/nav/nav-config";
import { ChildSwitcher } from "@/components/parent/child-switcher";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("PARENT");
  const linked = await getLinkedAthletes(user.id);

  return (
    <div className="flex min-h-dvh">
      <Sidebar items={parentNav} homeHref="/parent/dashboard" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          homeHref="/parent/dashboard"
          subtitle={
            linked.length === 1
              ? `Viewing ${linked[0]!.name.split(" ")[0]}'s log`
              : linked.length > 1
                ? "Parent view"
                : "Parent account"
          }
          user={{ name: user.name, role: user.role, avatarUrl: user.avatarUrl }}
          actions={
            linked.length > 1 ? (
              <Suspense fallback={null}>
                <ChildSwitcher linked={linked} />
              </Suspense>
            ) : null
          }
        />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
        <BottomNav items={parentNav} />
        <InstallPrompt />
      </div>
    </div>
  );
}
