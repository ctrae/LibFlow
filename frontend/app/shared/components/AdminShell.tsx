"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import DashboardNav from "./DashboardNav";
import { useAuth } from "../../../hooks/useAuth";

/**
 * Layout for every staff page: sign-in guard, the sidebar, and the header.
 * Signed-out visitors are sent to /login; non-staff accounts get a notice.
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
        <p className="text-[#2C221E]">{profileError ?? "This account does not have staff access."}</p>
        <button
          type="button"
          onClick={() => void signOut().finally(() => router.replace("/login"))}
          className="rounded-full border border-[#DCD0C0] px-4 py-2 text-sm font-semibold"
        >
          Sign in with a different account
        </button>
      </div>
    );
  }

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
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-[#2C221E]">{profile.email}</p>
              <p className="text-xs text-[#8C7C6D]">
                {profile.role === "head_librarian" ? "Head Librarian" : "Library Staff"}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-[#9B4531] text-white flex items-center justify-center font-semibold uppercase shrink-0"
            >
              {(profile.email ?? "?").charAt(0)}
            </div>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
