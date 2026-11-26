import { FileSpreadsheetIcon, ReportIcon, TableChartIcon } from "./components/Icons";

export type NavIcon = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;

export interface AdminTab {
  key: string;
  label: string;
  icon: NavIcon;
  /** When set, the tab opens this page instead of a /dashboard tab. */
  href?: string;
}

/** Sidebar tabs shared by every staff page, in order. Keys are the `?tab=` values. */
export const ADMIN_TABS: AdminTab[] = [
  { key: "dashboard", label: "Dashboard", icon: TableChartIcon },
  { key: "Sessions", label: "Sessions", icon: FileSpreadsheetIcon },
  { key: "bagCheck", label: "Bag Check", icon: ReportIcon },
  { key: "report", label: "Report", icon: ReportIcon, href: "/analytics" },
];
