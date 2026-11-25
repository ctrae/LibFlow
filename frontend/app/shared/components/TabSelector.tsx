import Button from "./Button";

export default function TabSelector({
  tabs,
  selectedTab,
  setSelectedTab,
}: {
  tabs: string[];
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
}) {
  return (
    <div className="flex gap-4 flex-col sm:flex-row sm:flex-wrap">
      {tabs.map((tab) => (
        <Button
          key={tab}
          onClick={() => setSelectedTab(tab)}
          text={tab}
          variant="none"
          className={`bg-background-white border ${selectedTab === tab ? "border-primary dark:border-white" : "border-gray-300 dark:border-gray-800"}`}
        />
      ))}
    </div>
  );
}
