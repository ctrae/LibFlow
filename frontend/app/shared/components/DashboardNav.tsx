"use client";

import { useEffect, useState } from "react";
import IconButton from "./IconButton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Logo } from "./Logo";
import { useLogout } from "../hooks/useAuth";
import { camelCaseToLabel } from "../util/camelCaseToLabel";
import { LogOutIcon } from "./Icons";

export interface Tab {
  key: string;
  label: string;
  icon: ({ ...props }: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  component: React.ComponentType<any>;
}

function NavTabs({
  currentTab,
  tabs,
  onTabChange,
}: {
  currentTab: string;
  tabs: Tab[];
  onTabChange: (tab: string) => void;
}) {
  return tabs.map((tab, index) => (
    <button
      key={tab.key}
      onClick={() => onTabChange(tab.key)}
      className={`flex justify-center py-3 gap-2 font-medium cursor-pointer ${
        currentTab === tab.key
          ? "bg-secondary bg-secondary"
          : "bg-white hover:bg-white hover:text-primary"
      }`}
    >
      <tab.icon />
      <span>{camelCaseToLabel(tab.key)}</span>
    </button>
  ));
}

export default function DashboardNav({
  mobileOpen = false,
  onCloseMobile,
  tabs,
  currentTab,
  onTabChange,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  tabs: Tab[];
  currentTab: string;
  onTabChange: (tab: string) => void;
}) {
  const { logout } = useLogout();
  const router = useRouter();
  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <div
        className={`h-screen w-64 lg:w-1/6 fixed z-40 transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="bg-primary flex flex-col space-y-8 relative h-screen">
          <div className="h-[76px] border-b border-[#edf2f7] bg-white px-4 text-primary flex justify-center items-center py-4">
            {" "}
            <Logo />
          </div>
          <div className="flex flex-col space-y-8 z-2 px-8">
            <NavTabs
              onTabChange={onTabChange}
              tabs={tabs}
              currentTab={currentTab}
            />
            <Link
              href="/check-in?staff=1"
              onClick={onCloseMobile}
              className="flex items-center justify-center py-3 gap-2 font-medium cursor-pointer bg-white hover:text-primary"
            >
              <UserPlus className="h-5 w-5" />
              <span>Override check-in</span>
            </Link>
            <button
              onClick={() => handleLogout()}
              className={`flex bg-white hover:bg-secondary justify-center py-3 gap-2 font-medium cursor-pointer `}
            >
              <LogOutIcon />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
