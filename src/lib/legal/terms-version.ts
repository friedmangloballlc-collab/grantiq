// src/lib/legal/terms-version.ts
//
// Single source of truth for the current Terms of Service version.
// Bump this string whenever the /terms page is updated in a way
// that would materially affect a customer's rights or obligations.
//
// The version string is stored on every user's terms_accepted_at
// record. If a customer later disputes a clause, we produce (1)
// the timestamp, (2) the version they accepted, (3) the content
// of that version from git history. This is the clickwrap
// enforceability triangle (Meyer v. Uber).
//
// Format: YYYY-MM-DD-N where N is a counter for multiple versions
// shipped on the same day. Always use ISO dates.

export const CURRENT_TERMS_VERSION = "2026-04-22-v2";

// The user-visible label that appears next to the checkbox.
// Keep this in sync with what the /terms page says at the top.
export const CURRENT_TERMS_LABEL = "Effective April 22, 2026";
