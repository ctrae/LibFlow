import { Link, Outlet } from "react-router-dom";

export default function OperationsPage() {
  return (
    <div>
      <nav>
        <Link to="/live-sessions">Live</Link> |{" "}
        <Link to="/analytics">Analytics</Link> |{" "}
        <Link to="/bag-checks">Bag checks</Link>
      </nav>
      <Outlet />
    </div>
  );
}