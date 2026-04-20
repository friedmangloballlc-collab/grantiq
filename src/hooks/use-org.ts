"use client";

import { createContext, useContext } from "react";

export interface OrgOption {
  orgId: string;
  orgName: string;
}

export interface OrgContext {
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "editor" | "viewer";
  tier: "free" | "starter" | "pro" | "growth" | "enterprise";
  userId: string;
  /** Authenticated user's email — used for admin gate */
  email?: string;
  /** Server-resolved admin flag (matches ADMIN_EMAILS env). Lets the
   * client UI skip paywalls/tier gates without re-implementing the
   * env-var check; the server is still the actual enforcement boundary. */
  isAdmin: boolean;
  /** All orgs the user belongs to — used by the org switcher */
  allOrgs: OrgOption[];
}

const OrgCtx = createContext<OrgContext | null>(null);
export const OrgProvider = OrgCtx.Provider;

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
