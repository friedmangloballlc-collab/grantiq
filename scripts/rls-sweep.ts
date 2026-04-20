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
const KNOWN_PATCHED_MARKER = /createAdminClient\(\)/; // if this appears in the file, the admin-bypass pattern is in use somewhere

// The telltale of the bug: user-scoped supabase client doing a
// .from("org_members") lookup. Current line must contain .from(
// (not just be in a chunk that eventually does) — prevents
// double-reporting neighboring lines in the same statement.
const BUG_PATTERN = /\.from\(['"]org_members['"]\)/;
// Used to confirm the surrounding context includes `supabase.` (the
// user-scoped client) and not `admin.` / `adminAuth.` (patched).
const USER_SCOPED_PATTERN = /(^|\s|\()supabase\s*\.?\s*$/;

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

async function getChangedFiles(): Promise<string[]> {
  try {
    const out = execSync("git diff --name-only origin/master...HEAD", {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .filter((f) => f.startsWith("src/app/api/") && (f.endsWith("route.ts") || f.endsWith("route.tsx")))
      .map((f) => path.resolve(process.cwd(), f));
  } catch {
    // Fallback: if diff fails (e.g., first commit), return empty
    return [];
  }
}

async function analyzeFile(file: string): Promise<Finding[]> {
  const content = await fs.readFile(file, "utf8");
  const findings: Finding[] = [];

  // Does the file reference org_members at all?
  if (!content.includes('"org_members"') && !content.includes("'org_members'")) {
    return findings; // not relevant
  }

  // Match the user-scoped-client pattern. Only flag when:
  //   1. This line contains `.from("org_members")`
  //   2. The previous line (or same line) ends with `supabase.` or `supabase\n`
  //      (meaning it's the user-scoped client, not admin)
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!BUG_PATTERN.test(line)) continue;

    // Walk back to find the client name on the same or previous line.
    // A line like `  .from("org_members")` — previous line is the client.
    // A line like `supabase.from("org_members")` — client is on the same line.
    const sameLineClient = line.match(/(\w+)\s*\.from\(['"]org_members['"]\)/);
    let clientName = sameLineClient ? sameLineClient[1] : null;
    if (!clientName && i > 0) {
      // Dotted chain: previous non-empty line ends with the client name
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = lines[j].trimEnd();
        if (prev.length === 0) continue;
        const m = prev.match(/(\w+)\s*$/);
        if (m) {
          clientName = m[1];
          break;
        }
      }
    }

    // Flag only if the client is the user-scoped `supabase`
    if (clientName === "supabase") {
      const relativePath = path.relative(process.cwd(), file);
      findings.push({
        file: relativePath,
        line: i + 1,
        pattern: "user-scoped supabase.from('org_members')",
        severity: "bug",
        suggestion:
          "Replace with `const adminAuth = createAdminClient(); adminAuth.from('org_members')...`. user.id is JWT-verified via auth.getUser() so scoping by it is safe. See commits 28425fd + de78104 for the pattern.",
      });
    }
  }

  void USER_SCOPED_PATTERN; // reserved for future enhancement

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
      if (!jsonMode) console.log("No changed route.ts files in this PR — nothing to scan.");
      process.exit(0);
    }
  } else {
    files = await walkApi(API_ROOT);
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
