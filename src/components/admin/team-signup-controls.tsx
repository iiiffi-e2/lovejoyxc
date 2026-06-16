"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, KeyRound, ToggleLeft, ToggleRight } from "lucide-react";
import {
  toggleTeamSignup,
  generateTeamSignupCode,
  rotateTeamSignupCode,
  type AdminState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type Props = {
  id: string;
  signupEnabled: boolean;
  hasCode: boolean;
  signupCode?: string | null;
  signupCodeRotatedAt?: Date | string | null;
};

export function TeamSignupControls({
  id,
  signupEnabled,
  hasCode,
  signupCode,
  signupCodeRotatedAt,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [freshCode, setFreshCode] = useState<string | null>(null);

  const displayedCode = freshCode ?? signupCode ?? null;

  const run = (action: () => Promise<AdminState>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.generatedCode) {
        setFreshCode(result.generatedCode);
      }
    });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={signupEnabled ? "success" : "neutral"}>
          {signupEnabled ? "Signup open" : "Signup closed"}
        </Badge>
        {signupCodeRotatedAt ? (
          <span className="text-xs text-gray-400">
            Code rotated {formatDate(signupCodeRotatedAt)}
          </span>
        ) : null}
      </div>

      {signupEnabled && displayedCode ? (
        <InviteCodeBanner code={displayedCode} />
      ) : null}

      {error ? <p className="text-sm font-medium text-injury">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => toggleTeamSignup(id))}
        >
          {signupEnabled ? (
            <ToggleLeft className="h-4 w-4" />
          ) : (
            <ToggleRight className="h-4 w-4" />
          )}
          {signupEnabled ? "Close signup" : "Open signup"}
        </Button>

        {hasCode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => rotateTeamSignupCode(id))}
          >
            <RefreshCw className="h-4 w-4" />
            Rotate code
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => generateTeamSignupCode(id))}
          >
            <KeyRound className="h-4 w-4" />
            Generate code
          </Button>
        )}
      </div>
    </div>
  );
}

function InviteCodeBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-brand/20 bg-brand-light p-3">
      <p className="text-xs font-semibold text-brand">Invite code</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-ink">
          {code}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Share this code with athletes to sign up.
      </p>
    </div>
  );
}

export function GeneratedCodeDisplay({ code }: { code: string }) {
  return <InviteCodeBanner code={code} />;
}
