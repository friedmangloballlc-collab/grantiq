import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// In-memory rate limiter: track request counts per IP within a window
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 20; // requests per window
const ipMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Industry slug → grant category keyword mapping
const INDUSTRY_CATEGORY_MAP: Record<string, string[]> = {
  "healthcare": ["health", "medical", "mental health", "public health"],
  "education": ["education", "literacy", "STEM", "scholarship"],
  "arts-culture": ["arts", "culture", "humanities", "creative"],
  "environment": ["environment", "climate", "conservation", "energy"],
  "technology": ["technology", "innovation", "digital", "STEM"],
  "housing": ["housing", "community development", "affordable", "homelessness"],
  "workforce": ["workforce", "employment", "job training", "economic"],
  "youth": ["youth", "children", "families", "after-school"],
  "veterans": ["veterans", "military", "service members"],
  "human-services": ["human services", "social services", "food security", "poverty"],
  "food-agriculture": ["food", "agriculture", "nutrition", "farming"],
  "public-safety": ["public safety", "justice", "crime prevention", "emergency"],
  "research": ["research", "science", "academic", "innovation"],
};

export async function POST(req: NextRequest) {
  // Rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a moment." },
      {
        status: 429,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Retry-After": "60",
        },
      }
    );
  }

  let body: { entity_type?: string; industry?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { entity_type, industry, state } = body;

  const supabase = createAdminClient();

  let query = supabase
    .from("grant_sources")
    .select("amount_max, category", { count: "exact" })
    .eq("is_active", true);

  // Filter by entity/eligibility type
  if (entity_type) {
    if (entity_type.includes("nonprofit")) {
      query = query.contains("eligibility_types", ["nonprofit"]);
    } else if (entity_type === "llc" || entity_type === "corporation" || entity_type === "sole_prop") {
      query = query.contains("eligibility_types", ["small_business"]);
    }
  }

  // Filter by state (include national grants with empty states array)
  if (state) {
    query = query.or(`states.cs.{${state}},states.eq.{}`);
  }

  const { data: grants, count } = await query.limit(500);

  const rows = grants ?? [];

  // Estimate total funding
  const totalFunding = rows.reduce((sum, g) => sum + (g.amount_max ?? 50_000), 0);

  // Build top categories — optionally filter by industry keywords
  const categoryCounts: Record<string, number> = {};
  for (const g of rows) {
    const cat = g.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  let topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));

  // If industry provided, try to surface relevant keywords in label ordering
  if (industry && INDUSTRY_CATEGORY_MAP[industry]) {
    const keywords = INDUSTRY_CATEGORY_MAP[industry].map((k) => k.toLowerCase());
    topCategories = topCategories.sort((a, b) => {
      const aMatch = keywords.some((k) => a.category.toLowerCase().includes(k)) ? -1 : 0;
      const bMatch = keywords.some((k) => b.category.toLowerCase().includes(k)) ? -1 : 0;
      return aMatch - bMatch;
    });
  }

  const matchCount = count ?? rows.length;

  return NextResponse.json(
    {
      matchCount,
      estimatedFunding: Math.min(totalFunding, matchCount * 75_000),
      topCategories,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

// Preflight for cross-origin iframe requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
