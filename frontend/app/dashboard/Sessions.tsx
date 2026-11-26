"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  expireOverdueSessions,
  getSessions,
  updateBag,
  updateSessionStatus,
  type Session,
  type SessionStatus,
} from "@/lib/api";
import Button from "../shared/components/Button";
import { useToast } from "@/hooks/use-toast";
import { errorMessage, formatDate, formatDateTime, formatTime, zoneLabel } from "./format";
import { StatusBadge } from "./StatusBadge";

type StatusFilter = "all" | SessionStatus;

const COLUMNS = [
  "Student",
  "Date",
  "Check In",
  "Check Out",
  "Time",
  "Reason for Visit",
  "Bag",
  "Zone",
  "Status",
  "Actions",
];

const PAGE_SIZES = [10, 20, 50, 100];

export default function Sessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [hideVisited, setHideVisited] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Session | null>(null);

  // Refresh every 5 seconds so the table stays live (SR-04.4).
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions(),
    refetchInterval: 5_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["bags"] });
  };

  const fail = (title: string) => (error: unknown) =>
    toast({ title, description: errorMessage(error), variant: "destructive" });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: SessionStatus }) => updateSessionStatus(id, next),
    onSuccess: (_, { next }) => {
      toast({ title: next === "exited" ? "Student checked out" : "Session marked expired" });
      refresh();
    },
    onError: fail("Update failed"),
  });

  const expireMutation = useMutation({
    mutationFn: expireOverdueSessions,
    onSuccess: (r) => {
      toast({ title: `${r.expired_count} overdue session${r.expired_count === 1 ? "" : "s"} expired` });
      refresh();
    },
    onError: fail("Could not expire sessions"),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (sessionsQuery.data ?? [])
      .filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (hideVisited && status === "all" && s.status === "exited") return false;
        if (!term) return true;
        return [s.student_id, s.student_email, s.bag_number ?? "", s.zone ?? "", s.visit_reason ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }, [sessionsQuery.data, search, status, hideVisited]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const busyId = statusMutation.isPending ? statusMutation.variables?.id : null;

  // Any filter change goes back to page 1.
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const confirmExpire = (s: Session) => {
    if (window.confirm(`Mark the session for ${s.student_id} as expired?`)) {
      statusMutation.mutate({ id: s.id, next: "expired" });
    }
  };

  return (
    <div className="flex flex-col text-[#2d3748] antialiased">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-[32px] font-bold text-[#0d0d0d] leading-tight">Sessions</h1>
          <p className="text-[#888ca0] text-[15px] mt-1">Manage library sessions</p>
        </div>
        <Link href="/check-in">
          <Button text="Check in Student" className="my-auto" />
        </Link>
      </div>

      <div className="flex-1 bg-white px-6 sm:px-9 pt-8 pb-10">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search student ID, email or bag"
            aria-label="Search sessions"
            className="w-full sm:w-[300px] h-[44px] bg-[#f4f5f8] text-[14px] px-4 rounded-[4px] outline-none placeholder-[#a0aec0]"
          />

          <select
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="w-[178px] h-[44px] border border-[#e2e8f0] rounded-[4px] px-3 text-[14px] text-[#4a5568] bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Checked in</option>
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

        {/* Meta row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
          <div className="text-[14px] text-[#8a92a6]">
            Showing:{" "}
            <span className="font-bold text-black text-[15px]">
              {rows.length} Session{rows.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <label
              className={`flex items-center gap-2 select-none text-[14px] text-[#8a92a6] ${status === "all" ? "cursor-pointer" : "opacity-50"}`}
              title={status === "all" ? undefined : "Only applies to All statuses"}
            >
              <input
                type="checkbox"
                checked={hideVisited}
                disabled={status !== "all"}
                onChange={(e) => resetPage(setHideVisited)(e.target.checked)}
                className="w-4 h-4 accent-[#9c5127]"
              />
              Hide visited
            </label>

            <label className="flex items-center gap-2 text-[14px] text-[#8a92a6]">
              Rows
              <select
                value={pageSize}
                onChange={(e) => resetPage(setPageSize)(Number(e.target.value))}
                className="h-8 border border-[#e2e8f0] rounded-[4px] px-2 text-[14px] text-[#4a5568] bg-white"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {sessionsQuery.error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage(sessionsQuery.error)}
          </p>
        )}

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-[#fdf3e7] h-[52px]">
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="px-4 font-bold text-[14px] text-[#8c6753] tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sessionsQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-10 text-center text-sm text-[#8a92a6]"
                  >
                    Loading sessions…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-10 text-center text-sm text-[#8a92a6]"
                  >
                    {search ? `No sessions match "${search}".` : "No sessions match."}
                  </td>
                </tr>
              ) : (
                pageRows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[#edf2f7] h-[64px] hover:bg-gray-50/50 transition-colors text-[14px] text-[#4a5568]"
                  >
                    <td className="px-4">
                      <div className="font-medium">{s.student_id}</div>
                      <div className="text-xs text-[#a0aec0]">{s.student_email}</div>
                    </td>

                    <td className="px-4 whitespace-nowrap">
                      {formatDate(s.check_in)}
                    </td>

                    <td
                      className="px-4 whitespace-nowrap"
                      title={formatDateTime(s.check_in)}
                    >
                      {formatTime(s.check_in)}
                    </td>

                    <td className="px-4 whitespace-nowrap">
                      {formatTime(s.check_out)}
                    </td>

                    <td className="px-4 whitespace-nowrap">
                      {s.allotted_minutes} min
                    </td>

                    <td className="px-4 max-w-[220px]">
                      <span title={s.visit_reason ?? undefined}>
                        {s.visit_reason ?? "—"}
                      </span>
                    </td>

                    <td className="px-4">
                      {s.bag_number ?? "—"}
                    </td>

                    <td className="px-4">
                      {zoneLabel(s.zone)}
                    </td>

                    <td className="px-4">
                      <StatusBadge status={s.status} />
                    </td>

                    <td className="px-4">
                      <div className="flex gap-2">
                        {s.status === "active" && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: s.id,
                                  next: "exited",
                                })
                              }
                              className="rounded-full bg-[#9c5127] px-3 py-1 text-xs font-semibold text-white hover:bg-[#86441f] disabled:opacity-60 whitespace-nowrap"
                            >
                              Check out
                            </button>

                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() => confirmExpire(s)}
                              className="rounded-full border border-[#e2e8f0] px-3 py-1 text-xs font-semibold text-[#4a5568] hover:bg-gray-50 disabled:opacity-60"
                            >
                              Expire
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditing(s)}
                          className="rounded-full border border-[#e2e8f0] px-3 py-1 text-xs font-semibold text-[#4a5568] hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-[#8a92a6]">
            <p>
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-[#e2e8f0] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditSessionDialog
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            toast({ title: "Session updated" });
          }}
          onError={fail("Update failed")}
        />
      )}
    </div>
  );
}

/** Change a session's status and/or bag number. */
function EditSessionDialog({
  session,
  onClose,
  onSaved,
  onError,
}: {
  session: Session;
  onClose: () => void;
  onSaved: () => void;
  onError: (error: unknown) => void;
}) {
  const [nextStatus, setNextStatus] = useState<SessionStatus>(session.status);
  const [bag, setBag] = useState(session.bag_number ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const updates: Promise<unknown>[] = [];

      if (nextStatus !== session.status) {
        updates.push(updateSessionStatus(session.id, nextStatus));
      }

      const newBag = bag.trim() === "" ? null : bag.trim();

      if (newBag !== (session.bag_number ?? null)) {
        updates.push(updateBag(session.id, newBag));
      }

      await Promise.all(updates);
      return updates.length;
    },

    onSuccess: (changed) => (changed ? onSaved() : onClose()),
    onError,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2
          id="edit-session-title"
          className="text-lg font-bold text-[#0d0d0d]"
        >
          Edit session
        </h2>

        <p className="mt-1 text-sm text-[#888ca0]">
          {session.student_id} · {session.student_email}
        </p>

        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[#2d3748]">
              Status
            </span>

            <select
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as SessionStatus)
              }
              className="h-11 w-full rounded-[4px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#2d3748] outline-none focus:border-[#9c5127]"
            >
              <option value="active">Checked in</option>
              <option value="exited">Exited</option>
              <option value="expired">Expired</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[#2d3748]">
              Bag ID
            </span>

            <input
              type="text"
              value={bag}
              onChange={(e) => setBag(e.target.value)}
              placeholder="e.g. BAG-040 (leave blank to release)"
              className="h-11 w-full rounded-[4px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#2d3748] outline-none focus:border-[#9c5127]"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={save.isPending}
            className="h-10 rounded-[4px] border border-[#e2e8f0] px-4 text-sm font-medium text-[#4a5568] hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="h-10 rounded-[4px] bg-[#9c5127] px-4 text-sm font-semibold text-white hover:bg-[#8a4622] disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}