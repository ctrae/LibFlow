import { useEffect, useState } from "react";
import { getCurrentOccupancy } from "../../lib/libraryApi";

export default function LiveSessions() {
  const [occupancy, setOccupancy] = useState<number | null>(null);

  useEffect(() => {
    async function loadOccupancy() {
      try {
        const currentOccupancy = await getCurrentOccupancy();
        setOccupancy(currentOccupancy);
      } catch (error) {
        console.error("Failed to load occupancy:", error);
      }
    }

    console.log("Polling started");

    // Initial load
    loadOccupancy();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      console.log("Polling occupancy...");
      loadOccupancy();
    }, 5000);

    return () => {
      console.log("Polling stopped");
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <h1>Live Sessions</h1>
      <p>Current Occupancy: {occupancy ?? "Loading..."}</p>
    </div>
  );
}