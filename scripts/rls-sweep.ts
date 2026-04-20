#!/usr/bin/env tsx
// grantiq/scripts/rls-sweep.ts
//
// RLS Sweep Agent — scans all /api/ routes for the org_members RLS
// chicken-and-egg pattern. Flags routes that query org_members via the
// user-scoped supabase client (subject to broken RLS) rather than the
// admin client.
//
// Reference fix commits: 28425fd (pipeline route), de78104 (writing
// routes). Pattern: swap `supabase.from("org_members")...` for
// `createAdminClient().from("org_members")...` with JWT-verified user.id.
//
// Exit code:
//   0 = clean — no bugs found
//   1 = bugs found — printed to stdout for CI to surface on the PR
//
// Usage:
//   npx tsx scripts/rls-sweep.ts            # scan entire /api/ tree
//   npx tsx scripts/rls-sweep.ts --changed  # scan only changed files (PR mode)
//   npx tsx scripts/rls-sweep.ts --json     # machine-readable output

import { promises as fs } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

interface Finding {
  file: string;
  line: number;
  pattern: string;
  severity: "bug" | "suspect" | "clean";
  suggestion: string;
}

const API_ROOT = path.resolve(process.cwd(), "src/app/api");
const APP_PAGES_ROOT = path.resolve(process.cwd(), "src/app/(app)");
const KNOWN_PATCHED_MARKER = /createAdminClient\(\)/; // if this appears in the file, the admin-bypass pattern is in use somewhere

// Tables whose RLS policy depends on public.user_org_ids() — the
// chicken-and-egg of which bit this session 4 times. Any user-scoped
// query on these is a bug. Derived from migration 00057 + original 00010.
const RLS_GATED_TABLES = new Set([
  "org_members", "organizations", "org_profiles", "org_capabilities",
  "grant_matches", "grant_match_feedback", "match_feedback",
  "funding_roadmaps", "readiness_scores",
  "grant_pipeline", "grant_outcomes", "grant_scorecards",
  "grant_sources", // many queries on grant_sources happen after membership check
  "org_grant_history", "narrative_segments",
  "ai_generations", "document_vault", "ai_usage",
  "user_events", "search_queries", "notifications_log",
  "notification_preferences",
  "subscriptions", "success_fee_invoices", "lead_intents",
  "match_cache", "outcome_check_ins",
  "grant_drafts", "grant_rfp_analyses", "grant_lois",
  "section_audits", "match_kills", "draft_quality_scores",
]);

// Generic pattern: any .from("<table>") — we then check whether the
// table is RLS-gated AND whether the client is user-scoped supabase.
const FROM_PATTERN = /\.from\(['"]([a-z_]+)['"]\)/g;

// Walk /api/ recursively, collect route.ts files
async function walkApi(dir: string, found: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkApi(p, found);
    } else if (e.isFile() && (e.name === "route.ts" || e.name === "route.tsx")) {
      found.push(p);
    }
  }
  return found;
}

// Walk app pages (server components that render — same RLS bug applies)
async function walkPages(dir: string, found: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkPages(p, found);
    } else if (e.isFile() && e.name === "page.tsx") {
      found.push(p);
    }
  }
  return found;
}

async function getChangedFiles(): Promise<string[]> {
  try {
    const out = execSync("git diff --name-only origin/master...HEAD", {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .filter(
        (f) =>
          (f.startsWith("src/app/api/") &&
            (f.endsWith("route.ts") || f.endsWith("route.tsx"))) ||
          (f.startsWith("src/app/(app)/") && f.endsWith("page.tsx"))
      )
      .map((f) => path.resolve(process.cwd(), f));
  } catch {
    // Fallback: if diff fails (e.g., first commit), return empty
    return [];
  }
}

async function analyzeFile(file: string): Promise<Finding[]> {
  const content = await fs.readFile(file, "utf8");
  const findings: Finding[] = [];

  // Fast filter: does this file reference any RLS-gated table at all?
  let referencesAny = false;
  for (const t of RLS_GATED_TABLES) {
    if (content.includes(`"${t}"`) || content.includes(`'${t}'`)) {
      referencesAny = true;
      break;
    }
  }
  if (!referencesAny) return findings;

  // For each .from("<table>") call, determine:
  //   1. Is the table RLS-gated?
  //   2. Is the client the user-scoped `supabase` (bug) or admin (ok)?
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    FROM_PATTERN.lastIndex = 0; // reset regex state

    let m: RegExpExecArray | null;
    while ((m = FROM_PATTERN.exec(line)) !== null) {
      const tableName = m[1];
      if (!RLS_GATED_TABLES.has(tableName)) continue;

      // Find the client name on this line or the line(s) before
      // (handles dotted chains where .from is on its own line).
      const sameLineClient = line
        .slice(0, m.index)
        .match(/(\w+)\s*\.\s*$/);
      let clientName = sameLineClient ? sameLineClient[1] : null;
      if (!clientName && i > 0) {
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prev = lines[j].trimEnd();
          if (prev.length === 0) continue;
          const chain = prev.match(/(\w+)\s*$/);
          if (chain) {
            clientName = chain[1];
            break;
          }
        }
      }

      if (clientName === "supabase") {
        findings.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          pattern: `user-scoped supabase.from('${tableName}')`,
          severity: "bug",
          suggestion: `Table '${tableName}' is RLS-gated. Swap to createAdminClient(). user.id is JWT-verified via auth.getUser() so scoping by it is safe. See commits 28425fd, de78104, 30a1850.`,
        });
      }
    }
  }

  // If the file has the bug pattern but ALSO has createAdminClient somewhere,
  // it might be partially patched. Mark that as "suspect" rather than "bug".
  if (findings.length > 0 && KNOWN_PATCHED_MARKER.test(content)) {
    for (const f of findings) {
      f.severity = "suspect";
      f.suggestion =
        "File already uses createAdminClient elsewhere — this specific org_members lookup may have been missed during a partial patch. " +
        f.suggestion;
    }
  }

  return findings;
}

async function main() {
  const args = process.argv.slice(2);
  const changedOnly = args.includes("--changed");
  const jsonMode = args.includes("--json");

  let files: string[];
  if (changedOnly) {
    files = await getChangedFiles();
    if (files.length === 0) {
      if (!jsonMode) console.log("No changed route.ts/page.tsx files in this PR — nothing to scan.");
      process.exit(0);
    }
  } else {
    const apiFiles = await walkApi(API_ROOT);
    const pageFiles = await walkPages(APP_PAGES_ROOT);
    files = [...apiFiles, ...pageFiles];
  }

  const allFindings: Finding[] = [];
  for (const f of files) {
    const findings = await analyzeFile(f);
    allFindings.push(...findings);
  }

  if (jsonMode) {
    console.log(JSON.stringify({ findings: allFindings, scanned_files: files.length }, null, 2));
    process.exit(allFindings.some((f) => f.severity === "bug") ? 1 : 0);
  }

  // Human-readable output
  console.log("\n=== RLS Sweep Report ===");
  console.log(`Scanned: ${files.length} route file(s)`);

  if (allFindings.length === 0) {
    console.log("✅ CLEAN — no RLS chicken-and-egg bugs found.");
    process.exit(0);
  }

  const bugs = allFindings.filter((f) => f.severity === "bug");
  const suspects = allFindings.filter((f) => f.severity === "suspect");

  if (bugs.length > 0) {
    console.log(`\n❌ ${bugs.length} BUG(S) FOUND:\n`);
    for (const b of bugs) {
      console.log(`  ${b.file}:${b.line}`);
      console.log(`    Pattern: ${b.pattern}`);
      console.log(`    Fix: ${b.suggestion}\n`);
    }
  }

  if (suspects.length > 0) {
    console.log(`\n⚠ ${suspects.length} SUSPECT(S) (partially patched?):\n`);
    for (const s of suspects) {
      console.log(`  ${s.file}:${s.line}`);
      console.log(`    Pattern: ${s.pattern}`);
      console.log(`    Note: ${s.suggestion}\n`);
    }
  }

  console.log(`\nReference fix commits: 28425fd (pipeline), de78104 (writing routes), 4b119ba+ (all subsequent).`);
  console.log(`Reference pattern in use: src/app/api/pipeline/route.ts (look for createAdminClient + JWT-verified user.id).`);

  // Bugs fail the check; suspects warn but don't fail CI
  process.exit(bugs.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("rls-sweep failed:", err);
  process.exit(2);
});
