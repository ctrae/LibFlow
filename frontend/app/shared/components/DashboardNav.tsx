"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Logo } from "./Logo";
import { LogOutIcon } from "./Icons";
import { useAuth } from "../../../hooks/useAuth";
import { ADMIN_TABS, type AdminTab } from "../adminNav";

export interface Tab extends AdminTab {
  component: React.ComponentType;
}

const itemClass = (active: boolean) =>
  `flex items-center justify-center py-3 gap-2 font-medium cursor-pointer ${
    active ? "bg-secondary" : "bg-white hover:text-primary"
  }`;

/**
 * Sidebar shared by every staff page. On /dashboard, `onTabChange` switches
 * tabs in place; elsewhere tabs link back to /dashboard?tab=…. Tabs with an
 * `href` (Report → /analytics) always open their own page.
 */
export default function DashboardNav({
  mobileOpen = false,
  onCloseMobile,
  currentTab,
  onTabChange,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentTab: string;
  onTabChange?: (tab: string) => void;
}) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <nav
        aria-label="Staff"
        className={`h-screen w-64 lg:w-1/6 fixed z-40 transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="bg-primary flex flex-col space-y-8 relative h-screen overflow-y-auto">
          <div className="h-[76px] shrink-0 border-b border-[#edf2f7] bg-white px-4 text-primary flex justify-center items-center py-4">
            <Logo />
          </div>

          <div className="flex flex-col space-y-8 z-2 px-8">
            {ADMIN_TABS.map((tab) => {
              const active = currentTab === tab.key;
              const content = (
                <>
                  <tab.icon />
                  <span>{tab.label}</span>
                </>
              );
              return onTabChange && !tab.href ? (
                <button
                  key={tab.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onTabChange(tab.key);
                    onCloseMobile?.();
                  }}
                  className={itemClass(active)}
                >
                  {content}
                </button>
              ) : (
                <Link
                  key={tab.key}
                  href={tab.href ?? `/dashboard?tab=${tab.key}`}
                  aria-current={active ? "page" : undefined}
                  onClick={onCloseMobile}
                  className={itemClass(active)}
                >
                  {content}
                </Link>
              );
            })}

            <Link href="/check-in?staff=1" onClick={onCloseMobile} className={itemClass(false)}>
              <UserPlus className="h-5 w-5" />
              <span>Override check-in</span>
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex bg-white hover:bg-secondary justify-center py-3 gap-2 font-medium cursor-pointer"
            >
              <LogOutIcon />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
