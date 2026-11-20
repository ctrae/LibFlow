import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      let email = identifier.trim();

      // If the user entered a student ID,
      // look up the student's email.
      if (/^\d+$/.test(email)) {
        const { data: student, error: studentError } = await supabase
          .from("users")
          .select("email, user_type")
          .eq("student_id", email)
          .eq("user_type", "Student")
          .maybeSingle();

        if (studentError) {
          throw studentError;
        }

        if (!student) {
          setError("Student ID not found.");
          return;
        }

        email = student.email;
      }

      // Staff log in using their UWI email.
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError("Unable to complete login.");
        return;
      }

      // Get the LIBFLOW user profile to determine the role.
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("user_type, is_approved")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      if (!profile) {
        await supabase.auth.signOut();
        setError("No LIBFLOW profile is linked to this account.");
        return;
      }

      // Staff must be approved.
      if (
        profile.user_type === "LibraryStaff" ||
        profile.user_type === "HeadLibrarian"
      ) {
        if (!profile.is_approved) {
          await supabase.auth.signOut();
          setError("Your staff account has not been approved.");
          return;
        }

        navigate("/live-sessions");
        return;
      }

      // Students will eventually go to the Student Portal.
      if (profile.user_type === "Student") {
        navigate("/");
        return;
      }

      await supabase.auth.signOut();
      setError("Invalid LIBFLOW account type.");
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>LIBFLOW Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="identifier">
            Student ID or Staff Email
          </label>

          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Enter Student ID or UWI email"
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
    </div>
  );
}