"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import DashboardNav from "./DashboardNav";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Layout for every staff page: the one sign-in guard, the sidebar, and the
 * header. Signed-out visitors go to /login; signed-in accounts that are not
 * staff get a notice instead of a silent redirect loop.
 */
export default function AdminShell({
  currentTab,
  onTabChange,
  children,
}: {
  currentTab: string;
  onTabChange?: (tab: string) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, profileError, isLoading, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[#2d3748]">{profileError ?? "This account does not have staff access."}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[4px] border border-[#e2e8f0] px-4 h-9 text-sm font-semibold text-[#4a5568] hover:bg-gray-50"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => void signOut().finally(() => router.replace("/login"))}
            className="rounded-[4px] border border-[#e2e8f0] px-4 h-9 text-sm font-semibold text-[#4a5568] hover:bg-gray-50"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Staff";
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || "";
  const roleLabel = profile.role === "head_librarian" ? "Head Librarian" : "Library Staff";

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <DashboardNav
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        currentTab={currentTab}
        onTabChange={onTabChange}
      />
      <div className="w-full lg:w-5/6 lg:ml-auto h-full">
        <header className="h-[76px] border-b border-[#edf2f7] px-4 sm:px-8 flex items-center justify-between lg:justify-end bg-white shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden w-10 h-10 rounded-full bg-[#f4f5f8] flex items-center justify-center text-[#5a607f] hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-[#2d3748]">{displayName}</p>
              <p className="text-[11px] text-[#888ca0]">{roleLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-gray-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#5a607f]">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
