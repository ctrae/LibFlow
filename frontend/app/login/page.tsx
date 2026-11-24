"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Authentication
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      // Make sure Supabase returned a user
      if (!data.user) {
        setError("Unable to complete login.");
        return;
      }

      // Check whether the authenticated user is a LIBFLOW staff member
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("user_id, role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (staffError) {
        console.error("Staff lookup error:", staffError);

        await supabase.auth.signOut();

        setError("Unable to verify your LIBFLOW staff account.");
        return;
      }

      // User authenticated successfully but is not registered as staff
      if (!staff) {
        await supabase.auth.signOut();

        setError("This account is not registered as LIBFLOW staff.");
        return;
      }

      // Check staff role
      if (staff.role !== "library_staff" && staff.role !== "head_librarian") {
        await supabase.auth.signOut();

        setError(
          "You do not have permission to access LIBFLOW staff services.",
        );
        return;
      }

      // Staff login successful
      router.push("/live-sessions");
    } catch (error) {
      console.error("Login error:", error);

      setError("Something went wrong while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>LIBFLOW Staff Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">UWI Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your UWI email"
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
