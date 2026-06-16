import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/nav/top-bar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { athleteNav } from "@/components/nav/nav-config";

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ATHLETE");

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        title="Lovejoy XC Log"
        subtitle={`Welcome back, ${user.name.split(" ")[0]}`}
        user={{ name: user.name, role: user.role, avatarUrl: user.avatarUrl }}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">
        {children}
      </main>
      <BottomNav items={athleteNav} />
    </div>
  );
}
