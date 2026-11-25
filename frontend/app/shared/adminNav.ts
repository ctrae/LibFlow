import { FileSpreadsheetIcon, ReportIcon, TableChartIcon } from "./components/Icons";

export type NavIcon = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;

/** Tabs of /dashboard, in sidebar order. Keys are the `?tab=` values. */
export const ADMIN_TABS: { key: string; label: string; icon: NavIcon }[] = [
  { key: "dashboard", label: "Dashboard", icon: TableChartIcon },
  { key: "Sessions", label: "Sessions", icon: FileSpreadsheetIcon },
  { key: "bagCheck", label: "Bag Check", icon: ReportIcon },
  { key: "report", label: "Report", icon: ReportIcon },
];

/** Key the sidebar highlights on the standalone /bag-check page. */
export const BAG_DESK_KEY = "bagDesk";
