import { useEffect } from "react";

type Sentinel = { release: () => Promise<void> };
type WakeLockApi = { request: (type: "screen") => Promise<Sentinel> };

/** Hält den Bildschirm an, solange ein Timer läuft (iPhone sperrt sonst nach 30 s). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!active || !api) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      api
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release().catch(() => {});
          else sentinel = s;
        })
        .catch(() => {});
    };
    // Das System gibt die Sperre beim App-Wechsel frei – beim Zurückkommen neu anfordern.
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
