import { redirect } from "next/navigation";

// The logo links here; staff land on the dashboard (which sends
// signed-out visitors to /login).
export default function Home() {
  redirect("/dashboard");
}
