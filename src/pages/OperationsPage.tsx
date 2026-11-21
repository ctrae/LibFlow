import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export default function OperationsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);


useEffect(() => {
  let isActive = true;

  async function checkStaffAccess(session: Session | null) {
    if (!session) {
      if (isActive) {
        setAuthorized(false);
        setLoading(false);
        navigate("/login", { replace: true });
      }
      return;
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("user_type, is_approved")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    if (!isActive) return;

    const isApprovedStaff =
      !error &&
      profile?.is_approved === true &&
      (profile.user_type === "LibraryStaff" ||
        profile.user_type === "HeadLibrarian");

    if (!isApprovedStaff) {
      setAuthorized(false);
      setLoading(false);
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
      return;
    }

    setAuthorized(true);
    setLoading(false);
  }

  async function initializeAccess() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      if (isActive) {
        setLoading(false);
        navigate("/login", { replace: true });
      }
      return;
    }

    await checkStaffAccess(data.session);
  }

  void initializeAccess();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    queueMicrotask(() => {
      void checkStaffAccess(session);
    });
  });

  return () => {
    isActive = false;
    subscription.unsubscribe();
  };
}, [navigate]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }

    navigate("/login", { replace: true });
  }

  if (loading) {
    return <p>Checking staff access...</p>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <div>
      <nav>
        <Link to="/live-sessions">Live</Link> |{" "}
        <Link to="/analytics">Analytics</Link> |{" "}
        <Link to="/bag-checks">Bag checks</Link> |{" "}
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </nav>

      <Outlet />
    </div>
  );
}
