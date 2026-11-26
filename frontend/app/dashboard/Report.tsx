"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reports live on the Analytics page. The dashboard can still land on this
 * tab (for example from a remembered tab or a ?tab=report URL), so send the
 * user there instead of showing an empty placeholder.
 */
export default function Report() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/analytics");
  }, [router]);

  return <p className="p-6 text-gray-600">Opening reports...</p>;
}
