"use client";

import { useEffect, useState } from "react";
import { Plus, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/team-logo";

const DISMISS_KEY = "lovejoyxc-install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobile(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore storage failures (private browsing, etc.).
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasDismissed() || !isMobile()) {
      return;
    }

    setIos(isIOS());

    if (isIOS()) {
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  function handleDismiss() {
    dismissPrompt();
    setVisible(false);
  }

  async function handleInstall() {
    if (!installEvent) return;

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);

    if (outcome === "dismissed") {
      dismissPrompt();
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 z-50 px-4 md:hidden animate-fade-in"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Install app"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <TeamLogo className="h-11 w-11 shrink-0" title="Lovejoy XC" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">Install Lovejoy XC</p>
            <p className="mt-1 text-sm text-gray-500">
              {ios
                ? "Add this app to your home screen for quick access to your training log."
                : "Install the app on your home screen for a faster, full-screen experience."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-surface hover:text-ink"
            aria-label="Dismiss install prompt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {ios ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-gray-600">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              Tap{" "}
              <span className="font-semibold text-ink">Share</span> in Safari, then{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                Add to Home Screen
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </span>
              .
            </span>
          </p>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" size="sm" onClick={handleInstall}>
              <Smartphone className="h-4 w-4" aria-hidden />
              Install app
            </Button>
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
