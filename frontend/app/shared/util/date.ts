export function formatDate(dateString: string) {
  let parts = dateString.split("-");
  let hasDay = parts.length > 2;

  return new Date(`${dateString}Z`).toLocaleDateString("en-US", {
    day: hasDay ? "numeric" : undefined,
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const formatDateParam = (
  date: Date | string | undefined,
): string | undefined => {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
};

export const formatDate2 = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timeString?: string) => {
  if (!timeString) return "N/A";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};
export const formatTo12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};
