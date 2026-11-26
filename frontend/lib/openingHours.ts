/** Library opening hours (local time), in minutes after midnight. Keep in
 * sync with library_open_time / library_close_time in backend config. */
export const OPEN_MINUTES = 8 * 60 + 30; // 08:30
export const CLOSE_MINUTES = 18 * 60; // 18:00

/** 510 -> "08:30", 1080 -> "18:00" (24-hour clock). */
export function formatClock(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 510 -> "8:30 AM", 1080 -> "6:00 PM" (12-hour clock). */
export function formatClock12(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const h = h24 % 12 || 12;
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m} ${h24 < 12 ? "AM" : "PM"}`;
}

/** "8:30 AM – 6:00 PM" */
export const OPENING_HOURS_LABEL = `${formatClock12(OPEN_MINUTES)} – ${formatClock12(CLOSE_MINUTES)}`;

/** Start and end (ms timestamps) of today's opening hours, local time. */
export function todayOpeningWindow() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return {
    start: day.getTime() + OPEN_MINUTES * 60_000,
    end: day.getTime() + CLOSE_MINUTES * 60_000,
  };
}

/** True if the timestamp falls within today's opening hours. */
export function isWithinTodayOpening(
  iso: string,
  window = todayOpeningWindow(),
) {
  const t = new Date(iso).getTime();
  return t >= window.start && t < window.end;
}

/** Start and end (ms timestamps) of today, local midnight to midnight. */
export function todayWindow() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(day.getDate() + 1);
  return { start: day.getTime(), end: next.getTime() };
}

/** True if the timestamp falls on today's date (local time). */
export function isToday(iso: string, window = todayWindow()) {
  const t = new Date(iso).getTime();
  return t >= window.start && t < window.end;
}

/** Sessions to list for today: checked in today (any time), or still
 * active (so staff can always see and check out anyone inside). */
export function isShownToday(
  session: { check_in: string; status: string },
  window = todayWindow(),
) {
  return session.status === "active" || isToday(session.check_in, window);
}
