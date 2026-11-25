"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import DashboardNav, { Tab } from "../shared/components/DashboardNav";
import { useAuthStore } from "../shared/stores/authStore";
import { useUIStore } from "../shared/stores/uiStore";
import {
  DashboardIcon,
  FileSpreadsheetIcon,
  ReportIcon,
  TableChartIcon,
} from "../shared/components/Icons";
import {
  useCurrentProfile,
  useCurrentUser,
  useLogout,
} from "../shared/hooks/useAuth";

const Sessions = dynamic(() => import("./Sessions"), {
  loading: () => <p>Loading Sessions...</p>,
});

const Dashboard = dynamic(() => import("./Dashboard"), {
  loading: () => <p>Loading dashboard...</p>,
});

const BagCheck = dynamic(() => import("./BagCheck"), {
  loading: () => <p>Loading bag check...</p>,
});

const Report = dynamic(() => import("./Report"), {
  loading: () => <p>Loading services...</p>,
});

const getAllTabs = (userRole: string): Tab[] => {
  const allTabs: Tab[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      component: Dashboard,
      icon: TableChartIcon,
    },
    {
      key: "Sessions",
      label: "Sessions",
      component: Sessions,
      icon: FileSpreadsheetIcon,
    },

    {
      key: "bagCheck",
      label: "Bag Check",
      component: BagCheck,
      icon: ReportIcon,
    },
    { key: "report", label: "Report", component: Report, icon: ReportIcon },
  ];

  // Only show Users tab for admin
  // if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
  //   allTabs.push({ key: "users", label: "Users", component: Users });
  //   allTabs.push({ key: "settings", label: "Settings", component: Settings });
  //   allTabs.push({ key: "store", label: "Credit Store", component: Store });
  // }

  return allTabs;
};

const defaultTabs: Tab[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    component: Dashboard,
    icon: TableChartIcon,
  },
  {
    key: "Sessions",
    label: "Sessions",
    component: Sessions,
    icon: FileSpreadsheetIcon,
  },

  {
    key: "bagCheck",
    label: "Bag Check",
    component: BagCheck,
    icon: ReportIcon,
  },
  { key: "report", label: "Report", component: Report, icon: ReportIcon },
];

export function DashboardContent() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const { logout, isLoggingOut } = useLogout();

  const isLoading = userLoading || profileLoading;
  const isAuthenticated = !!user;

  // const tabs = user ? getAllTabs(user.role) : defaultTabs;
  const tabs = defaultTabs;
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { currentTab: storedTab, setCurrentTab, updateFilters } = useUIStore();
  const [currentTabKey, setCurrentTabKey] = useState("Sessions");

  const currentTab: Tab =
    tabs.find((t) => t.key === searchParams?.get("tab")) || tabs[0];
  const ActiveComponent = currentTab.component || Sessions;

  useEffect(() => {
    const urlTab = searchParams?.get("tab");
    let newTab = urlTab || storedTab || "Sessions";

    const tabExists = tabs.some((t) => t.key === newTab);
    if (!tabExists) {
      newTab = "Sessions";
    }

    if (newTab !== currentTabKey) {
      setCurrentTabKey(newTab);
    }

    if (newTab !== storedTab) {
      setCurrentTab(newTab);
    }

    if (!urlTab && newTab !== "Sessions") {
      router.replace(`?tab=${newTab}`, { scroll: false });
    } else if (urlTab && urlTab !== newTab) {
      router.replace(`?tab=${newTab}`, { scroll: false });
    }
  }, [searchParams, storedTab, tabs]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const setTab = (newTab: string) => {
    setCurrentTabKey(newTab);
    setCurrentTab(newTab);
    updateFilters({ staffId: undefined });
    router.replace(`?tab=${newTab}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName =
    profile?.full_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Staff";

  const avatarUrl =
    profile?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    "";

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <DashboardNav
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        tabs={tabs}
        currentTab={currentTab.key}
        onTabChange={setTab}
      />
      <div className="w-full lg:w-5/6 lg:ml-auto h-full">
        <header className="h-[76px] border-b border-[#edf2f7] px-8 flex items-center justify-end bg-white shrink-0">
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative w-10 h-10 rounded-full bg-[#f4f5f8] flex items-center justify-center text-[#5a607f] hover:bg-gray-100 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#ff3b30] rounded-full ring-2 ring-white" />
            </button>

            {/* Settings Gear */}
            <button className="w-10 h-10 rounded-full bg-[#f4f5f8] flex items-center justify-center text-[#5a607f] hover:bg-gray-100 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-[#edf2f7]">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-[#2d3748]">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#888ca0]">
                  {profile?.user_type ?? "Staff"}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-gray-100">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#5a607f]">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                disabled={isLoggingOut}
                className="ml-2 rounded-[4px] border border-[#e2e8f0] px-3 h-9 text-xs font-semibold text-[#4a5568] hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </header>
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
