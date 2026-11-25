import { getOccupancy } from "./api";

// Staff data access goes through ./api.ts (FastAPI backend). The old
// helpers here read the legacy `users` table and called
// /library/admin/bag-claims endpoints that the backend does not provide.

export async function getCurrentOccupancy(): Promise<number> {
  return getOccupancy();
}
