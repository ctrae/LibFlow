import { supabase } from "./supabaseClient";

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