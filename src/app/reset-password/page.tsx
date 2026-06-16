import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { validatePasswordResetToken } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";
import { Logo } from "@/components/logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const { token } = await searchParams;
  const valid = token ? await validatePasswordResetToken(token) : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
            Lovejoy XC Log
          </h1>
          <p className="mt-1 text-sm text-gray-500">Set a new password</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          {!token || !valid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
                <AlertCircle className="h-4 w-4 shrink-0" />
                This reset link is invalid or has expired. Request a new one.
              </div>
              <p className="text-center text-sm text-gray-500">
                <a
                  href="/forgot-password"
                  className="font-semibold text-brand hover:underline"
                >
                  Request a new reset link
                </a>
              </p>
            </div>
          ) : (
            <ResetForm token={token} />
          )}
        </div>
      </div>
    </main>
  );
}
