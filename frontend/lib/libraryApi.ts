import { supabase } from "./supabaseClient";

export async function getCurrentOccupancy(): Promise<number> {
  console.log("Starting occupancy request...");

  const { count, error } = await supabase
    .from("library_sessions")
    .select("session_id", {
      count: "exact",
      head: true,
    })
    .eq("session_status", "active");

  console.log(
    "Supabase occupancy response:",
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