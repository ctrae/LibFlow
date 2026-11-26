"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Tab } from "../shared/components/DashboardNav";
import AdminShell from "../shared/components/AdminShell";
import { ADMIN_TABS } from "../shared/adminNav";
import { useUIStore } from "../shared/stores/uiStore";

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
  loading: () => <p>Loading reports...</p>,
});

const COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  Sessions,
  bagCheck: BagCheck,
  report: Report,
};

const tabs: Tab[] = ADMIN_TABS.map((t) => ({ ...t, component: COMPONENTS[t.key] }));

/** Tabs that render inside /dashboard (Report has its own page). */
const inPageTabs = tabs.filter((t) => !t.href);

export function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTab: storedTab, setCurrentTab, updateFilters } = useUIStore();
  const [currentTabKey, setCurrentTabKey] = useState("Sessions");

  const currentTab: Tab =
    tabs.find((t) => t.key === searchParams?.get("tab")) || tabs[0];
  const ActiveComponent = currentTab.component || Sessions;

  useEffect(() => {
    const urlTab = searchParams?.get("tab");

    // ?tab=report (old links/bookmarks) → its own page.
    const linked = tabs.find((t) => t.key === urlTab && t.href);
    if (linked?.href) {
      router.replace(linked.href);
      return;
    }

    let newTab = urlTab || storedTab || "Sessions";
    if (!inPageTabs.some((t) => t.key === newTab)) {
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
  }, [searchParams, storedTab]);

  const setTab = (newTab: string) => {
    setCurrentTabKey(newTab);
    setCurrentTab(newTab);
    updateFilters({ staffId: undefined });
    router.replace(`?tab=${newTab}`, { scroll: false });
  };

  return (
    <AdminShell currentTab={currentTab.key} onTabChange={setTab}>
      <ActiveComponent />
    </AdminShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
