
import { useState, type FormEvent } from "react";
import {
  getUsageReportSessions,
  type UsageReportSession,
} from "../../lib/libraryApi";

// Converts a Date into YYYY-MM-DD using the local timezone.
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Formats a timestamp into a readable date and time.
function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// Converts an hour number into a readable hour, such as 9:00 AM.
function formatHour(hour: number): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Analytics() {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [startDate, setStartDate] = useState(
    formatDateForInput(sevenDaysAgo)
  );
  const [endDate, setEndDate] = useState(
    formatDateForInput(today)
  );

  const [sessions, setSessions] = useState<UsageReportSession[]>([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (startDate > endDate) {
      setError("The start date cannot be after the end date.");
      return;
    }

    setLoading(true);
    setError("");
    setHasGeneratedReport(false);

    try {
      const reportSessions = await getUsageReportSessions(
        startDate,
        endDate
      );

      setSessions(reportSessions);
      setHasGeneratedReport(true);
    } catch (err) {
      console.error("Unable to generate usage report:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the report."
      );
    } finally {
      setLoading(false);
    }
  }

  // Total visits includes every session checked in during the date range.
  const totalVisits = sessions.length;

  // A completed visit has a recorded check-out time.
  const completedSessions = sessions.filter(
    (session) =>
      session.check_out_time !== null &&
      (session.session_status === "exited" ||
        session.session_status === "expired")
  );

  // Calculate the actual duration of each completed visit in minutes.
  const totalStayMinutes = completedSessions.reduce((total, session) => {
    const checkIn = new Date(session.check_in_time).getTime();
    const checkOut = new Date(session.check_out_time!).getTime();

    return total + Math.max(0, (checkOut - checkIn) / 60000);
  }, 0);

  const averageStay =
    completedSessions.length > 0
      ? totalStayMinutes / completedSessions.length
      : 0;

  // Count the number of check-ins for each hour of the day.
  const checkInsByHour: number[] = Array(24).fill(0);

  sessions.forEach((session) => {
    const hour = new Date(session.check_in_time).getHours();
    checkInsByHour[hour]++;
  });

  const highestCheckInCount = Math.max(0, ...checkInsByHour);

  const peakHour =
    highestCheckInCount > 0
      ? checkInsByHour.indexOf(highestCheckInCount)
      : null;

  return (
    <div className="analytics-page">
      <h1>Usage Reports</h1>

      <p>
        Select a date range to view library visits and usage statistics.
      </p>

      <form onSubmit={generateReport}>
        <div>
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            min={startDate}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {loading && <p>Loading usage report...</p>}

      {hasGeneratedReport && !loading && (
        <section>
          <h2>Report Summary</h2>

          {totalVisits === 0 ? (
            <p>No library visits were found for the selected date range.</p>
          ) : (
            <>
              <div className="report-summary">
                <div>
                  <h3>Total Visits</h3>
                  <p>{totalVisits}</p>
                </div>

                <div>
                  <h3>Average Stay</h3>
                  <p>
                    {completedSessions.length > 0
                      ? `${averageStay.toFixed(1)} minutes`
                      : "No completed visits"}
                  </p>
                </div>

                <div>
                  <h3>Peak Check-in Hour</h3>
                  <p>
                    {peakHour !== null
                      ? `${formatHour(peakHour)} (${highestCheckInCount} visits)`
                      : "No check-ins"}
                  </p>
                </div>
              </div>

              <h2>Visit Details</h2>

              <table>
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Actual Stay</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {sessions.map((session) => {
                    const actualStay =
                        session.check_out_time !== null &&
                        (session.session_status === "exited" ||
                          session.session_status === "expired")
                          ? Math.max(
                            0,
                            (new Date(session.check_out_time).getTime() -
                              new Date(session.check_in_time).getTime()) /
                              60000
                          )
                        : null;

                    return (
                      <tr key={session.session_id}>
                        <td>{session.session_id}</td>
                        <td>{formatDateTime(session.check_in_time)}</td>
                        <td>
                          {session.check_out_time
                            ? formatDateTime(session.check_out_time)
                            : "Not checked out"}
                        </td>
                        <td>
                          {actualStay !== null
                            ? `${actualStay.toFixed(1)} minutes`
                            : "In progress"}
                        </td>
                        <td>{session.session_status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </div>
  );
}
