import type { AccessMode } from "@/lib/site-sections";

export type Viewer = "owner" | "passcode" | "anonymous";

/** Can this kind of viewer see a section in this mode? */
export function canView(mode: AccessMode, viewer: Viewer): boolean {
  if (mode === "public" || viewer === "owner") return true;
  return mode === "passcode" && viewer === "passcode";
}
