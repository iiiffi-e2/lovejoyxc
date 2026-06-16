import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/nav/top-bar";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { adminNav } from "@/components/nav/nav-config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");

  return (
    <div className="flex min-h-dvh">
      <Sidebar items={adminNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          subtitle="Admin tools"
          user={{
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          }}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
        <BottomNav items={adminNav} />
      </div>
    </div>
  );
}
