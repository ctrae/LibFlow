"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, UserPlus } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../../../hooks/useAuth";
import { LogOutIcon } from "./Icons";
import { ADMIN_TABS, BAG_DESK_KEY } from "../adminNav";

export interface Tab {
  key: string;
  label: string;
  icon: ({ ...props }: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  component: React.ComponentType;
}

const itemClass = (active: boolean) =>
  `flex items-center justify-center py-3 gap-2 font-medium cursor-pointer ${
    active ? "bg-secondary" : "bg-white hover:text-primary"
  }`;

/**
 * Sidebar shared by every admin page. Tabs link to /dashboard?tab=…; on the
 * dashboard itself `onTabChange` switches tabs in place instead.
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
        aria-label="Admin"
        className={`h-screen w-64 lg:w-1/6 fixed z-40 transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="bg-primary flex flex-col relative h-screen overflow-y-auto">
          <div className="h-[76px] shrink-0 border-b border-[#edf2f7] bg-white px-4 text-primary flex justify-center items-center py-4">
            <Logo />
          </div>

          <div className="flex flex-col gap-4 px-6 py-8">
            {ADMIN_TABS.map((tab) => {
              const active = currentTab === tab.key;
              const content = (
                <>
                  <tab.icon />
                  <span>{tab.label}</span>
                </>
              );
              return onTabChange ? (
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
                  href={`/dashboard?tab=${tab.key}`}
                  aria-current={active ? "page" : undefined}
                  onClick={onCloseMobile}
                  className={itemClass(active)}
                >
                  {content}
                </Link>
              );
            })}

            <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 text-center">
              Desks
            </p>
            <Link
              href="/bag-check"
              aria-current={currentTab === BAG_DESK_KEY ? "page" : undefined}
              onClick={onCloseMobile}
              className={itemClass(currentTab === BAG_DESK_KEY)}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span>Exit bag desk</span>
            </Link>
            <Link href="/check-in?staff=1" onClick={onCloseMobile} className={itemClass(false)}>
              <UserPlus className="h-5 w-5" />
              <span>Override check-in</span>
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-4 flex bg-white hover:bg-secondary justify-center py-3 gap-2 font-medium cursor-pointer"
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
