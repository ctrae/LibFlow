"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAverageStay, getDailyTotals, getHourlyOccupancy, saveDailyTotal } from "@/lib/api";
import { addDays, CHART_COLOR, errorMessage, libraryDate } from "./format";

const axisTick = { fontSize: 11, fill: "#8C7C6D" };

export default function Report() {
  const today = libraryDate();
  const [start, setStart] = useState(addDays(today, -6));
  const [end, setEnd] = useState(today);
  const [day, setDay] = useState(today);
  const [showTable, setShowTable] = useState(false);
  const validRange = start <= end;

  const dailyQuery = useQuery({
    queryKey: ["report", "daily", start, end],
    queryFn: () => getDailyTotals(start, end),
    enabled: validRange,
  });
  const stayQuery = useQuery({
    queryKey: ["report", "stay", start, end],
    queryFn: () => getAverageStay(start, end),
    enabled: validRange,
  });
  const hourlyQuery = useQuery({
    queryKey: ["report", "hourly", day],
    queryFn: () => getHourlyOccupancy(day),
  });

  const saveMutation = useMutation({ mutationFn: () => saveDailyTotal(day) });

  const daily = (dailyQuery.data ?? []).map((r) => ({
    ...r,
    label: new Date(`${r.visit_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  }));
  const totalVisits = daily.reduce((sum, r) => sum + r.total_visits, 0);
  const busiest = daily.reduce<(typeof daily)[number] | null>((top, r) => (!top || r.total_visits > top.total_visits ? r : top), null);
  const hourly = hourlyQuery.data ?? [];
  const peak = hourly.reduce<(typeof hourly)[number] | null>((top, r) => (!top || r.students_present > top.students_present ? r : top), null);
  const error = dailyQuery.error ?? stayQuery.error ?? hourlyQuery.error;

  return (
    <div className="space-y-6 text-[#2C221E]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Usage report</h1>
          <p className="text-[#7D6E62] text-[15px] mt-1">Visits, stay length and hourly occupancy</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DateField label="From" value={start} max={end} onChange={setStart} />
          <DateField label="To" value={end} min={start} max={today} onChange={setEnd} />
        </div>
      </div>

      {!validRange && <p role="alert" className="text-sm text-red-700">The start date must be on or before the end date.</p>}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage(error)}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile label="Total visits" value={dailyQuery.isLoading ? "…" : totalVisits.toLocaleString()} hint={`${start} to ${end}`} />
        <Tile
          label="Average stay"
          value={stayQuery.isLoading ? "…" : `${Number(stayQuery.data?.avg_stay_minutes ?? 0).toFixed(0)} min`}
          hint={`${stayQuery.data?.completed_visits ?? 0} completed visits`}
        />
        <Tile
          label="Busiest day"
          value={busiest && busiest.total_visits > 0 ? busiest.label : "—"}
          hint={busiest && busiest.total_visits > 0 ? `${busiest.total_visits} visits` : "No visits in range"}
        />
      </div>

      <section className="bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-base">Visits per day</h2>
            <p className="text-xs text-[#7D6E62] mt-0.5">All check-ins, by library-time date</p>
          </div>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-[#9B4531] hover:underline">
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>
        {showTable ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-[#8c6753]">
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Visits</th>
                <th className="py-2 text-right">Unique students</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((r) => (
                <tr key={r.visit_date} className="border-t border-[#EFE7DC]">
                  <td className="py-2">{r.visit_date}</td>
                  <td className="py-2 text-right tabular-nums">{r.total_visits}</td>
                  <td className="py-2 text-right tabular-nums">{r.unique_students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EFE7DC" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "#E3D7C7" }} />
                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#F5EFE6" }}
                  formatter={(value, _name, item) => [`${value} visits · ${item.payload.unique_students} unique`, item.payload.visit_date]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="total_visits" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-base">Students present by hour</h2>
            <p className="text-xs text-[#7D6E62] mt-0.5">
              Opening hours only{peak && peak.students_present > 0 ? ` · peak ${peak.students_present} at ${peak.hour_label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DateField label="Day" value={day} max={today} onChange={setDay} />
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-[40px] rounded-[4px] bg-[#9c5127] px-4 text-sm font-semibold text-white hover:bg-[#86441f] disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : "Save day's totals"}
            </button>
          </div>
        </div>
        {saveMutation.isSuccess && (
          <p role="status" className="mt-3 text-sm text-emerald-800">
            Saved {saveMutation.data.day}: {saveMutation.data.total_visits} visits, {saveMutation.data.unique_students} unique students.
          </p>
        )}
        {saveMutation.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {errorMessage(saveMutation.error)}
          </p>
        )}
        <div className="mt-4 h-[240px]">
          {hourly.length === 0 && !hourlyQuery.isLoading ? (
            <p className="pt-10 text-center text-sm text-[#8a92a6]">No opening hours on this day.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EFE7DC" />
                <XAxis dataKey="hour_label" tick={axisTick} tickLine={false} axisLine={{ stroke: "#E3D7C7" }} />
                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#F5EFE6" }}
                  formatter={(value, _name, item) => [
                    `${value} present · ${item.payload.check_ins} in · ${item.payload.check_outs} out`,
                    item.payload.hour_label,
                  ]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="students_present" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-[#7D6E62]">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#7D6E62]">{hint}</p>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-[#7D6E62]">
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-[40px] rounded-[4px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#2C221E]"
      />
    </label>
  );
}
