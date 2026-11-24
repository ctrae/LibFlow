"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { getCurrentOccupancy } from "../../lib/libraryApi";

export default function LiveSessionsPage() {
  const { user, profile, profileError, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [occupancyError, setOccupancyError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const isApprovedStaff =
    profile?.is_approved === true &&
    (profile.user_type === "Head Librarian" ||
      profile.user_type === "Library Staff");

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!isApprovedStaff) return;

    let active = true;

    async function loadOccupancy() {
      try {
        const currentOccupancy = await getCurrentOccupancy();
        if (active) {
          setOccupancy(currentOccupancy);
          setOccupancyError(null);
        }
      } catch (error) {
        if (active) {
          setOccupancyError(
            error instanceof Error ? error.message : "Unable to load occupancy.",
          );
        }
      }
    }

    void loadOccupancy();
    const interval = setInterval(() => void loadOccupancy(), 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isApprovedStaff]);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    }
  }

  if (isLoading || !user) {
    return (
      <main className="p-8" aria-live="polite">
        Checking staff access...
      </main>
    );
  }

  if (profileError) {
    return (
      <main className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">Unable to verify staff access</h1>
        <p role="alert">{profileError}</p>
        <button type="button" onClick={handleSignOut} className="underline">
          Sign out
        </button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </main>
    );
  }

  if (!profile || profile.user_type === "Student" || !profile.is_approved) {
    const message = !profile
      ? "No staff profile is linked to this account."
      : profile.user_type === "Student"
        ? "This dashboard is available to library staff only."
        : "Your staff account is awaiting Head Librarian approval.";

    return (
      <main className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">Staff access required</h1>
        <p>{message}</p>
        <button type="button" onClick={handleSignOut} className="underline">
          Sign out
        </button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </main>
    );
  }

  return (
    <main className="space-y-4 p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live Sessions</h1>
          <p>
            Signed in as {profile.full_name || profile.email} (
            {profile.user_type})
          </p>
        </div>
        <button type="button" onClick={handleSignOut} className="underline">
          Sign out
        </button>
      </header>
      {signOutError && <p role="alert">{signOutError}</p>}
      <p>
        Current Occupancy:{" "}
        {occupancyError
          ? `Unable to load (${occupancyError})`
          : occupancy !== null
            ? occupancy
            : "Loading..."}
      </p>
    </main>
  );
}
