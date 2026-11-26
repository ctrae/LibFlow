"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "../shared/components/AdminShell";
import {
  getAverageStay,
  getCurrentOccupancy,
  getDailyVisitTotals,
  getHourlyOccupancy,
  getTotalCheckouts,
  type AverageStayReport,
  type DailyVisitTotal,
  type HourlyOccupancyReport,
} from "../../lib/libraryApi";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
type ReportingPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual"
  | "custom";

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextDateString(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getDateRange(period: ReportingPeriod) {
  const today = new Date();
  const end = getDateString(today);
  const startDate = new Date(today);

  switch (period) {
    case "daily":
      break;
    case "weekly":
      startDate.setDate(today.getDate() - 6);
      break;
    case "monthly":
      startDate.setDate(1);
      break;
    case "quarterly":
      startDate.setMonth(Math.floor(today.getMonth() / 3) * 3, 1);
      break;
    case "semi-annual":
      startDate.setMonth(today.getMonth() < 6 ? 0 : 6, 1);
      break;
    case "annual":
      startDate.setMonth(0, 1);
      break;
    case "custom":
      break;
  }

  return {
    startDate: getDateString(startDate),
    endDate: end,
  };
}


function getGroupedChartData(
  period: ReportingPeriod,
  dailyTotals: DailyVisitTotal[]
) {

  if (period === "weekly") {
    const weekdays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const grouped = weekdays.map((day) => ({
      label: day,
      totalVisits: 0,
    }));

    dailyTotals.forEach((day) => {
      const date = new Date(`${day.visit_date}T00:00:00Z`);
      const weekdayIndex = (date.getUTCDay() + 6) % 7;

      grouped[weekdayIndex].totalVisits += Number(day.total_visits);
    });

    return grouped;
  }


  if (period === "monthly") {
    const grouped = new Map<
      number,
      { label: string; totalVisits: number; startDay: number; endDay: number }
    >();

    if (dailyTotals.length === 0) return [];

    const [year, month] = dailyTotals[0].visit_date.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const firstWeekday = (firstDay.getUTCDay() + 6) % 7;

    dailyTotals.forEach((day) => {
      const date = new Date(`${day.visit_date}T00:00:00Z`);
      const dayNumber = date.getUTCDate();
      const weekNumber = Math.ceil((dayNumber + firstWeekday) / 7);

      if (!grouped.has(weekNumber)) {
        grouped.set(weekNumber, {
          label: "",
          totalVisits: 0,
          startDay: dayNumber,
          endDay: dayNumber,
        });
      }

      const entry = grouped.get(weekNumber)!;
      entry.totalVisits += Number(day.total_visits);
      entry.endDay = dayNumber;

      const monthLabel = date.toLocaleString("en", {
        month: "short",
        timeZone: "UTC",
      });

      entry.label = `${monthLabel} ${entry.startDay}–${entry.endDay}`;
    });

    return Array.from(grouped.values());
  }


  if (period === "custom") {
    if (dailyTotals.length === 0) return [];

    const firstDate = new Date(`${dailyTotals[0].visit_date}T00:00:00Z`);
    const lastDate = new Date(
      `${dailyTotals[dailyTotals.length - 1].visit_date}T00:00:00Z`
    );

    const daysInRange =
      Math.round(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;


if (daysInRange <= 7) {
      return dailyTotals.map((day) => ({
        label: day.visit_date,
        totalVisits: Number(day.total_visits),
      }));
    }

if (daysInRange <= 31) {
      const grouped = new Map<
        string,
        { startDate: string; endDate: string; totalVisits: number }
      >();

      dailyTotals.forEach((day) => {
        const date = new Date(`${day.visit_date}T00:00:00Z`);
        const weekdayIndex = (date.getUTCDay() + 6) % 7;
        const monday = new Date(date);

        monday.setUTCDate(date.getUTCDate() - weekdayIndex);

        const key = monday.toISOString().slice(0, 10);

        if (!grouped.has(key)) {
          grouped.set(key, {
            startDate: day.visit_date,
            endDate: day.visit_date,
            totalVisits: 0,
          });
        }

        const entry = grouped.get(key)!;
        entry.endDate = day.visit_date;
        entry.totalVisits += Number(day.total_visits);
      });

      return Array.from(grouped.values()).map((week) => ({
        label: `${week.startDate} – ${week.endDate}`,
        totalVisits: week.totalVisits,
      }));
    }

    const grouped = new Map<string, { label: string; totalVisits: number }>();

    dailyTotals.forEach((day) => {
      const [year, month] = day.visit_date.split("-");
      const key = `${year}-${month}`;

      if (!grouped.has(key)) {
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

        grouped.set(key, {
          label: date.toLocaleString("en", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
          totalVisits: 0,
        });
      }

      grouped.get(key)!.totalVisits += Number(day.total_visits);
    });

    return Array.from(grouped.values());
  }


  const grouped = new Map<string, { label: string; totalVisits: number }>();

  dailyTotals.forEach((day) => {
    const [year, month] = day.visit_date.split("-");
    const key = `${year}-${month}`;

    if (!grouped.has(key)) {
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

      grouped.set(key, {
        label: date.toLocaleString("en", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        totalVisits: 0,
      });
    }

    grouped.get(key)!.totalVisits += Number(day.total_visits);
  });

  return Array.from(grouped.values());
}


function getVisitTableData(
  period: ReportingPeriod,
  dailyTotals: DailyVisitTotal[]
) {
  const getTotal = (visits: DailyVisitTotal[]) =>
    visits.reduce((sum, day) => sum + Number(day.total_visits), 0);

  if (period === "daily") {
    return [{ label: "Daily Total", totalVisits: getTotal(dailyTotals) }];
  }

  if (period === "weekly") {
    return [{ label: "Weekly Total", totalVisits: getTotal(dailyTotals) }];
  }

  if (period === "monthly") {
    return [{ label: "Monthly Total", totalVisits: getTotal(dailyTotals) }];
  }

  if (period === "custom") {
    if (dailyTotals.length === 0) return [];

    const firstDate = new Date(`${dailyTotals[0].visit_date}T00:00:00Z`);
    const lastDate = new Date(
      `${dailyTotals[dailyTotals.length - 1].visit_date}T00:00:00Z`
    );

    const daysInRange =
      Math.round(
        (lastDate.getTime() - firstDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

if (daysInRange <= 7) {
      return dailyTotals.map((day) => ({
        label: day.visit_date,
        totalVisits: Number(day.total_visits),
      }));
    }

if (daysInRange <= 31) {
      const grouped = new Map<
        string,
        { startDate: string; endDate: string; totalVisits: number }
      >();

      dailyTotals.forEach((day) => {
        const date = new Date(`${day.visit_date}T00:00:00Z`);
        const weekdayIndex = (date.getUTCDay() + 6) % 7;
        const monday = new Date(date);

        monday.setUTCDate(date.getUTCDate() - weekdayIndex);

        const key = monday.toISOString().slice(0, 10);

        if (!grouped.has(key)) {
          grouped.set(key, {
            startDate: day.visit_date,
            endDate: day.visit_date,
            totalVisits: 0,
          });
        }

        const entry = grouped.get(key)!;
        entry.endDate = day.visit_date;
        entry.totalVisits += Number(day.total_visits);
      });

      return Array.from(grouped.values()).map((week) => ({
        label: `${week.startDate} – ${week.endDate}`,
        totalVisits: week.totalVisits,
      }));
    }

    const grouped = new Map<
      string,
      { label: string; totalVisits: number }
    >();

    dailyTotals.forEach((day) => {
      const [year, month] = day.visit_date.split("-");
      const key = `${year}-${month}`;

      if (!grouped.has(key)) {
        const date = new Date(
          Date.UTC(Number(year), Number(month) - 1, 1)
        );

        grouped.set(key, {
          label: date.toLocaleString("en", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }),
          totalVisits: 0,
        });
      }

      grouped.get(key)!.totalVisits += Number(day.total_visits);
    });

    return Array.from(grouped.values());
  }

  const grouped = new Map<
    string,
    { label: string; totalVisits: number }
  >();

  dailyTotals.forEach((day) => {
    const [year, month] = day.visit_date.split("-");
    const key = `${year}-${month}`;

    if (!grouped.has(key)) {
      const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, 1)
      );

      grouped.set(key, {
        label: date.toLocaleString("en", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
        totalVisits: 0,
      });
    }

    grouped.get(key)!.totalVisits += Number(day.total_visits);
  });

  return Array.from(grouped.values());
}


function AnalyticsContent() {

  const [period, setPeriod] = useState<ReportingPeriod>("daily");
  // Reports open on today. AdminShell has already confirmed staff access.
  const [today] = useState(() => getDateString(new Date()));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalCheckouts, setTotalCheckouts] = useState(0);
  const [averageStay, setAverageStay] =
    useState<AverageStayReport | null>(null);
  const [dailyTotals, setDailyTotals] = useState<DailyVisitTotal[]>([]);
  const [hourlyOccupancy, setHourlyOccupancy] = useState<
  HourlyOccupancyReport[]
  >([]);
 const hourlyChartData = hourlyOccupancy.map((hour) => ({
  hour: hour.hour_label,
  studentsPresent: Number(hour.students_present),
  checkIns: Number(hour.check_ins),
  checkOuts: Number(hour.check_outs),
}));
const hasHourlyActivity = hourlyChartData.some(
  (hour) =>
    hour.studentsPresent > 0 ||
    hour.checkIns > 0 ||
    hour.checkOuts > 0
);

const groupedChartData = getGroupedChartData(period, dailyTotals);
const visitTableData = getVisitTableData(period, dailyTotals);
const isSingleDayReport =
  Boolean(startDate && endDate && startDate === endDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");



const generateReport = useCallback(async () => {
  if (!startDate || !endDate) {
    setError("Please select both a start date and an end date.");
    return;
  }

  if (startDate > endDate) {
    setError("The start date cannot be after the end date.");
    return;
  }

  if (today && (startDate > today || endDate > today)) {
  setError("Future dates cannot be selected for reports.");
  return;
}

  setLoading(true);
  setError("");

  try {
    const [
      occupancyResult,
      dailyResult,
      averageResult,
      hourlyResult,
      checkoutResult,
    ] = await Promise.all([
      getCurrentOccupancy(),
      getDailyVisitTotals(startDate, endDate),
      getAverageStay(startDate, endDate),
      getHourlyOccupancy(startDate),
     getTotalCheckouts(startDate, endDate),
    ]);

    setOccupancy(occupancyResult);
    setDailyTotals(dailyResult);
    setTotalVisits(
      dailyResult.reduce(
        (sum, day) => sum + Number(day.total_visits),
        0
      )
    );
    setTotalCheckouts(checkoutResult);
    setAverageStay(averageResult);
    setHourlyOccupancy(hourlyResult);
  } catch (reportError) {
    console.error("Error generating usage report:", reportError);
    setError("Unable to generate the report. Please try again.");
  } finally {
    setLoading(false);
  }
}, [startDate, endDate, today]);


 useEffect(() => {
  // Load the report on open and whenever the dates change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  generateReport();
}, [generateReport]);

  function handlePeriodChange(value: ReportingPeriod) {
    setPeriod(value);

    if (value !== "custom") {
      const range = getDateRange(value);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  }



  return (
    <div className="text-gray-900">
      <div className="mx-auto max-w-7xl space-y-8">
       <header className="flex flex-wrap items-start justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold">Usage Analytics</h1>
    <p className="mt-2 text-gray-600">
      View library visits, check-outs and usage statistics.
    </p>
  </div>

</header>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Reporting Period</h2>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
                ["quarterly", "Quarterly"],
                ["semi-annual", "Semi-annual"],
                ["annual", "Annual"],
                ["custom", "Custom Date Range"],
              ] as [ReportingPeriod, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handlePeriodChange(value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  period === value
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Start Date
              <input
  type="date"
  value={startDate}
  max={today}
  onChange={(event) => {
    setStartDate(event.target.value);
    setPeriod("custom");
  }}
  className="rounded-lg border border-gray-300 p-2"
/>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              End Date
              <input
  type="date"
  value={endDate}
  max={today}
  onChange={(event) => {
    setEndDate(event.target.value);
    setPeriod("custom");
  }}
  className="rounded-lg border border-gray-300 p-2"
/>
            </label>
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="mt-5 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Report Summary</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Current Occupancy",
                value: occupancy === null ? "Loading..." : occupancy,
              },
              { label: "Total Visits", value: totalVisits },
              { label: "Total Check-outs", value: totalCheckouts },
              {
                label: "Average Stay",
                value: averageStay
                  ? averageStay.completed_visits > 0
                    ? `${averageStay.avg_stay_minutes} minutes`
                    : "No completed visits"
                  : "Loading...",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

<section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold">
  {isSingleDayReport ? "Hourly Library Activity" : "Library Activity"}
</h2>
<p className="mt-1 text-sm text-gray-500">
  {isSingleDayReport
    ? "Student occupancy, check-ins and check-outs throughout the library's operating hours."
    : "Total library visits for the selected reporting period."}
</p>

{isSingleDayReport ? (
  !hasHourlyActivity ? (
    <p className="mt-4 text-gray-500">
     No activity recorded during library operating hours for this date.
    </p>
  ) : (
   <div className="mt-6 h-[26rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
       <ComposedChart
  data={hourlyChartData}
  margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="hour" />
  <YAxis allowDecimals={false} />
  <Tooltip />
  <Legend />

  <Bar
    dataKey="checkIns"
    name="Check-ins"
    fill="#3b82f6"
    radius={[4, 4, 0, 0]}
  />

  <Bar
    dataKey="checkOuts"
    name="Check-outs"
    fill="#f97316"
    radius={[4, 4, 0, 0]}
  />

  <Line
    type="monotone"
    dataKey="studentsPresent"
    name="Students Present"
    stroke="#16a34a"
    strokeWidth={3}
    dot={false}
  />
</ComposedChart>
      </ResponsiveContainer>
    </div>
  )
) : groupedChartData.length === 0 ? (
  <p className="mt-4 text-gray-500">
    No visit activity data available.
  </p>
) : (
  <div className="mt-6 h-[26rem] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={groupedChartData}
       margin={{ top: 10, right: 20, left: 0, bottom: 75 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          angle={-35}
          textAnchor="end"
          interval={0}
          height={80}
          tickMargin={12}
        />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="totalVisits"
          name="Total Visits"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
)}

</section>
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Visit Totals</h2>
          <p className="mt-1 text-sm text-gray-500">
            {startDate} to {endDate}
          </p>

          {visitTableData.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No visit records found for this period.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
  <tr>
    <th className="p-3">
     {period === "weekly"
  ? "Day"
  : period === "monthly"
    ? "Week"
    : period === "quarterly" ||
        period === "semi-annual" ||
        period === "annual"
      ? "Month"
      : period === "custom"
        ? "Date / Reporting Period"
        : "Reporting Period"}
    </th>
    <th className="p-3">Total Visits</th>
  </tr>
</thead>
                <tbody>
  {visitTableData.map((row) => (
  <tr key={row.label} className="border-b">
    <td className="p-3">{row.label}</td>
    <td className="p-3">{row.totalVisits}</td>
  </tr>
))}
</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminShell currentTab="report">
      <AnalyticsContent />
    </AdminShell>
  );
}
