/**
 * Seeds the grant_source_directory table with all known grant sources.
 * Checks for duplicates against existing entries before inserting.
 *
 * Usage: npx tsx scripts/seed-grant-directory.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DirectoryEntry {
  name: string;
  organization: string;
  category: string;
  subcategory?: string;
  website?: string;
  annual_budget?: string;
  focus_areas?: string[];
  key_programs?: string[];
  geographic_focus?: string;
  grant_range?: string;
  eligibility_notes?: string;
  accepts_unsolicited?: boolean;
  has_api?: boolean;
  api_url?: string;
  ingestion_status?: string;
  priority?: number;
  notes?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// FEDERAL AGENCIES
// ────────────────────────────────────────────────────────────────────────────
const FEDERAL: DirectoryEntry[] = [
  { name: "HHS Grants", organization: "Dept of Health & Human Services", category: "federal_agency", website: "hhs.gov/grants", annual_budget: "$500B+", focus_areas: ["health", "human services", "research"], key_programs: ["NIH", "CDC", "HRSA", "ACF", "SAMHSA"], ingestion_status: "automated", has_api: true, api_url: "grants.gov", priority: 1 },
  { name: "NIH Grants & Funding", organization: "National Institutes of Health", category: "federal_agency", website: "grants.nih.gov", annual_budget: "$45B+", focus_areas: ["biomedical research", "public health"], key_programs: ["R01", "R21", "R03", "K awards"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "CDC Funding", organization: "Centers for Disease Control", category: "federal_agency", website: "cdc.gov/funding", annual_budget: "$8B+", focus_areas: ["public health", "disease prevention"], key_programs: ["prevention programs", "preparedness"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "HRSA Grants", organization: "Health Resources & Services Admin", category: "federal_agency", website: "hrsa.gov/grants", annual_budget: "$13B+", focus_areas: ["healthcare access", "workforce", "rural health"], key_programs: ["health centers", "maternal health"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "SAMHSA Grants", organization: "Substance Abuse & Mental Health", category: "federal_agency", website: "samhsa.gov/grants", annual_budget: "$6B+", focus_areas: ["mental health", "substance abuse"], key_programs: ["block grants", "discretionary"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "ACF Grants", organization: "Admin for Children & Families", category: "federal_agency", website: "acf.hhs.gov/grants", annual_budget: "$60B+", focus_areas: ["children", "families", "economic security"], key_programs: ["Head Start", "TANF", "child welfare"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "ED Grants", organization: "Dept of Education", category: "federal_agency", website: "ed.gov/fund/grants-apply.html", annual_budget: "$70B+", focus_areas: ["K-12", "higher ed", "special education"], key_programs: ["Title I", "IDEA", "Pell"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "NSF Funding", organization: "National Science Foundation", category: "federal_agency", website: "nsf.gov/funding", annual_budget: "$9B+", focus_areas: ["science", "engineering", "STEM"], key_programs: ["research grants", "CAREER"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "USDA Grants & Loans", organization: "Dept of Agriculture", category: "federal_agency", website: "usda.gov/topics/farming/grants-and-loans", annual_budget: "$30B+", focus_areas: ["agriculture", "food", "rural"], key_programs: ["SNAP", "rural grants", "conservation"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "EPA Grants", organization: "Environmental Protection Agency", category: "federal_agency", website: "epa.gov/grants", annual_budget: "$4B+", focus_areas: ["environment", "clean water", "air"], key_programs: ["Brownfields", "environmental justice"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "HUD Programs", organization: "Dept of Housing & Urban Dev", category: "federal_agency", website: "hud.gov", annual_budget: "$60B+", focus_areas: ["housing", "community development", "homelessness"], key_programs: ["CDBG", "HOME", "CoC"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "DOJ Funding", organization: "Dept of Justice / OJP", category: "federal_agency", website: "ojp.gov/funding", annual_budget: "$4B+", focus_areas: ["justice", "crime prevention", "victims"], key_programs: ["BJA", "OJJDP", "OVW"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "DOL Grants", organization: "Dept of Labor / ETA", category: "federal_agency", website: "dol.gov/agencies/eta/grants", annual_budget: "$12B+", focus_areas: ["workforce", "job training", "apprenticeship"], key_programs: ["WIOA", "apprenticeship", "YouthBuild"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "DOE Funding", organization: "Dept of Energy", category: "federal_agency", website: "energy.gov/eere/funding-opportunities", annual_budget: "$3B+", focus_areas: ["energy research", "efficiency", "renewables"], key_programs: ["ARPA-E", "EERE"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "DOT Grants", organization: "Dept of Transportation", category: "federal_agency", website: "transportation.gov/grants", annual_budget: "$80B+", focus_areas: ["transportation", "infrastructure", "safety"], key_programs: ["RAISE", "transit", "highway"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "DHS Grants", organization: "Dept of Homeland Security", category: "federal_agency", website: "dhs.gov/grants", annual_budget: "$3B+", focus_areas: ["homeland security", "emergency management"], key_programs: ["FEMA", "preparedness"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "FEMA Grants", organization: "Federal Emergency Management", category: "federal_agency", website: "fema.gov/grants", annual_budget: "$20B+", focus_areas: ["disaster relief", "preparedness", "mitigation"], key_programs: ["BRIC", "HMGP"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "SBA Programs", organization: "Small Business Administration", category: "federal_agency", website: "sba.gov/funding-programs/grants", annual_budget: "$1B+", focus_areas: ["small business", "disaster"], key_programs: ["SBIR admin", "disaster"], ingestion_status: "automated", has_api: true, priority: 1 },
  { name: "NEA Grants", organization: "National Endowment for the Arts", category: "federal_agency", website: "arts.gov/grants", annual_budget: "$170M+", focus_areas: ["arts", "culture"], key_programs: ["Art Works", "Challenge America"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "NEH Grants", organization: "National Endowment for Humanities", category: "federal_agency", website: "neh.gov/grants", annual_budget: "$170M+", focus_areas: ["humanities", "history", "culture"], key_programs: ["research", "preservation"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "IMLS Grants", organization: "Institute of Museum & Library Services", category: "federal_agency", website: "imls.gov/grants", annual_budget: "$280M+", focus_areas: ["museums", "libraries"], key_programs: ["museum grants", "LSTA"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "AmeriCorps Funding", organization: "AmeriCorps / CNCS", category: "federal_agency", website: "americorps.gov/funding-opportunity", annual_budget: "$1B+", focus_areas: ["national service", "volunteering"], key_programs: ["AmeriCorps", "VISTA", "Senior Corps"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "EDA Funding", organization: "Economic Development Admin", category: "federal_agency", website: "eda.gov/funding", annual_budget: "$500M+", focus_areas: ["economic development", "job creation"], key_programs: ["Public Works", "planning"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "NASA STEM", organization: "NASA", category: "federal_agency", website: "nasa.gov/stem", annual_budget: "$2B+", focus_areas: ["space", "STEM", "aeronautics"], key_programs: ["SBIR", "research"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "VA Grants", organization: "Dept of Veterans Affairs", category: "federal_agency", website: "va.gov", annual_budget: "$1B+", focus_areas: ["veterans", "research", "housing"], key_programs: ["research", "homeless vets"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "USAID", organization: "US Agency for International Dev", category: "federal_agency", website: "usaid.gov", annual_budget: "$20B+", focus_areas: ["international development", "humanitarian"], key_programs: ["development grants"], ingestion_status: "automated", has_api: true, priority: 4 },
  { name: "ARC Grants", organization: "Appalachian Regional Commission", category: "federal_agency", website: "arc.gov/grants", annual_budget: "$200M+", focus_areas: ["Appalachian economic development"], key_programs: ["POWER", "distressed counties"], ingestion_status: "planned", priority: 4 },
  { name: "NOAA Grants", organization: "National Oceanic & Atmospheric", category: "federal_agency", website: "noaa.gov", annual_budget: "$600M+", focus_areas: ["ocean", "coastal", "weather"], key_programs: ["Sea Grant"], ingestion_status: "automated", has_api: true, priority: 4 },
  { name: "Rural Development", organization: "USDA Rural Development", category: "federal_agency", website: "rd.usda.gov", annual_budget: "$40B+", focus_areas: ["rural infrastructure", "business", "housing"], key_programs: ["RBDG", "Community Facilities"], ingestion_status: "automated", has_api: true, priority: 2 },
  { name: "NIFA Grants", organization: "USDA NIFA", category: "federal_agency", website: "nifa.usda.gov/grants", annual_budget: "$1.8B+", focus_areas: ["agricultural research", "education"], key_programs: ["AFRI", "extension"], ingestion_status: "automated", has_api: true, priority: 3 },
  { name: "Commerce Grants", organization: "Dept of Commerce", category: "federal_agency", website: "commerce.gov/grants", annual_budget: "$2B+", focus_areas: ["economic development", "trade", "technology"], key_programs: ["EDA", "MBDA", "NIST"], ingestion_status: "automated", has_api: true, priority: 3 },
];

// ────────────────────────────────────────────────────────────────────────────
// SBIR/STTR PROGRAMS
// ────────────────────────────────────────────────────────────────────────────
const SBIR: DirectoryEntry[] = [
  { name: "SBIR/STTR Central Portal", organization: "SBA / Multi-Agency", category: "sbir_sttr", website: "sbir.gov", focus_areas: ["small business innovation"], key_programs: ["Phase I", "Phase II", "STTR"], grant_range: "$50K-$2M", ingestion_status: "planned", has_api: true, priority: 1, notes: "Covers all 11 agencies" },
  { name: "DOD SBIR/STTR", organization: "Dept of Defense", category: "sbir_sttr", website: "dodsbirsttr.mil", focus_areas: ["defense technology"], grant_range: "$50K-$1.83M", ingestion_status: "planned", priority: 2 },
  { name: "NIH SBIR/STTR", organization: "NIH", category: "sbir_sttr", website: "sbir.nih.gov", focus_areas: ["health technology"], grant_range: "$275K-$2M", ingestion_status: "planned", priority: 2 },
  { name: "NSF SBIR/STTR (Seed Fund)", organization: "NSF", category: "sbir_sttr", website: "seedfund.nsf.gov", focus_areas: ["all tech except clinical"], grant_range: "$275K-$1.25M", ingestion_status: "planned", priority: 2 },
  { name: "DOE SBIR/STTR", organization: "Dept of Energy", category: "sbir_sttr", website: "science.osti.gov/sbir", focus_areas: ["energy technology"], grant_range: "$200K-$1.6M", ingestion_status: "planned", priority: 3 },
  { name: "NASA SBIR/STTR", organization: "NASA", category: "sbir_sttr", website: "sbir.nasa.gov", focus_areas: ["aerospace technology"], grant_range: "$150K-$1M", ingestion_status: "planned", priority: 3 },
  { name: "USDA SBIR", organization: "USDA NIFA", category: "sbir_sttr", website: "nifa.usda.gov/program/sbir", focus_areas: ["agricultural technology"], grant_range: "$100K-$600K", ingestion_status: "planned", priority: 4 },
  { name: "EPA SBIR", organization: "EPA", category: "sbir_sttr", website: "epa.gov/sbir", focus_areas: ["environmental technology"], grant_range: "$100K-$400K", ingestion_status: "planned", priority: 4 },
];

// ────────────────────────────────────────────────────────────────────────────
// TOP NATIONAL FOUNDATIONS (by giving)
// ────────────────────────────────────────────────────────────────────────────
const NATIONAL_FOUNDATIONS: DirectoryEntry[] = [
  { name: "Gates Foundation", organization: "Bill & Melinda Gates Foundation", category: "national_foundation", website: "gatesfoundation.org", annual_budget: "$7B+", focus_areas: ["global health", "education", "poverty"], grant_range: "$100K-$50M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 2 },
  { name: "Ford Foundation", organization: "Ford Foundation", category: "national_foundation", website: "fordfoundation.org", annual_budget: "$600M+", focus_areas: ["inequality", "democracy", "creativity"], grant_range: "$100K-$5M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 2 },
  { name: "Robert Wood Johnson Foundation", organization: "RWJF", category: "national_foundation", website: "rwjf.org", annual_budget: "$500M+", focus_areas: ["health equity"], grant_range: "$50K-$5M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 2 },
  { name: "W.K. Kellogg Foundation", organization: "Kellogg Foundation", category: "national_foundation", website: "wkkf.org", annual_budget: "$300M+", focus_areas: ["children", "families", "racial equity"], grant_range: "$50K-$2M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 2 },
  { name: "MacArthur Foundation", organization: "John D. & Catherine T. MacArthur Foundation", category: "national_foundation", website: "macfound.org", annual_budget: "$280M+", focus_areas: ["climate", "justice", "nuclear"], grant_range: "$100K-$10M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 2 },
  { name: "Rockefeller Foundation", organization: "Rockefeller Foundation", category: "national_foundation", website: "rockefellerfoundation.org", annual_budget: "$200M+", focus_areas: ["health", "food", "economic opportunity"], grant_range: "$100K-$5M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 3 },
  { name: "Hewlett Foundation", organization: "William & Flora Hewlett Foundation", category: "national_foundation", website: "hewlett.org", annual_budget: "$500M+", focus_areas: ["education", "environment", "democracy"], grant_range: "$100K-$5M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 3 },
  { name: "Packard Foundation", organization: "David & Lucile Packard Foundation", category: "national_foundation", website: "packard.org", annual_budget: "$350M+", focus_areas: ["conservation", "science", "children"], grant_range: "$50K-$3M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 3 },
  { name: "Kresge Foundation", organization: "The Kresge Foundation", category: "national_foundation", website: "kresge.org", annual_budget: "$150M+", focus_areas: ["arts", "education", "environment", "health"], grant_range: "$100K-$2M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 3 },
  { name: "Knight Foundation", organization: "John S. & James L. Knight Foundation", category: "national_foundation", website: "knightfoundation.org", annual_budget: "$150M+", focus_areas: ["journalism", "arts", "communities"], grant_range: "$25K-$5M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 3 },
  { name: "Walton Family Foundation", organization: "Walton Family Foundation", category: "national_foundation", website: "waltonfamilyfoundation.org", annual_budget: "$750M+", focus_areas: ["K-12 reform", "environment"], grant_range: "$50K-$10M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 3 },
  { name: "Bezos Earth Fund", organization: "Bezos Earth Fund", category: "national_foundation", website: "bezosearthfund.org", annual_budget: "$10B committed", focus_areas: ["climate", "nature"], grant_range: "$1M+", accepts_unsolicited: false, ingestion_status: "not_started", priority: 4 },
  { name: "Bloomberg Philanthropies", organization: "Bloomberg Philanthropies", category: "national_foundation", website: "bloomberg.org", annual_budget: "$1.7B+", focus_areas: ["environment", "health", "arts", "government"], accepts_unsolicited: false, ingestion_status: "not_started", priority: 4 },
  { name: "Open Society Foundations", organization: "Open Society Foundations", category: "national_foundation", website: "opensocietyfoundations.org", annual_budget: "$1.5B+", focus_areas: ["justice", "democracy", "human rights"], grant_range: "$50K-$5M", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 3 },
  { name: "Lilly Endowment", organization: "Lilly Endowment", category: "national_foundation", website: "lillyendowment.org", annual_budget: "$600M+", focus_areas: ["religion", "education", "community"], grant_range: "$50K-$10M", accepts_unsolicited: false, geographic_focus: "Indiana priority", ingestion_status: "manual_seed", priority: 4 },
  { name: "Annie E. Casey Foundation", organization: "Annie E. Casey Foundation", category: "national_foundation", website: "aecf.org", annual_budget: "$200M+", focus_areas: ["child welfare", "families"], grant_range: "$50K-$1M", accepts_unsolicited: false, ingestion_status: "manual_seed", priority: 3 },
  { name: "Simons Foundation", organization: "Simons Foundation", category: "national_foundation", website: "simonsfoundation.org", annual_budget: "$500M+", focus_areas: ["science", "mathematics"], grant_range: "$100K-$10M", accepts_unsolicited: true, ingestion_status: "not_started", priority: 4 },
  { name: "Moore Foundation", organization: "Gordon & Betty Moore Foundation", category: "national_foundation", website: "moore.org", annual_budget: "$400M+", focus_areas: ["science", "conservation"], grant_range: "$100K-$10M", accepts_unsolicited: false, ingestion_status: "not_started", priority: 4 },
  { name: "Surdna Foundation", organization: "Surdna Foundation", category: "national_foundation", website: "surdna.org", annual_budget: "$40M+", focus_areas: ["environment", "local economies", "culture"], grant_range: "$50K-$500K", accepts_unsolicited: true, ingestion_status: "manual_seed", priority: 4 },
  { name: "Spencer Foundation", organization: "Spencer Foundation", category: "national_foundation", website: "spencer.org", annual_budget: "$50M+", focus_areas: ["education research"], grant_range: "$50K-$1M", accepts_unsolicited: true, ingestion_status: "not_started", priority: 4 },
];

// ────────────────────────────────────────────────────────────────────────────
// TOP CORPORATE FOUNDATIONS
// ────────────────────────────────────────────────────────────────────────────
const CORPORATE: DirectoryEntry[] = [
  { name: "Walmart Foundation", organization: "Walmart", category: "corporate_foundation", website: "walmart.org", focus_areas: ["workforce", "hunger", "community"], grant_range: "$50K-$1M", ingestion_status: "manual_seed", priority: 3 },
  { name: "Google.org", organization: "Google", category: "corporate_foundation", website: "google.org", focus_areas: ["education", "economic opportunity", "crisis"], grant_range: "$100K-$5M", ingestion_status: "not_started", priority: 3 },
  { name: "Microsoft Philanthropies", organization: "Microsoft", category: "corporate_foundation", website: "microsoft.com/philanthropies", focus_areas: ["digital skills", "accessibility"], ingestion_status: "not_started", priority: 3 },
  { name: "JPMorgan Chase Foundation", organization: "JPMorgan Chase", category: "corporate_foundation", website: "jpmorganchase.com/impact", focus_areas: ["workforce", "small business"], ingestion_status: "not_started", priority: 3 },
  { name: "Bank of America Foundation", organization: "Bank of America", category: "corporate_foundation", website: "bankofamerica.com/foundation", focus_areas: ["economic mobility", "workforce"], ingestion_status: "not_started", priority: 3 },
  { name: "Wells Fargo Foundation", organization: "Wells Fargo", category: "corporate_foundation", website: "wellsfargo.com", focus_areas: ["housing", "small business"], ingestion_status: "not_started", priority: 4 },
  { name: "Salesforce Foundation", organization: "Salesforce", category: "corporate_foundation", website: "salesforce.org", focus_areas: ["education", "workforce", "equality"], ingestion_status: "not_started", priority: 4 },
  { name: "Target Foundation", organization: "Target", category: "corporate_foundation", website: "corporate.target.com", focus_areas: ["wellbeing", "education"], ingestion_status: "not_started", priority: 4 },
  { name: "Home Depot Foundation", organization: "Home Depot", category: "corporate_foundation", website: "corporate.homedepot.com/foundation", focus_areas: ["veterans", "disaster", "trades"], ingestion_status: "manual_seed", priority: 4 },
  { name: "FedEx Small Business Grant", organization: "FedEx", category: "corporate_foundation", website: "fedex.com/en-us/small-business", focus_areas: ["small business"], grant_range: "$15K-$50K", eligibility_notes: "For-profit, 1-99 employees", ingestion_status: "not_started", priority: 4 },
];

// ────────────────────────────────────────────────────────────────────────────
// COMPETITIONS & ACCELERATORS
// ────────────────────────────────────────────────────────────────────────────
const COMPETITIONS: DirectoryEntry[] = [
  { name: "43North", organization: "43North", category: "competition", website: "43north.org", focus_areas: ["all industries"], grant_range: "$1M total", geographic_focus: "Buffalo, NY", ingestion_status: "not_started", priority: 5 },
  { name: "MassChallenge", organization: "MassChallenge", category: "accelerator", website: "masschallenge.org", focus_areas: ["all industries"], grant_range: "Up to $100K, 0% equity", ingestion_status: "not_started", priority: 5 },
  { name: "Arch Grants", organization: "Arch Grants", category: "competition", website: "archgrants.org", focus_areas: ["all industries"], grant_range: "$50K-$100K", geographic_focus: "St. Louis", ingestion_status: "not_started", priority: 5 },
  { name: "Amber Grant", organization: "WomensNet", category: "competition", website: "ambergrantsforwomen.com", focus_areas: ["women-owned business"], grant_range: "$10K monthly", eligibility_notes: "Women entrepreneurs", ingestion_status: "not_started", priority: 5 },
  { name: "Black Girl Ventures", organization: "BGV", category: "competition", website: "blackgirlventures.org", focus_areas: ["Black women founders"], grant_range: "$5K-$50K", ingestion_status: "not_started", priority: 5 },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const ALL_ENTRIES = [...FEDERAL, ...SBIR, ...NATIONAL_FOUNDATIONS, ...CORPORATE, ...COMPETITIONS];

  console.log(`Seeding ${ALL_ENTRIES.length} grant source directory entries...`);

  // Check for existing entries
  const { data: existing } = await supabase
    .from("grant_source_directory")
    .select("name, organization");

  const existingSet = new Set(
    (existing ?? []).map((e: { name: string; organization: string }) => `${e.name}|||${e.organization}`)
  );

  const newEntries = ALL_ENTRIES.filter(
    (e) => !existingSet.has(`${e.name}|||${e.organization}`)
  );

  console.log(`${existingSet.size} already exist, ${newEntries.length} new to insert`);

  if (newEntries.length === 0) {
    console.log("Nothing to insert — all entries already exist.");
    return;
  }

  // Insert in batches
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
    const batch = newEntries.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("grant_source_directory").insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${newEntries.length}`);
    }
  }

  // Also check for overlap with existing grant_sources
  const { data: grantSources } = await supabase
    .from("grant_sources")
    .select("funder_name")
    .limit(1000);

  const funderNames = new Set(
    (grantSources ?? []).map((g: { funder_name: string }) => g.funder_name.toLowerCase())
  );

  const overlapping = ALL_ENTRIES.filter((e) =>
    funderNames.has(e.organization.toLowerCase()) || funderNames.has(e.name.toLowerCase())
  );

  console.log(`\n${overlapping.length} directory entries overlap with existing grant_sources funders:`);
  for (const o of overlapping.slice(0, 20)) {
    console.log(`  - ${o.name} (${o.organization})`);
  }
  if (overlapping.length > 20) {
    console.log(`  ... and ${overlapping.length - 20} more`);
  }

  console.log(`\nDone. ${inserted} entries inserted into grant_source_directory.`);
}

main().catch(console.error);
