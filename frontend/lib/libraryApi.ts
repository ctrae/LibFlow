import { getOccupancy } from "./api";

export async function getCurrentOccupancy(): Promise<number> {
  return getOccupancy();
}