"use client";
import {
  ApiError,
  getSession,
  getSessions,
  Session,
  SessionStatus,
  updateBag,
  updateSessionStatus,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import Button from "../shared/components/Button";
import { supabase } from "@/lib/supabaseClient";
import Table, { TableColumn } from "../shared/components/Table";
import IconButton from "../shared/components/IconButton";
import SelectInput from "../shared/components/SelectInput";
import { formatDate, formatDate2, formatTime } from "../shared/util/date";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function LibFlowDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { toast } = useToast();

  const [editing, setEditing] = useState<Session | null>(null);
  const [editStatus, setEditStatus] = useState<SessionStatus>("active");
  const [editBag, setEditBag] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filteredSessions = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return sessions;

    return sessions.filter((s) => {
      const haystack = [
        s.student_id,
        s.student_email,
        s.bag_number ?? "",
        s.zone ?? "",
        s.visit_reason ?? "",
        s.status,
        // so "8:15" or "2024-05-01" matches too
        s.check_in,
        s.check_out ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [sessions, debouncedQuery]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSessions = filteredSessions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, itemsPerPage]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getSessions();

        if (!cancelled) setSessions(data);
        console.log(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
          if (err.isAuthError) {
            window.location.href = "/login";
          }
        } else {
          setError("Unexpected error loading sessions.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const columns: TableColumn<Session>[] = [
    {
      key: "student_id",
      label: "Student ID",
      widthClass: "w-30",
    },
    {
      key: "check_in",
      label: "Date",
      widthClass: "w-30",
      render: (session: Session) => <>{`${formatDate2(session.check_in)}`}</>,
    },
    {
      key: "check_in",
      label: "Check In",
      widthClass: "w-30",
      render: (session: Session) => <>{`${formatTime(session.check_in)}`}</>,
    },
    {
      key: "check_out",
      label: "Check Out",
      widthClass: "w-40",
      render: (session: Session) => (
        <>{`${session.check_out ? formatTime(session.check_out) : "Not Checked Out"}`}</>
      ),
    },
    {
      key: "allotted_minutes",
      label: "Time",
      widthClass: "w-20",
      render: (session: Session) => <>{`${session.allotted_minutes} min`}</>,
    },
    { key: "bag_number", label: "Bag ID", widthClass: "w-20" },
    { key: "zone", label: "Zone", widthClass: "w-20" },
    { key: "visit_reason", label: "Visit Reason", widthClass: "w-30" },
    {
      key: "status",
      label: "Status",
      widthClass: "w-20",
      render: renderStatusColor,
    },
  ].filter((item): item is TableColumn<Session> => !!item);

  function renderStatusColor(value: Session): React.ReactNode {
    let roleClass = "";
    switch (value.status) {
      case "exited":
        roleClass = "text-warning";
        break;
      case "active":
        roleClass = "text-green-500";
        break;
      case "expired":
        roleClass = "text-gray-500";
        break;

      default:
        roleClass = "text-primary";
        break;
    }
    return <p className={`${roleClass}`}>{value.status}</p>;
  }

  const openEdit = (session: Session) => {
    setEditing(session);
    setEditStatus(session.status);
    setEditBag(session.bag_number ?? "");
  };

  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updates: Promise<unknown>[] = [];

      if (editStatus !== editing.status) {
        updates.push(updateSessionStatus(editing.id, editStatus));
      }

      const trimmedBag = editBag.trim();
      const newBag = trimmedBag === "" ? null : trimmedBag;
      if (newBag !== (editing.bag_number ?? null)) {
        updates.push(updateBag(editing.id, newBag));
      }

      if (updates.length === 0) {
        closeEdit();
        return;
      }

      await Promise.all(updates);

      // Re-fetch so the table reflects the backend's canonical state
      const fresh = await getSessions();
      setSessions(fresh);

      toast({ title: "Session updated" });
      closeEdit();
    } catch (err) {
      toast({
        title: "Update failed",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const cancelSession = async (session: Session) => {
    const confirmed = window.confirm(
      `Cancel session for ${session.student_id}? This marks it expired.`,
    );
    if (!confirmed) return;

    setDeletingId(session.id);
    try {
      await updateSessionStatus(session.id, "expired");
      const fresh = await getSessions();
      setSessions(fresh);
      toast({ title: "Session cancelled" });
    } catch (err) {
      toast({
        title: "Cancel failed",
        description:
          err instanceof ApiError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const ActionsCell = (session: Session) => (
    <>
      <IconButton
        onClick={() => openEdit(session)}
        icon={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM10.95 17.51C10.66 17.8 10.11 18.08 9.71 18.14L7.25 18.49C7.16 18.5 7.07 18.51 6.98 18.51C6.57 18.51 6.19 18.37 5.92 18.1C5.59 17.77 5.45 17.29 5.53 16.76L5.88 14.3C5.94 13.89 6.21 13.35 6.51 13.06L10.97 8.6C11.05 8.81 11.13 9.02 11.24 9.26C11.34 9.47 11.45 9.69 11.57 9.89C11.67 10.06 11.78 10.22 11.87 10.34C11.98 10.51 12.11 10.67 12.19 10.76C12.24 10.83 12.28 10.88 12.3 10.9C12.55 11.2 12.84 11.48 13.09 11.69C13.16 11.76 13.2 11.8 13.22 11.81C13.37 11.93 13.52 12.05 13.65 12.14C13.81 12.26 13.97 12.37 14.14 12.46C14.34 12.58 14.56 12.69 14.78 12.8C15.01 12.9 15.22 12.99 15.43 13.06L10.95 17.51ZM17.37 11.09L16.45 12.02C16.39 12.08 16.31 12.11 16.23 12.11C16.2 12.11 16.16 12.11 16.14 12.1C14.11 11.52 12.49 9.9 11.91 7.87C11.88 7.76 11.91 7.64 11.99 7.57L12.92 6.64C14.44 5.12 15.89 5.15 17.38 6.64C18.14 7.4 18.51 8.13 18.51 8.89C18.5 9.61 18.13 10.33 17.37 11.09Z"
              fill="currentColor"
            />
          </svg>
        }
      />
      <IconButton
        onClick={() => cancelSession(session)}
        icon={
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.0702 5.23C19.4602 5.07 17.8502 4.95 16.2302 4.86V4.85L16.0102 3.55C15.8602 2.63 15.6402 1.25 13.3002 1.25H10.6802C8.35016 1.25 8.13016 2.57 7.97016 3.54L7.76016 4.82C6.83016 4.88 5.90016 4.94 4.97016 5.03L2.93016 5.23C2.51016 5.27 2.21016 5.64 2.25016 6.05C2.29016 6.46 2.65016 6.76 3.07016 6.72L5.11016 6.52C10.3502 6 15.6302 6.2 20.9302 6.73C20.9602 6.73 20.9802 6.73 21.0102 6.73C21.3902 6.73 21.7202 6.44 21.7602 6.05C21.7902 5.64 21.4902 5.27 21.0702 5.23Z"
              fill="currentColor"
            />
            <path
              d="M19.2302 8.14C18.9902 7.89 18.6602 7.75 18.3202 7.75H5.68024C5.34024 7.75 5.00024 7.89 4.77024 8.14C4.54024 8.39 4.41024 8.73 4.43024 9.08L5.05024 19.34C5.16024 20.86 5.30024 22.76 8.79024 22.76H15.2102C18.7002 22.76 18.8402 20.87 18.9502 19.34L19.5702 9.09C19.5902 8.73 19.4602 8.39 19.2302 8.14ZM13.6602 17.75H10.3302C9.92024 17.75 9.58024 17.41 9.58024 17C9.58024 16.59 9.92024 16.25 10.3302 16.25H13.6602C14.0702 16.25 14.4102 16.59 14.4102 17C14.4102 17.41 14.0702 17.75 13.6602 17.75ZM14.5002 13.75H9.50024C9.09024 13.75 8.75024 13.41 8.75024 13C8.75024 12.59 9.09024 12.25 9.50024 12.25H14.5002C14.9102 12.25 15.2502 12.59 15.2502 13C15.2502 13.41 14.9102 13.75 14.5002 13.75Z"
              fill="currentColor"
            />
          </svg>
        }
      />
    </>
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col text-[#2d3748] antialiased">
      {/* Main Container */}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col bg-[#f4f5f9] min-w-0">
          <div className="flex justify-between">
            <div className="pb-8">
              <h1 className="text-[32px] font-bold  text-[#0d0d0d] leading-tight">
                Sessions
              </h1>
              <p className="text-[#888ca0] text-[15px]  mt-1">
                Manage Your Library Sessions
              </p>
            </div>
            <Link href="/check-in">
              <Button text="Check in Student" className="my-auto" />
            </Link>
          </div>

          {/* Lower Section: Controls & Table */}
          <div className="flex-1 bg-white px-9 pt-8 pb-10">
            {/* Search and Filter Row */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative w-[265px] h-[44px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a0aec0]">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full bg-[#f4f5f8] text-[14px] pl-10 pr-4 rounded-[4px] outline-none text-[#2d3748] placeholder-[#a0aec0]"
                />
              </div>

              <SelectInput
                name="Slot Size"
                selectedOptionValue={itemsPerPage}
                onSelectedOptionValueChange={(value) => setItemsPerPage(value)}
                width="min-w-18"
                options={[
                  { label: "10", value: 10 },
                  { label: "20", value: 20 },
                  { label: "30", value: 30 },
                  { label: "50", value: 50 },
                  { label: "100", value: 100 },
                ]}
              />
            </div>

            {/* Table Meta Controls Row */}
            <div className="flex items-center justify-between mt-6 mb-4">
              <div className="text-[14px] text-[#8a92a6]">
                Showing:{" "}
                <span className="font-bold text-black text-[15px]">
                  {filteredSessions.length} Session
                  {filteredSessions.length === 1 ? "" : "s"}
                </span>
                {debouncedQuery && (
                  <span className="ml-1 text-[#a0aec0]">
                    (filtered from {sessions.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6">
                {/* Hide Visited Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="w-4 h-4 rounded-[3px] bg-[#9c5127] flex items-center justify-center text-white">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-[#8a92a6] text-[14px]">
                    Hide Visited
                  </span>
                </label>

                {/* Show Empty Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="w-4 h-4 rounded-[3px] border border-[#cbd5e0] bg-white" />
                  <span className="text-[#a0aec0] text-[14px]">Show Empty</span>
                </label>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#a0aec0]">
                {debouncedQuery
                  ? `No sessions match "${debouncedQuery}".`
                  : "No sessions yet."}
              </p>
            ) : (
              <Table
                columns={columns}
                data={currentSessions}
                actions={ActionsCell}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </main>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#0d0d0d]">Edit session</h2>
            <p className="mt-1 text-sm text-[#888ca0]">
              {editing.student_id} · {editing.student_email}
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#2d3748]">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as SessionStatus)
                  }
                  className="h-11 w-full rounded-[4px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#2d3748] outline-none focus:border-[#9c5127]"
                >
                  <option value="active">active</option>
                  <option value="exited">exited</option>
                  <option value="expired">expired</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#2d3748]">
                  Bag ID
                </label>
                <input
                  type="text"
                  value={editBag}
                  onChange={(e) => setEditBag(e.target.value)}
                  placeholder="e.g. BAG-040 (leave blank to release)"
                  className="h-11 w-full rounded-[4px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#2d3748] outline-none focus:border-[#9c5127]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="h-10 rounded-[4px] border border-[#e2e8f0] px-4 text-sm font-medium text-[#4a5568] hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="h-10 rounded-[4px] bg-[#9c5127] px-4 text-sm font-semibold text-white hover:bg-[#8a4622] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
