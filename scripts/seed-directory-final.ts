/**
 * Final batch — state sub-agencies, remaining foundations, local/regional,
 * and specialized sources. Deduplicates automatically.
 *
 * Usage: npx tsx scripts/seed-directory-final.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Entry {
  name: string;
  organization: string;
  category: string;
  subcategory?: string;
  website?: string;
  focus_areas?: string[];
  geographic_focus?: string;
  grant_range?: string;
  crawl_frequency?: string;
  priority?: number;
  ingestion_status?: string;
}

// ── FEDERAL SUB-AGENCIES NOT YET ADDED ────────────────────────────────
const FED_SUB: Entry[] = [
  { name: "IES Funding", organization: "Institute of Education Sciences", category: "federal_agency", website: "ies.ed.gov/funding", focus_areas: ["education research"], crawl_frequency: "weekly", priority: 4 },
  { name: "ACL Grants", organization: "Admin for Community Living", category: "federal_agency", website: "acl.gov/grants", focus_areas: ["aging", "disability"], crawl_frequency: "weekly", priority: 4 },
  { name: "BJA Funding", organization: "Bureau of Justice Assistance", category: "federal_agency", website: "bja.ojp.gov/funding", focus_areas: ["law enforcement", "courts"], crawl_frequency: "weekly", priority: 5 },
  { name: "OJJDP Funding", organization: "Office of Juvenile Justice", category: "federal_agency", website: "ojjdp.ojp.gov/funding", focus_areas: ["juvenile justice"], crawl_frequency: "weekly", priority: 5 },
  { name: "OVW Grant Programs", organization: "Office on Violence Against Women", category: "federal_agency", website: "justice.gov/ovw/grant-programs", focus_areas: ["domestic violence", "sexual assault"], crawl_frequency: "weekly", priority: 5 },
  { name: "FTA Grants", organization: "Federal Transit Admin", category: "federal_agency", website: "transit.dot.gov/grants", focus_areas: ["public transit"], crawl_frequency: "weekly", priority: 5 },
  { name: "FHWA Programs", organization: "Federal Highway Admin", category: "federal_agency", website: "highways.dot.gov", focus_areas: ["highway infrastructure"], crawl_frequency: "weekly", priority: 5 },
  { name: "NIST Grants", organization: "National Institute of Standards", category: "federal_agency", website: "nist.gov", focus_areas: ["standards", "manufacturing"], crawl_frequency: "weekly", priority: 5 },
  { name: "MBDA Centers", organization: "Minority Business Dev Agency", category: "federal_agency", website: "mbda.gov", focus_areas: ["minority businesses"], crawl_frequency: "weekly", priority: 5 },
  { name: "BIA Grants", organization: "Bureau of Indian Affairs", category: "federal_agency", website: "bia.gov/service/grants", focus_areas: ["tribal programs"], crawl_frequency: "weekly", priority: 5 },
  { name: "FWS Grants", organization: "Fish and Wildlife Service", category: "federal_agency", website: "fws.gov/service/financial-assistance", focus_areas: ["wildlife conservation"], crawl_frequency: "weekly", priority: 5 },
  { name: "NPS Historic Preservation", organization: "National Park Service", category: "federal_agency", website: "nps.gov/subjects/historicpreservationfund", focus_areas: ["historic preservation"], crawl_frequency: "monthly", priority: 6 },
  { name: "CPB Grants", organization: "Corporation for Public Broadcasting", category: "federal_agency", website: "cpb.org/grants", focus_areas: ["public media"], crawl_frequency: "monthly", priority: 6 },
  { name: "DRA Funding", organization: "Delta Regional Authority", category: "federal_agency", website: "dra.gov/funding", focus_areas: ["Delta economic development"], crawl_frequency: "monthly", priority: 7 },
  { name: "NBRC Grants", organization: "Northern Border Regional Commission", category: "federal_agency", website: "nbrc.gov", focus_areas: ["northeast development"], crawl_frequency: "monthly", priority: 7 },
  { name: "Denali Commission", organization: "Denali Commission", category: "federal_agency", website: "denali.gov", focus_areas: ["Alaska infrastructure"], crawl_frequency: "quarterly", priority: 8 },
  { name: "CDFI Fund", organization: "Community Dev Financial Institutions", category: "federal_agency", website: "cdfifund.gov", focus_areas: ["community development finance"], crawl_frequency: "weekly", priority: 4 },
  { name: "FCC Grants", organization: "Federal Communications Commission", category: "federal_agency", website: "fcc.gov/general/grants", focus_areas: ["telecommunications"], crawl_frequency: "monthly", priority: 6 },
  { name: "NHPRC Grants", organization: "National Historical Publications", category: "federal_agency", website: "archives.gov/nhprc", focus_areas: ["historical records"], crawl_frequency: "quarterly", priority: 7 },
  { name: "EAC Grants", organization: "Election Assistance Commission", category: "federal_agency", website: "eac.gov/payments-and-grants", focus_areas: ["election administration"], crawl_frequency: "quarterly", priority: 8 },
  { name: "LSC Grants", organization: "Legal Services Corporation", category: "federal_agency", website: "lsc.gov/grants-grantee-resources", focus_areas: ["legal aid"], crawl_frequency: "monthly", priority: 6 },
];

// ── ADDITIONAL NATIONAL FOUNDATIONS ───────────────────────────────────
const MORE_FOUNDATIONS: Entry[] = [
  { name: "Carnegie Corporation", organization: "Carnegie Corporation of New York", category: "national_foundation", website: "carnegie.org", focus_areas: ["education", "democracy", "peace"], priority: 4 },
  { name: "Annenberg Foundation", organization: "Annenberg Foundation", category: "national_foundation", website: "annenberg.org", focus_areas: ["education", "arts"], priority: 5 },
  { name: "Helmsley Trust", organization: "Leona M. & Harry B. Helmsley Trust", category: "national_foundation", website: "helmsleytrust.org", focus_areas: ["health", "rural", "education"], priority: 5 },
  { name: "Duke Endowment", organization: "The Duke Endowment", category: "national_foundation", website: "dukeendowment.org", focus_areas: ["higher ed", "healthcare"], geographic_focus: "NC/SC", priority: 5 },
  { name: "Lumina Foundation", organization: "Lumina Foundation", category: "national_foundation", website: "luminafoundation.org", focus_areas: ["higher ed", "credentials"], priority: 5 },
  { name: "ECMC Foundation", organization: "ECMC Foundation", category: "national_foundation", website: "ecmcfoundation.org", focus_areas: ["postsecondary success"], priority: 5 },
  { name: "Joyce Foundation", organization: "Joyce Foundation", category: "national_foundation", website: "joycefdn.org", focus_areas: ["education", "Great Lakes"], priority: 5 },
  { name: "Barr Foundation", organization: "Barr Foundation", category: "national_foundation", website: "barrfoundation.org", focus_areas: ["education", "climate", "arts"], geographic_focus: "Massachusetts", priority: 5 },
  { name: "Charles Stewart Mott Foundation", organization: "Mott Foundation", category: "national_foundation", website: "mott.org", focus_areas: ["education", "Flint"], priority: 5 },
  { name: "McKnight Foundation", organization: "McKnight Foundation", category: "national_foundation", website: "mcknight.org", focus_areas: ["arts", "climate"], geographic_focus: "Minnesota", priority: 5 },
  { name: "Public Welfare Foundation", organization: "Public Welfare Foundation", category: "national_foundation", website: "publicwelfare.org", focus_areas: ["criminal justice", "workers rights"], grant_range: "$50K-$300K", priority: 5 },
  { name: "Irvine Foundation", organization: "James Irvine Foundation", category: "national_foundation", website: "irvine.org", focus_areas: ["expanding opportunity"], geographic_focus: "California", priority: 5 },
  { name: "Daniels Fund", organization: "Daniels Fund", category: "national_foundation", website: "danielsfund.org", focus_areas: ["education", "ethics"], geographic_focus: "CO, NM, UT, WY", priority: 5 },
  { name: "Robin Hood Foundation", organization: "Robin Hood", category: "national_foundation", website: "robinhood.org", focus_areas: ["poverty"], geographic_focus: "NYC", grant_range: "$100K-$5M", priority: 5 },
  { name: "Meyer Memorial Trust", organization: "Meyer Memorial Trust", category: "national_foundation", website: "mmt.org", focus_areas: ["various"], geographic_focus: "Oregon", priority: 5 },
  { name: "Weingart Foundation", organization: "Weingart Foundation", category: "national_foundation", website: "weingartfnd.org", focus_areas: ["equity", "human services"], geographic_focus: "Southern California", priority: 5 },
  { name: "California Endowment", organization: "The California Endowment", category: "national_foundation", website: "calendow.org", focus_areas: ["health equity"], geographic_focus: "California", priority: 4 },
  { name: "California Wellness Foundation", organization: "Cal Wellness", category: "national_foundation", website: "calwellness.org", focus_areas: ["health", "wellness"], geographic_focus: "California", priority: 5 },
  { name: "Colorado Health Foundation", organization: "Colorado Health Foundation", category: "national_foundation", website: "coloradohealth.org", focus_areas: ["health equity"], geographic_focus: "Colorado", priority: 5 },
  { name: "New York Health Foundation", organization: "NYHealth", category: "national_foundation", website: "nyhealthfoundation.org", focus_areas: ["healthcare"], geographic_focus: "New York", priority: 5 },
  { name: "Heinz Endowments", organization: "Heinz Endowments", category: "national_foundation", website: "heinz.org", focus_areas: ["various"], geographic_focus: "Pittsburgh", priority: 5 },
  { name: "Geraldine R. Dodge Foundation", organization: "Dodge Foundation", category: "national_foundation", website: "grdodge.org", focus_areas: ["arts", "education", "environment"], geographic_focus: "New Jersey", priority: 5 },
  { name: "Rockefeller Brothers Fund", organization: "RBF", category: "national_foundation", website: "rbf.org", focus_areas: ["sustainable development"], priority: 5 },
  { name: "NoVo Foundation", organization: "NoVo Foundation", category: "national_foundation", website: "novofoundation.org", focus_areas: ["girls", "women", "social-emotional learning"], priority: 5 },
  { name: "Marguerite Casey Foundation", organization: "Marguerite Casey", category: "national_foundation", website: "caseygrants.org", focus_areas: ["family economic justice"], priority: 5 },
  { name: "Blue Meridian Partners", organization: "Blue Meridian", category: "national_foundation", website: "bluemeridian.org", focus_areas: ["scale proven models"], grant_range: "$10M-$100M+", priority: 4 },
];

// ── SOCIAL JUSTICE FOUNDATIONS ─────────────────────────────────────────
const SOCIAL_JUSTICE: Entry[] = [
  { name: "Proteus Fund", organization: "Proteus Fund", category: "national_foundation", subcategory: "social_justice", website: "proteusfund.org", focus_areas: ["democracy", "rights"], priority: 6 },
  { name: "Borealis Philanthropy", organization: "Borealis", category: "national_foundation", subcategory: "social_justice", website: "borealisphilanthropy.org", focus_areas: ["racial justice", "trans justice"], priority: 6 },
  { name: "Astraea Foundation", organization: "Astraea", category: "national_foundation", subcategory: "lgbtq", website: "astraeafoundation.org", focus_areas: ["LGBTQ rights"], priority: 6 },
  { name: "Gill Foundation", organization: "Gill Foundation", category: "national_foundation", subcategory: "lgbtq", website: "gillfoundation.org", focus_areas: ["LGBTQ equality"], priority: 6 },
  { name: "Haymarket People's Fund", organization: "Haymarket", category: "national_foundation", subcategory: "social_justice", website: "haymarket.org", focus_areas: ["social justice"], geographic_focus: "New England", grant_range: "$5K-$25K", priority: 7 },
  { name: "Crossroads Fund", organization: "Crossroads Fund", category: "national_foundation", subcategory: "social_justice", website: "crossroadsfund.org", focus_areas: ["social justice"], geographic_focus: "Chicago", grant_range: "$5K-$15K", priority: 7 },
  { name: "Chinook Fund", organization: "Chinook Fund", category: "national_foundation", subcategory: "social_justice", website: "chinookfund.org", focus_areas: ["social justice"], geographic_focus: "Colorado", grant_range: "$5K-$20K", priority: 7 },
  { name: "Third Wave Fund", organization: "Third Wave Fund", category: "national_foundation", subcategory: "women", website: "thirdwavefund.org", focus_areas: ["young women", "trans people"], priority: 6 },
  { name: "NDN Collective", organization: "NDN Collective", category: "national_foundation", subcategory: "indigenous", website: "ndncollective.org", focus_areas: ["Indigenous power"], priority: 5 },
  { name: "Latino Community Foundation", organization: "LCF", category: "national_foundation", subcategory: "hispanic", website: "latinocf.org", focus_areas: ["Latino community"], geographic_focus: "California", priority: 6 },
  { name: "Solidago Foundation", organization: "Solidago", category: "national_foundation", subcategory: "social_justice", website: "solidago.org", focus_areas: ["grassroots organizing"], priority: 7 },
];

// ── WOMEN-FOCUSED GRANTS ──────────────────────────────────────────────
const WOMEN: Entry[] = [
  { name: "Texas Women's Foundation", organization: "TxWF", category: "national_foundation", subcategory: "women", website: "txwf.org", focus_areas: ["women/girls"], geographic_focus: "Texas", priority: 6 },
  { name: "New York Women's Foundation", organization: "NYWF", category: "national_foundation", subcategory: "women", website: "nywf.org", focus_areas: ["women/girls"], geographic_focus: "NYC", priority: 6 },
  { name: "Women's Foundation of California", organization: "WFCA", category: "national_foundation", subcategory: "women", website: "womensfoundca.org", focus_areas: ["women/girls"], geographic_focus: "California", priority: 6 },
  { name: "IFundWomen", organization: "IFundWomen", category: "competition", subcategory: "women", website: "ifundwomen.com", focus_areas: ["women entrepreneurs"], priority: 6 },
  { name: "Eileen Fisher Grant", organization: "Eileen Fisher", category: "corporate_foundation", subcategory: "women", website: "eileenfisher.com/grants", focus_areas: ["women-owned", "sustainable"], grant_range: "$10K", priority: 7 },
  { name: "Cartier Women's Initiative", organization: "Cartier", category: "competition", subcategory: "women", website: "cartierwomensinitiative.com", focus_areas: ["women-led business"], grant_range: "$30K-$100K", priority: 6 },
  { name: "Tory Burch Foundation", organization: "Tory Burch", category: "corporate_foundation", subcategory: "women", website: "toryburchfoundation.org", focus_areas: ["women entrepreneurs"], priority: 6 },
];

// ── ADDITIONAL COMPETITIONS & ACCELERATORS ────────────────────────────
const MORE_COMPETITIONS: Entry[] = [
  { name: "Rice Business Plan Competition", organization: "Rice University", category: "competition", website: "rbpc.rice.edu", focus_areas: ["all industries"], grant_range: "$1.5M+ prizes", priority: 5 },
  { name: "MIT $100K", organization: "MIT", category: "competition", website: "mit100k.org", focus_areas: ["all industries"], grant_range: "$100K", priority: 5 },
  { name: "Hult Prize", organization: "Hult Prize", category: "competition", website: "hultprize.org", focus_areas: ["social enterprise"], grant_range: "$1M", priority: 5 },
  { name: "SXSW Pitch", organization: "SXSW", category: "competition", website: "sxsw.com/pitch", focus_areas: ["tech", "entertainment"], grant_range: "$125K prizes", priority: 6 },
  { name: "Y Combinator", organization: "Y Combinator", category: "accelerator", website: "ycombinator.com", focus_areas: ["all industries"], grant_range: "$500K for 7%", priority: 4 },
  { name: "Techstars", organization: "Techstars", category: "accelerator", website: "techstars.com", focus_areas: ["various verticals"], grant_range: "$120K for 6%", priority: 4 },
  { name: "Elemental Excelerator", organization: "Elemental", category: "accelerator", website: "elementalexcelerator.com", focus_areas: ["climate tech"], grant_range: "Up to $1M", priority: 5 },
  { name: "Village Capital", organization: "Village Capital", category: "accelerator", website: "vilcap.com", focus_areas: ["impact ventures"], priority: 5 },
  { name: "Halcyon", organization: "Halcyon", category: "accelerator", website: "halcyonhouse.org", focus_areas: ["social impact"], geographic_focus: "DC", grant_range: "$10K + services, 0% equity", priority: 6 },
  { name: "VentureWell E-Team", organization: "VentureWell", category: "accelerator", website: "venturewell.org", focus_areas: ["student ventures"], grant_range: "Up to $25K, 0% equity", priority: 6 },
  { name: "XPRIZE", organization: "XPRIZE Foundation", category: "competition", website: "xprize.org", focus_areas: ["breakthrough innovation"], grant_range: "$1M-$100M", priority: 4 },
  { name: "Challenge.gov", organization: "US Government", category: "competition", website: "challenge.gov", focus_areas: ["all federal challenges"], grant_range: "Varies", crawl_frequency: "weekly", priority: 3 },
];

// ── RESEARCH TOOLS & DATABASES ────────────────────────────────────────
const RESEARCH_TOOLS: Entry[] = [
  { name: "NIH Reporter", organization: "NIH", category: "research", website: "reporter.nih.gov", focus_areas: ["NIH funded research search"], crawl_frequency: "manual", priority: 5 },
  { name: "Research.gov", organization: "NSF", category: "research", website: "research.gov", focus_areas: ["NSF proposals"], crawl_frequency: "manual", priority: 5 },
  { name: "Federal Register", organization: "US Government", category: "research", website: "federalregister.gov", focus_areas: ["grant announcements"], crawl_frequency: "daily", priority: 3 },
  { name: "GrantSolutions", organization: "Multi-agency", category: "research", website: "grantsolutions.gov", focus_areas: ["grants management"], crawl_frequency: "manual", priority: 6 },
  { name: "FAPIIS", organization: "Multi-agency", category: "research", website: "fapiis.gov", focus_areas: ["contractor performance"], crawl_frequency: "manual", priority: 8 },
  { name: "eRA Commons", organization: "NIH", category: "research", website: "era.nih.gov", focus_areas: ["NIH administration"], crawl_frequency: "manual", priority: 7 },
];

// ── HEALTHCARE SYSTEM FOUNDATIONS ─────────────────────────────────────
const HEALTHCARE: Entry[] = [
  { name: "Kaiser Permanente Community", organization: "Kaiser Permanente", category: "corporate_foundation", subcategory: "health", website: "about.kaiserpermanente.org/community-health", focus_areas: ["community health"], priority: 5 },
  { name: "PCORI", organization: "Patient-Centered Outcomes Research", category: "research", website: "pcori.org", focus_areas: ["comparative effectiveness"], priority: 5 },
  { name: "de Beaumont Foundation", organization: "de Beaumont", category: "national_foundation", subcategory: "health", website: "debeaumont.org", focus_areas: ["public health"], priority: 6 },
  { name: "Episcopal Health Foundation", organization: "EHF", category: "national_foundation", subcategory: "health", website: "episcopalhealth.org", focus_areas: ["health equity"], geographic_focus: "Texas", priority: 6 },
  { name: "Missouri Foundation for Health", organization: "MFH", category: "national_foundation", subcategory: "health", website: "mffh.org", focus_areas: ["health policy"], geographic_focus: "Missouri", priority: 6 },
  { name: "Kate B. Reynolds Trust", organization: "KBR", category: "national_foundation", subcategory: "health", website: "kbr.org", focus_areas: ["healthcare"], geographic_focus: "North Carolina", priority: 6 },
];

// ── MORE FAITH-BASED ──────────────────────────────────────────────────
const MORE_FAITH: Entry[] = [
  { name: "GHR Foundation", organization: "GHR Foundation", category: "faith_based", website: "ghrfoundation.org", focus_areas: ["Catholic education", "global development"], priority: 6 },
  { name: "Raskob Foundation", organization: "Raskob Foundation", category: "faith_based", website: "rfca.org", focus_areas: ["Catholic activities"], grant_range: "$5K-$50K", priority: 7 },
  { name: "Fetzer Institute", organization: "Fetzer Institute", category: "faith_based", website: "fetzer.org", focus_areas: ["spirituality", "love"], priority: 6 },
  { name: "Islamic Relief USA", organization: "Islamic Relief", category: "faith_based", website: "irusa.org", focus_areas: ["humanitarian"], priority: 6 },
  { name: "Jewish Federations", organization: "JFNA", category: "faith_based", website: "jewishfederations.org", focus_areas: ["Jewish community"], priority: 5 },
  { name: "Jim Joseph Foundation", organization: "Jim Joseph", category: "faith_based", website: "jimjosephfoundation.org", focus_areas: ["Jewish education"], priority: 6 },
  { name: "Schusterman Foundation", organization: "Schusterman Family Foundation", category: "faith_based", website: "schusterman.org", focus_areas: ["Jewish life", "education"], priority: 6 },
  { name: "Buddhist Global Relief", organization: "BGR", category: "faith_based", website: "buddhistglobalrelief.org", focus_areas: ["hunger relief"], priority: 8 },
];

// ── CAPACITY BUILDING & TECHNICAL ASSISTANCE ──────────────────────────
const CAPACITY: Entry[] = [
  { name: "Nonprofit Finance Fund", organization: "NFF", category: "national_foundation", subcategory: "capacity", website: "nff.org", focus_areas: ["financial management"], priority: 6 },
  { name: "LISC", organization: "Local Initiatives Support Corp", category: "national_foundation", subcategory: "community_dev", website: "lisc.org", focus_areas: ["community development"], priority: 4 },
  { name: "Enterprise Community Partners", organization: "Enterprise", category: "national_foundation", subcategory: "housing", website: "enterprisecommunity.org", focus_areas: ["affordable housing"], priority: 4 },
  { name: "NeighborWorks America", organization: "NeighborWorks", category: "national_foundation", subcategory: "housing", website: "neighborworks.org", focus_areas: ["housing counseling"], priority: 5 },
  { name: "Taproot Foundation", organization: "Taproot", category: "other", subcategory: "pro_bono", website: "taprootfoundation.org", focus_areas: ["pro bono consulting"], priority: 6 },
  { name: "Catchafire", organization: "Catchafire", category: "other", subcategory: "pro_bono", website: "catchafire.org", focus_areas: ["skilled volunteers"], priority: 6 },
];

// ── FOOD & HUNGER ─────────────────────────────────────────────────────
const FOOD: Entry[] = [
  { name: "Feeding America", organization: "Feeding America", category: "national_foundation", subcategory: "food", website: "feedingamerica.org", focus_areas: ["food bank network"], priority: 5 },
  { name: "Newman's Own Foundation", organization: "Newman's Own", category: "corporate_foundation", subcategory: "food", website: "newmansownfoundation.org", focus_areas: ["nutrition"], priority: 5 },
  { name: "Whole Kids Foundation", organization: "Whole Foods", category: "corporate_foundation", subcategory: "food", website: "wholekidsfoundation.org", focus_areas: ["school gardens"], grant_range: "$2K-$3K", priority: 6 },
  { name: "ConAgra Foundation", organization: "ConAgra", category: "corporate_foundation", subcategory: "food", website: "conagrabrands.com", focus_areas: ["child hunger"], priority: 6 },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const ALL = [
    ...FED_SUB, ...MORE_FOUNDATIONS, ...SOCIAL_JUSTICE, ...WOMEN,
    ...MORE_COMPETITIONS, ...RESEARCH_TOOLS, ...HEALTHCARE,
    ...MORE_FAITH, ...CAPACITY, ...FOOD,
  ];

  for (const e of ALL) {
    e.ingestion_status = e.ingestion_status ?? "not_started";
    e.crawl_frequency = e.crawl_frequency ?? "monthly";
    e.priority = e.priority ?? 6;
  }

  console.log(`Seeding ${ALL.length} final sources...`);

  const { data: existing } = await supabase
    .from("grant_source_directory")
    .select("name, organization");

  const existingSet = new Set(
    (existing ?? []).map((e: { name: string; organization: string }) => `${e.name}|||${e.organization}`)
  );

  const newEntries = ALL.filter((e) => !existingSet.has(`${e.name}|||${e.organization}`));
  const dupes = ALL.length - newEntries.length;
  console.log(`${existingSet.size} already exist, ${newEntries.length} new, ${dupes} duplicates skipped`);

  if (newEntries.length === 0) {
    console.log("All sources already in directory.");
    return;
  }

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < newEntries.length; i += BATCH) {
    const batch = newEntries.slice(i, i + BATCH);
    const { error } = await supabase.from("grant_source_directory").insert(batch);
    if (error) {
      console.error(`Batch failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${newEntries.length}`);
    }
  }

  console.log(`\nDone. ${inserted} new sources added. Total: ${existingSet.size + inserted}`);
}

main().catch(console.error);
