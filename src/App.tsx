import { BrowserRouter, Routes, Route } from "react-router-dom";
import StudentPortal from "./pages/StudentPortal";
import OverrideDashboard from "./pages/OverrideDashboard";
import OperationsPage from "./pages/OperationsPage";
import LiveSessions from "./pages/operations/LiveSessions";
import Analytics from "./pages/operations/Analytics";
import BagChecks from "./pages/operations/BagChecks";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentPortal />} />
        <Route path="/override" element={<OverrideDashboard />} />
        <Route element={<OperationsPage />}>
          <Route path="/live-sessions" element={<LiveSessions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/bag-checks" element={<BagChecks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}