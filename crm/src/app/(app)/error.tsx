"use client";

import { TriangleAlert } from "lucide-react";
import { t } from "@/lib/i18n";

/** Shown when a screen fails to draw. The stored data is not affected by a display error. */
export default function ScreenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-7 text-center">
        <TriangleAlert className="mx-auto h-9 w-9 text-warn" aria-hidden />
        <h1 className="mt-4 text-xl font-bold text-white">{t("This screen could not be shown")}</h1>
        <p className="mt-2 text-sm text-ink-2">{t("Your saved data is not affected. Try again; if it keeps happening, reload the page and note what you were doing.")}</p>
        <p className="mt-3 break-words rounded-md border border-line bg-night/60 px-3 py-2 text-left text-xs text-mute">{error.message || "Unknown error"}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={reset}>{t("Try again")}</button>
          <button className="btn" onClick={() => window.location.reload()}>{t("Reload the page")}</button>
        </div>
      </div>
    </main>
  );
}
