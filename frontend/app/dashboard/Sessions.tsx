"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  expireOverdueSessions,
  getSessions,
  updateSessionStatus,
  type SessionStatus,
} from "@/lib/api";
import { errorMessage, formatDateTime, formatTime, zoneLabel } from "./format";
import { StatusBadge } from "./StatusBadge";

type StatusFilter = "all" | SessionStatus;

export default function Sessions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [hideVisited, setHideVisited] = useState(true);
  const [notice, setNotice] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions(),
    refetchInterval: 30_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["bags"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: SessionStatus }) => updateSessionStatus(id, next),
    onSuccess: (_, { next }) => {
      setNotice(next === "exited" ? "Student checked out." : "Session marked expired.");
      refresh();
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const expireMutation = useMutation({
    mutationFn: expireOverdueSessions,
    onSuccess: (r) => {
      setNotice(`${r.expired_count} overdue session${r.expired_count === 1 ? "" : "s"} expired.`);
      refresh();
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (sessionsQuery.data ?? []).filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (hideVisited && s.status === "exited") return false;
      if (!term) return true;
      return (
        s.student_id.includes(term) ||
        s.student_email.toLowerCase().includes(term) ||
        (s.bag_number ?? "").toLowerCase().includes(term)
      );
    });
  }, [sessionsQuery.data, search, status, hideVisited]);

  const busyId = statusMutation.isPending ? statusMutation.variables?.id : null;

  return (
    <div className="min-h-screen flex flex-col text-[#2d3748] antialiased">
      <div className="pb-6">
        <h1 className="text-[32px] font-bold text-[#0d0d0d] leading-tight">Sessions</h1>
        <p className="text-[#888ca0] text-[15px] mt-1">Manage library sessions</p>
      </div>

      <div className="flex-1 bg-white px-6 sm:px-9 pt-8 pb-10">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student ID, email or bag"
            aria-label="Search sessions"
            className="w-full sm:w-[300px] h-[44px] bg-[#f4f5f8] text-[14px] px-4 rounded-[4px] outline-none placeholder-[#a0aec0]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="w-[178px] h-[44px] border border-[#e2e8f0] rounded-[4px] px-3 text-[14px] text-[#4a5568] bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="exited">Exited</option>
            <option value="expired">Expired</option>
          </select>
          <button
            type="button"
            onClick={() => expireMutation.mutate()}
            disabled={expireMutation.isPending}
            className="h-[44px] px-4 rounded-[4px] border border-[#e2e8f0] text-[14px] text-[#4a5568] hover:bg-gray-50 disabled:opacity-60"
          >
            {expireMutation.isPending ? "Expiring…" : "Expire overdue"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
          <div className="text-[14px] text-[#8a92a6]">
            Showing: <span className="font-bold text-black text-[15px]">{rows.length} Sessions</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none text-[14px] text-[#8a92a6]">
            <input
              type="checkbox"
              checked={hideVisited}
              onChange={(e) => setHideVisited(e.target.checked)}
              className="w-4 h-4 accent-[#9c5127]"
            />
            Hide visited
          </label>
        </div>

        {notice && (
          <p role="status" className="mb-4 rounded-md bg-[#fdf3e7] px-4 py-2 text-sm text-[#8c6753]">
            {notice}
          </p>
        )}
        {sessionsQuery.error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage(sessionsQuery.error)}
          </p>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#fdf3e7] h-[52px]">
                {["Student", "Check In", "Check Out", "Bag", "Zone", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 font-bold text-[14px] text-[#8c6753] tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-[#8a92a6]">
                    Loading sessions…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-[#8a92a6]">
                    No sessions match.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-[#edf2f7] h-[64px] hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 text-[14px] text-[#4a5568]">
                      <div className="font-medium">{s.student_id}</div>
                      <div className="text-xs text-[#a0aec0]">{s.student_email}</div>
                    </td>
                    <td className="px-6 text-[14px] text-[#4a5568]" title={formatDateTime(s.check_in)}>
                      {formatTime(s.check_in)}
                    </td>
                    <td className="px-6 text-[14px] text-[#4a5568]">{formatTime(s.check_out)}</td>
                    <td className="px-6 text-[14px] text-[#4a5568]">{s.bag_number ?? "—"}</td>
                    <td className="px-6 text-[14px] text-[#4a5568]">{zoneLabel(s.zone)}</td>
                    <td className="px-6">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6">
                      {s.status === "active" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => statusMutation.mutate({ id: s.id, next: "exited" })}
                            className="rounded-full bg-[#9c5127] px-3 py-1 text-xs font-semibold text-white hover:bg-[#86441f] disabled:opacity-60"
                          >
                            Check out
                          </button>
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => statusMutation.mutate({ id: s.id, next: "expired" })}
                            className="rounded-full border border-[#e2e8f0] px-3 py-1 text-xs font-semibold text-[#4a5568] hover:bg-gray-50 disabled:opacity-60"
                          >
                            Expire
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#a0aec0]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
