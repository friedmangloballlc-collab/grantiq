"use client";

import { createContext, useContext } from "react";

export interface OrgContext {
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "editor" | "viewer";
  tier: "free" | "starter" | "pro" | "enterprise";
}

const OrgCtx = createContext<OrgContext | null>(null);
export const OrgProvider = OrgCtx.Provider;

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
