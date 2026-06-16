import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { SignupForm } from "./signup-form";
import { Logo } from "@/components/logo";

export default async function SignupPage() {
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
            Create your athlete account
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <SignupForm />
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
