"use client";

import { ClubMap } from "./ClubMap";
import type { Club } from "@/lib/types";

/** A single-club map. Client boundary kept to exactly this. */
export function ClubMapPanel({ club }: { club: Club }) {
  return <ClubMap clubs={[club]} className="h-64 w-full" />;
}
