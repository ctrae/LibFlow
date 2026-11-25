// Display helpers for the staff dashboard. The library runs on Jamaica time.

export const LIBRARY_TZ = "America/Jamaica";

/** Chart color: validated (lightness, chroma, contrast) against the white surface. */
export const CHART_COLOR = "#9B4531";

/** YYYY-MM-DD for a date in library time (what the report endpoints expect). */
export function libraryDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIBRARY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: LIBRARY_TZ,
    hour: "numeric",
    minute: "2-digit",
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

export function formatLongDate(d: Date = new Date()): string {
  return d
    .toLocaleDateString("en-US", {
      timeZone: LIBRARY_TZ,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

/** Older rows store "Main section"; the API now uses "Main". */
export function zoneLabel(zone: string | null | undefined): string {
  if (!zone) return "—";
  return zone === "Main section" ? "Main" : zone;
}

export function isMainZone(zone: string | null | undefined): boolean {
  return zone === "Main" || zone === "Main section";
}

/** Student IDs are shown partly masked, as on the bag-check page. */
export function maskId(studentId: string): string {
  return `••• ${studentId.slice(-4)}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
