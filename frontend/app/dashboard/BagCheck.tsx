"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBags, getSessions, updateBag } from "@/lib/api";
import { errorMessage, formatTime } from "./format";

export default function BagCheck() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [bagNumber, setBagNumber] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const bagsQuery = useQuery({ queryKey: ["bags"], queryFn: getBags, refetchInterval: 30_000 });
  const sessionsQuery = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => getSessions("active"),
    refetchInterval: 30_000,
  });

  // Active Main-section sessions without a bag (Basement has no bag check)
  const withoutBag = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => !s.bag_number && s.zone !== "Basement"),
    [sessionsQuery.data],
  );
  const checkInById = useMemo(
    () => new Map((sessionsQuery.data ?? []).map((s) => [s.id, s.check_in])),
    [sessionsQuery.data],
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["bags"] });
    void queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const bagMutation = useMutation({
    mutationFn: ({ id, bag }: { id: string; bag: string | null }) => updateBag(id, bag),
    onSuccess: (result, { bag }) => {
      setNotice({
        kind: "ok",
        text: bag
          ? `Bag ${bag} assigned to student ${result.student_id}.`
          : `Bag released for student ${result.student_id}.`,
      });
      setSessionId("");
      setBagNumber("");
      refresh();
    },
    onError: (error) => setNotice({ kind: "error", text: errorMessage(error) }),
  });

  function assign(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !bagNumber.trim()) return;
    bagMutation.mutate({ id: sessionId, bag: bagNumber.trim() });
  }

  const bags = bagsQuery.data ?? [];
  const error = bagsQuery.error ?? sessionsQuery.error;

  return (
    <div className="space-y-6 text-[#2C221E]">
      <div>
        <h1 className="text-[32px] font-bold leading-tight">Bag check</h1>
        <p className="text-[#7D6E62] text-[15px] mt-1">
          {bagsQuery.isLoading ? "Loading…" : `${bags.length} bag${bags.length === 1 ? "" : "s"} held for active sessions`}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage(error)}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className={`rounded-md px-4 py-2 text-sm ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {notice.text}
        </p>
      )}

      <form onSubmit={assign} className="bg-white p-6 shadow-sm flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-[#7D6E62]">
          Active session
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            required
            className="h-[44px] min-w-[260px] border border-[#e2e8f0] rounded-[4px] px-3 text-sm text-[#2C221E] bg-white"
          >
            <option value="">
              {withoutBag.length ? "Select a student" : "No active sessions without a bag"}
            </option>
            {withoutBag.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_id} · in at {formatTime(s.check_in)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[#7D6E62]">
          Bag number
          <input
            value={bagNumber}
            onChange={(e) => setBagNumber(e.target.value)}
            maxLength={50}
            required
            placeholder="e.g. B-12"
            className="h-[44px] w-[160px] bg-[#f4f5f8] px-3 rounded-[4px] text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={bagMutation.isPending || !sessionId || !bagNumber.trim()}
          className="h-[44px] rounded-[4px] bg-[#9c5127] px-5 text-sm font-semibold text-white hover:bg-[#86441f] disabled:opacity-60"
        >
          Assign bag
        </button>
      </form>

      <div className="bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-[#fdf3e7] h-[52px]">
              {["Bag", "Student", "Checked in", ""].map((h) => (
                <th key={h} className="px-6 font-bold text-[14px] text-[#8c6753]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bags.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-[#8a92a6]">
                  {bagsQuery.isLoading ? "Loading bags…" : "No bags are being held."}
                </td>
              </tr>
            ) : (
              bags.map((b) => (
                <tr key={b.session_id} className="border-b border-[#edf2f7] h-[60px]">
                  <td className="px-6 font-semibold">{b.bag_number}</td>
                  <td className="px-6 text-sm text-[#4a5568]">{b.student_id}</td>
                  <td className="px-6 text-sm text-[#4a5568]">{formatTime(checkInById.get(b.session_id))}</td>
                  <td className="px-6 text-right">
                    <button
                      type="button"
                      disabled={bagMutation.isPending}
                      onClick={() => bagMutation.mutate({ id: b.session_id, bag: null })}
                      className="rounded-full border border-[#e2e8f0] px-3 py-1 text-xs font-semibold text-[#4a5568] hover:bg-gray-50 disabled:opacity-60"
                    >
                      Handed back
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
