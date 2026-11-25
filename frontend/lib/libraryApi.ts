
import { supabase } from "./supabaseClient";

// Represents daily visit statistics.
export interface DailyVisitTotal {
  visit_date: string;
  total_visits: number;
  unique_students: number;
}

// Represents average stay statistics.
export interface AverageStayReport {
  avg_stay_minutes: number;
  completed_visits: number;
}

// Represents hourly occupancy statistics.
export interface HourlyOccupancyReport {
  hour_label: string;
  students_present: number;
  check_ins: number;
  check_outs: number;
}

// Gets the current number of active library sessions.
export async function getCurrentOccupancy(): Promise<number> {
  const { count, error } = await supabase
    .from("library_sessions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "active");

  if (error) {
    console.error("Error fetching daily visit totals:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return count ?? 0;
}

// Gets daily visit totals and unique students for a date range.
export async function getDailyVisitTotals(
  startDate: string,
  endDate: string
): Promise<DailyVisitTotal[]> {
  const { data, error } = await supabase.rpc("report_daily_totals", {
    p_start: startDate,
    p_end: endDate,
  });

  if (error) {
  console.error("Error fetching daily visit totals:", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  throw error;
}

  return (data ?? []) as DailyVisitTotal[];
}

// Gets the average stay duration and completed visits for a date range.
export async function getAverageStay(
  startDate: string,
  endDate: string
): Promise<AverageStayReport> {
  const { data, error } = await supabase.rpc("report_average_stay", {
    p_start: startDate,
    p_end: endDate,
  });

  if (error) {
    console.error("Error fetching average stay:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  const result = (data ?? [])[0] as AverageStayReport | undefined;

  return result ?? {
    avg_stay_minutes: 0,
    completed_visits: 0,
  };
}

// Gets hourly occupancy and check-ins for a selected date.
export async function getHourlyOccupancy(
  date: string
): Promise<HourlyOccupancyReport[]> {
  const { data, error } = await supabase.rpc("report_hourly_occupancy", {
    p_date: date,
  });

  if (error) {
    console.error("Error fetching hourly occupancy:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data ?? []) as HourlyOccupancyReport[];
}
