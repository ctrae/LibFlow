
import { supabase } from "./supabaseClient";

// Represents the session information needed for usage reports.
export interface UsageReportSession {
  session_id: string;
  check_in_time: string;
  check_out_time: string | null;
  session_status: string;
}

export async function getCurrentOccupancy(): Promise<number> {
  console.log("1. Starting occupancy request...");

  const { count, error } = await supabase
    .from("library_sessions")
    .select("session_id", { count: "exact", head: true })
    .eq("session_status", "active");

  console.log(
    "2. Supabase responded:",
    JSON.stringify({ count, error }, null, 2)
  );

  if (error) {
    console.error(
      "Error fetching current occupancy:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  return count ?? 0;
}

// Fetches all library visits within the selected date range.
export async function getUsageReportSessions(
  startDate: string,
  endDate: string
): Promise<UsageReportSession[]> {
  // Convert the selected start date to local midnight.
  const start = new Date(`${startDate}T00:00:00`);

  // Convert the selected end date to the following midnight.
  // This ensures the entire end date is included.
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    throw new Error("Please select a valid date range.");
  }

  const { data, error } = await supabase
    .from("library_sessions")
    .select(
      "session_id, check_in_time, check_out_time, session_status"
    )
    .gte("check_in_time", start.toISOString())
    .lt("check_in_time", end.toISOString())
    .order("check_in_time", { ascending: true });

  if (error) {
    console.error("Error fetching usage report:", error);
    throw error;
  }

  return data ?? [];
}
