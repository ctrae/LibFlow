// Display helpers for the staff dashboard. The library runs on Jamaica time.

export const LIBRARY_TZ = "America/Jamaica";

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: LIBRARY_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: LIBRARY_TZ,
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: LIBRARY_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Older rows store "Main section"; the API now uses "Main". */
export function zoneLabel(zone: string | null | undefined): string {
  if (!zone) return "—";
  return zone === "Main section" ? "Main" : zone;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
