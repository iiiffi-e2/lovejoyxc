import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
            Lovejoy XC Log
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Private team running log · Lovejoy Leopards
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <DemoAccounts />
      </div>
    </main>
  );
}

function DemoAccounts() {
  const accounts = [
    { role: "Athlete", email: "maya@lovejoyxc.app" },
    { role: "Coach", email: "coach@lovejoyxc.app" },
    { role: "Admin", email: "admin@lovejoyxc.app" },
  ];
  return (
    <div className="mt-6 rounded-2xl border border-line bg-white/60 p-4">
      <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">
        Demo accounts
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-600">
        {accounts.map((a) => (
          <li key={a.email} className="flex justify-between gap-2">
            <span className="font-semibold text-ink">{a.role}</span>
            <span className="text-gray-500">{a.email}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-400">Password for all: leopards</p>
    </div>
  );
}
