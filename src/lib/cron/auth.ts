// src/lib/cron/auth.ts
//
// Shared authorization for scheduled cron routes.
//
// HISTORY: prior to 2026-04-21, each cron route had a local
// isAuthorized() that checked the wrong header name
// (`x-vercel-cron-secret`). Vercel Pro Cron actually sends an
// `Authorization: Bearer ${CRON_SECRET}` header — documented here:
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
//
// The old header name was either never correct or comes from an
// older/beta version of Vercel's cron API. Either way, it meant
// Vercel's scheduled calls silently returned 401 and no cron ran.
// We caught this via the heartbeat table (migration 00067) showing
// the 10 rows of "never run" + the 401s in Vercel's Logs tab.
//
// This helper accepts THREE valid auth paths:
//   1. Authorization: Bearer ${CRON_SECRET}  — Vercel's current docs
//   2. Authorization: Bearer ${ADMIN_SECRET} — manual admin triggers
//      from /api/admin/ingest-trigger and from curl-based debugging
//   3. x-vercel-cron-secret: ${CRON_SECRET}  — preserved for safety
//      in case Vercel ever sends this header; does not hurt to keep
//
// We read env vars inside the function (not at module load) so that
// if an env var is added post-deploy it picks up on the next request
// without needing a fresh cold start.

import type { NextRequest } from "next/server";

export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true;

  // Legacy check — kept for defense-in-depth. Harmless if Vercel
  // ever starts sending this header.
  const legacyHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && legacyHeader === cronSecret) return true;

  return false;
}
