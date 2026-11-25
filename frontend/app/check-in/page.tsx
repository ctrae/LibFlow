"use client";

import { useState } from "react";

const QUICK_MINUTES = [15, 30, 45, 60];

export default function StudentPortal() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [zone, setZone] = useState("Main");
  const [checkingBag, setCheckingBag] = useState<"no" | "yes">("no");
  const [bagNumber, setBagNumber] = useState("");
  const [message, setMessage] = useState("");

  function handleBagChoiceChange(value: "no" | "yes") {
    setCheckingBag(value);
    if (value === "no") {
      setBagNumber("");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = studentId.trim();
    const stayMinutes = Number(minutes);

    if (!cleanName) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!cleanEmail.endsWith("@mymona.uwi.edu")) {
      setMessage("Please use your @mymona.uwi.edu email.");
      return;
    }

    if (!/^\d{9}$/.test(cleanId)) {
      setMessage("Student ID must be 9 digits.");
      return;
    }

    if (!Number.isInteger(stayMinutes) || stayMinutes < 15 || stayMinutes > 480) {
      setMessage("Approximate stay must be between 15 and 480 minutes.");
      return;
    }

    const bagSummary =
      checkingBag === "yes"
        ? bagNumber.trim()
          ? `Bag checked (${bagNumber.trim()})`
          : "Bag checked"
        : "No bag declared";

    setMessage(
      `Registered ${cleanName} (${cleanId}) — ${zone}, ~${stayMinutes} mins, ${bagSummary}.`
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f7f3ec",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "460px", margin: "0 auto 0.75rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7a6f64",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontWeight: 700, color: "#1f2d5a" }}>LIBFLOW</span>
          <span>FST Library student entry</span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "460px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #e7dfd3",
          borderRadius: "10px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 0.25rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9a441b",
            }}
          >
            QR Check-In
          </p>
          <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", color: "#1f2937" }}>
            Register your library visit
          </h1>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.4 }}>
            Complete this form after scanning the library QR code. Enter your approximate
            stay in minutes (15–480).
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          Full name
          <input
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid #d6cec2", fontWeight: 400 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          @mymona.uwi.edu email
          <input
            type="email"
            placeholder="name@mymona.uwi.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid #d6cec2", fontWeight: 400 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          Student ID number
          <input
            type="text"
            placeholder="Nine-digit ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            style={{ padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid #d6cec2", fontWeight: 400 }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
            How long are you staying? (approximate minutes, 15–480)
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
            {QUICK_MINUTES.map((preset) => {
              const active = Number(minutes) === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(String(preset))}
                  style={{
                    padding: "0.4rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: active ? "1px solid #9a441b" : "1px solid #d6cec2",
                    backgroundColor: active ? "#9a441b" : "#faf7f2",
                    color: active ? "#ffffff" : "#374151",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {preset} min
                </button>
              );
            })}
          </div>
          <input
            type="number"
            min={15}
            max={480}
            placeholder="Approximate minutes (e.g. 30)"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
            style={{ padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid #d6cec2" }}
          />
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          Zone
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            style={{ padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid #d6cec2", backgroundColor: "#ffffff" }}
          >
            <option value="Main">Main</option>
            <option value="Basement">Basement</option>
          </select>
        </label>

        <div
          style={{
            backgroundColor: "#faf7f2",
            border: "1px solid #ece5da",
            borderRadius: "6px",
            padding: "0.65rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          <label
            htmlFor="checkingBag"
            style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}
          >
            Baggage information — Are you checking a bag? Yes or no?
          </label>
          <select
            id="checkingBag"
            value={checkingBag}
            onChange={(e) => handleBagChoiceChange(e.target.value as "no" | "yes")}
            style={{ padding: "0.5rem 0.6rem", borderRadius: "6px", border: "1px solid #d6cec2", backgroundColor: "#ffffff" }}
          >
            <option value="no">No — No bag declared</option>
            <option value="yes">Yes</option>
          </select>

          {checkingBag === "yes" && (
            <input
              type="text"
              placeholder="Enter bag number"
              value={bagNumber}
              onChange={(e) => setBagNumber(e.target.value)}
              style={{ padding: "0.5rem 0.6rem", borderRadius: "6px", border: "1px solid #d6cec2", backgroundColor: "#ffffff" }}
            />
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: "0.65rem 1rem",
            backgroundColor: "#9a441b",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          &rarr; Register visit
        </button>

        {message && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#1f2937" }}>{message}</p>
        )}
      </form>
    </div>
  );
}