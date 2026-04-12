/**
 * Seeds ALL remaining grant sources from the comprehensive list.
 * Run after seed-grant-directory.ts to add state, community, corporate,
 * faith-based, disease-specific, and other sources.
 *
 * Usage: npx tsx scripts/seed-directory-full.ts
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
  annual_budget?: string;
  focus_areas?: string[];
  geographic_focus?: string;
  grant_range?: string;
  eligibility_notes?: string;
  accepts_unsolicited?: boolean;
  ingestion_status?: string;
  crawl_frequency?: string;
  priority?: number;
}

// ── STATE GRANT PORTALS (all 50 + DC) ─────────────────────────────────
const STATES: Entry[] = [
  { name: "Alabama Grants", organization: "ADECA", category: "state_agency", website: "grants.alabama.gov", geographic_focus: "AL", crawl_frequency: "weekly", priority: 5 },
  { name: "Alaska Grants", organization: "DCCED", category: "state_agency", website: "prior.alaska.gov", geographic_focus: "AK", crawl_frequency: "weekly", priority: 5 },
  { name: "Arizona Grants", organization: "Arizona Commerce Authority", category: "state_agency", website: "azcommerce.com", geographic_focus: "AZ", crawl_frequency: "weekly", priority: 5 },
  { name: "Arkansas Grants", organization: "Arkansas EDC", category: "state_agency", website: "arkansasedc.com", geographic_focus: "AR", crawl_frequency: "weekly", priority: 5 },
  { name: "California Grants", organization: "GO-Biz", category: "state_agency", website: "grants.ca.gov", geographic_focus: "CA", crawl_frequency: "daily", priority: 3 },
  { name: "Colorado Grants", organization: "OEDIT", category: "state_agency", website: "choosecolorado.com", geographic_focus: "CO", crawl_frequency: "weekly", priority: 5 },
  { name: "Connecticut Grants", organization: "DECD", category: "state_agency", website: "ctgov.org", geographic_focus: "CT", crawl_frequency: "weekly", priority: 5 },
  { name: "Delaware Grants", organization: "DEDO", category: "state_agency", website: "dedo.delaware.gov", geographic_focus: "DE", crawl_frequency: "monthly", priority: 6 },
  { name: "Florida Grants", organization: "Enterprise Florida", category: "state_agency", website: "enterpriseflorida.com", geographic_focus: "FL", crawl_frequency: "weekly", priority: 4 },
  { name: "Georgia Grants", organization: "Georgia.org", category: "state_agency", website: "georgia.org", geographic_focus: "GA", crawl_frequency: "weekly", priority: 5 },
  { name: "Hawaii Grants", organization: "DBEDT", category: "state_agency", website: "investinhawaii.gov", geographic_focus: "HI", crawl_frequency: "monthly", priority: 6 },
  { name: "Idaho Grants", organization: "Idaho Commerce", category: "state_agency", website: "commerce.idaho.gov", geographic_focus: "ID", crawl_frequency: "monthly", priority: 6 },
  { name: "Illinois Grants", organization: "DCEO", category: "state_agency", website: "grants.illinois.gov", geographic_focus: "IL", crawl_frequency: "weekly", priority: 4 },
  { name: "Indiana Grants", organization: "IEDC", category: "state_agency", website: "iedc.in.gov", geographic_focus: "IN", crawl_frequency: "weekly", priority: 5 },
  { name: "Iowa Grants", organization: "IEDA", category: "state_agency", website: "iowaeda.com", geographic_focus: "IA", crawl_frequency: "weekly", priority: 5 },
  { name: "Kansas Grants", organization: "Kansas Commerce", category: "state_agency", website: "kansascommerce.gov", geographic_focus: "KS", crawl_frequency: "weekly", priority: 5 },
  { name: "Kentucky Grants", organization: "Cabinet for Econ Dev", category: "state_agency", website: "thinkkentucky.com", geographic_focus: "KY", crawl_frequency: "weekly", priority: 5 },
  { name: "Louisiana Grants", organization: "LED", category: "state_agency", website: "opportunitylouisiana.com", geographic_focus: "LA", crawl_frequency: "weekly", priority: 5 },
  { name: "Maine Grants", organization: "DECD", category: "state_agency", website: "maine.gov/decd", geographic_focus: "ME", crawl_frequency: "monthly", priority: 6 },
  { name: "Maryland Grants", organization: "Commerce", category: "state_agency", website: "commerce.maryland.gov", geographic_focus: "MD", crawl_frequency: "weekly", priority: 5 },
  { name: "Massachusetts Grants", organization: "MOBD", category: "state_agency", website: "mass.gov/orgs/office-of-business-development", geographic_focus: "MA", crawl_frequency: "weekly", priority: 4 },
  { name: "Michigan Grants", organization: "MEDC", category: "state_agency", website: "michiganbusiness.org", geographic_focus: "MI", crawl_frequency: "weekly", priority: 5 },
  { name: "Minnesota Grants", organization: "DEED", category: "state_agency", website: "mn.gov/deed", geographic_focus: "MN", crawl_frequency: "weekly", priority: 5 },
  { name: "Mississippi Grants", organization: "MDA", category: "state_agency", website: "mississippi.org", geographic_focus: "MS", crawl_frequency: "monthly", priority: 6 },
  { name: "Missouri Grants", organization: "DED", category: "state_agency", website: "ded.mo.gov", geographic_focus: "MO", crawl_frequency: "weekly", priority: 5 },
  { name: "Montana Grants", organization: "Commerce", category: "state_agency", website: "commerce.mt.gov", geographic_focus: "MT", crawl_frequency: "monthly", priority: 6 },
  { name: "Nebraska Grants", organization: "DED", category: "state_agency", website: "opportunity.nebraska.gov", geographic_focus: "NE", crawl_frequency: "monthly", priority: 6 },
  { name: "Nevada Grants", organization: "GOED", category: "state_agency", website: "diversifynevada.com", geographic_focus: "NV", crawl_frequency: "monthly", priority: 6 },
  { name: "New Hampshire Grants", organization: "BEA", category: "state_agency", website: "nheconomy.com", geographic_focus: "NH", crawl_frequency: "monthly", priority: 6 },
  { name: "New Jersey Grants", organization: "NJEDA", category: "state_agency", website: "njeda.com", geographic_focus: "NJ", crawl_frequency: "weekly", priority: 4 },
  { name: "New Mexico Grants", organization: "EDD", category: "state_agency", website: "gonm.biz", geographic_focus: "NM", crawl_frequency: "monthly", priority: 6 },
  { name: "New York Grants", organization: "Empire State Dev", category: "state_agency", website: "esd.ny.gov", geographic_focus: "NY", crawl_frequency: "daily", priority: 3 },
  { name: "North Carolina Grants", organization: "EDPNC", category: "state_agency", website: "edpnc.com", geographic_focus: "NC", crawl_frequency: "weekly", priority: 5 },
  { name: "North Dakota Grants", organization: "Commerce Dept", category: "state_agency", website: "ndcommerce.com", geographic_focus: "ND", crawl_frequency: "monthly", priority: 7 },
  { name: "Ohio Grants", organization: "JobsOhio", category: "state_agency", website: "jobsohio.com", geographic_focus: "OH", crawl_frequency: "weekly", priority: 4 },
  { name: "Oklahoma Grants", organization: "Commerce", category: "state_agency", website: "okcommerce.gov", geographic_focus: "OK", crawl_frequency: "weekly", priority: 5 },
  { name: "Oregon Grants", organization: "Business Oregon", category: "state_agency", website: "oregon4biz.com", geographic_focus: "OR", crawl_frequency: "weekly", priority: 5 },
  { name: "Pennsylvania Grants", organization: "DCED", category: "state_agency", website: "dced.pa.gov", geographic_focus: "PA", crawl_frequency: "weekly", priority: 4 },
  { name: "Rhode Island Grants", organization: "CommerceRI", category: "state_agency", website: "commerceri.com", geographic_focus: "RI", crawl_frequency: "monthly", priority: 6 },
  { name: "South Carolina Grants", organization: "SC Commerce", category: "state_agency", website: "sccommerce.com", geographic_focus: "SC", crawl_frequency: "weekly", priority: 5 },
  { name: "South Dakota Grants", organization: "GOED", category: "state_agency", website: "sdreadytowork.com", geographic_focus: "SD", crawl_frequency: "monthly", priority: 7 },
  { name: "Tennessee Grants", organization: "TNECD", category: "state_agency", website: "tnecd.com", geographic_focus: "TN", crawl_frequency: "weekly", priority: 5 },
  { name: "Texas Grants", organization: "Governor's Office", category: "state_agency", website: "gov.texas.gov/business", geographic_focus: "TX", crawl_frequency: "daily", priority: 3 },
  { name: "Utah Grants", organization: "GOED", category: "state_agency", website: "business.utah.gov", geographic_focus: "UT", crawl_frequency: "weekly", priority: 5 },
  { name: "Vermont Grants", organization: "ACCD", category: "state_agency", website: "accd.vermont.gov", geographic_focus: "VT", crawl_frequency: "monthly", priority: 6 },
  { name: "Virginia Grants", organization: "VEDP", category: "state_agency", website: "vedp.org", geographic_focus: "VA", crawl_frequency: "weekly", priority: 5 },
  { name: "Washington Grants", organization: "Commerce", category: "state_agency", website: "choosewashingtonstate.com", geographic_focus: "WA", crawl_frequency: "weekly", priority: 4 },
  { name: "West Virginia Grants", organization: "Development Office", category: "state_agency", website: "westvirginia.gov/business", geographic_focus: "WV", crawl_frequency: "monthly", priority: 6 },
  { name: "Wisconsin Grants", organization: "WEDC", category: "state_agency", website: "wedc.org", geographic_focus: "WI", crawl_frequency: "weekly", priority: 5 },
  { name: "Wyoming Grants", organization: "Business Council", category: "state_agency", website: "wyomingbusiness.org", geographic_focus: "WY", crawl_frequency: "monthly", priority: 7 },
  { name: "DC Grants", organization: "DMPED", category: "state_agency", website: "dmped.dc.gov", geographic_focus: "DC", crawl_frequency: "weekly", priority: 5 },
];

// ── TOP COMMUNITY FOUNDATIONS ──────────────────────────────────────────
const COMMUNITY_FOUNDATIONS: Entry[] = [
  { name: "Silicon Valley Community Foundation", organization: "SVCF", category: "community_foundation", website: "siliconvalleycf.org", annual_budget: "$1B+", geographic_focus: "Bay Area, CA", crawl_frequency: "monthly", priority: 4 },
  { name: "Chicago Community Trust", organization: "CCT", category: "community_foundation", website: "cct.org", annual_budget: "$300M+", geographic_focus: "Chicago, IL", crawl_frequency: "monthly", priority: 4 },
  { name: "New York Community Trust", organization: "NYCT", category: "community_foundation", website: "nycommunitytrust.org", annual_budget: "$200M+", geographic_focus: "NYC, NY", crawl_frequency: "monthly", priority: 4 },
  { name: "Cleveland Foundation", organization: "Cleveland Foundation", category: "community_foundation", website: "clevelandfoundation.org", annual_budget: "$120M+", geographic_focus: "Cleveland, OH", crawl_frequency: "monthly", priority: 5 },
  { name: "Boston Foundation", organization: "TBF", category: "community_foundation", website: "tbf.org", annual_budget: "$150M+", geographic_focus: "Boston, MA", crawl_frequency: "monthly", priority: 5 },
  { name: "Oregon Community Foundation", organization: "OCF", category: "community_foundation", website: "oregoncf.org", annual_budget: "$150M+", geographic_focus: "Oregon", crawl_frequency: "monthly", priority: 5 },
  { name: "San Francisco Foundation", organization: "SFF", category: "community_foundation", website: "sff.org", annual_budget: "$100M+", geographic_focus: "Bay Area, CA", crawl_frequency: "monthly", priority: 5 },
  { name: "Greater Kansas City Community Foundation", organization: "GKCCF", category: "community_foundation", website: "growyourgiving.org", annual_budget: "$500M+", geographic_focus: "Kansas City, MO", crawl_frequency: "monthly", priority: 5 },
  { name: "Columbus Foundation", organization: "Columbus Foundation", category: "community_foundation", website: "columbusfoundation.org", annual_budget: "$200M+", geographic_focus: "Columbus, OH", crawl_frequency: "monthly", priority: 5 },
  { name: "Foundation For The Carolinas", organization: "FFTC", category: "community_foundation", website: "fftc.org", annual_budget: "$150M+", geographic_focus: "Charlotte, NC", crawl_frequency: "monthly", priority: 5 },
  { name: "Greater Atlanta Community Foundation", organization: "CFGA", category: "community_foundation", website: "cfgreateratlanta.org", annual_budget: "$150M+", geographic_focus: "Atlanta, GA", crawl_frequency: "monthly", priority: 5 },
  { name: "Denver Foundation", organization: "Denver Foundation", category: "community_foundation", website: "denverfoundation.org", annual_budget: "$80M+", geographic_focus: "Denver, CO", crawl_frequency: "monthly", priority: 5 },
  { name: "Seattle Foundation", organization: "Seattle Foundation", category: "community_foundation", website: "seattlefoundation.org", annual_budget: "$80M+", geographic_focus: "Seattle, WA", crawl_frequency: "monthly", priority: 5 },
  { name: "San Diego Foundation", organization: "SDF", category: "community_foundation", website: "sdfoundation.org", annual_budget: "$100M+", geographic_focus: "San Diego, CA", crawl_frequency: "monthly", priority: 5 },
  { name: "Arizona Community Foundation", organization: "ACF", category: "community_foundation", website: "azfoundation.org", annual_budget: "$80M+", geographic_focus: "Arizona", crawl_frequency: "monthly", priority: 5 },
  { name: "Hawaii Community Foundation", organization: "HCF", category: "community_foundation", website: "hawaiicommunityfoundation.org", annual_budget: "$60M+", geographic_focus: "Hawaii", crawl_frequency: "monthly", priority: 6 },
  { name: "Miami Foundation", organization: "Miami Foundation", category: "community_foundation", website: "miamifoundation.org", annual_budget: "$40M+", geographic_focus: "Miami, FL", crawl_frequency: "monthly", priority: 5 },
  { name: "Community Foundation of Tampa Bay", organization: "CFTB", category: "community_foundation", website: "cftampabay.org", annual_budget: "$40M+", geographic_focus: "Tampa, FL", crawl_frequency: "monthly", priority: 5 },
  { name: "Greater Houston Community Foundation", organization: "GHCF", category: "community_foundation", website: "ghcf.org", annual_budget: "$60M+", geographic_focus: "Houston, TX", crawl_frequency: "monthly", priority: 5 },
  { name: "Dallas Foundation", organization: "Dallas Foundation", category: "community_foundation", website: "dallasfoundation.org", annual_budget: "$40M+", geographic_focus: "Dallas, TX", crawl_frequency: "monthly", priority: 5 },
];

// ── DISEASE-SPECIFIC FOUNDATIONS ───────────────────────────────────────
const DISEASE: Entry[] = [
  { name: "American Cancer Society", organization: "ACS", category: "disease_specific", website: "cancer.org/research", focus_areas: ["cancer research", "patient support"], crawl_frequency: "monthly", priority: 5 },
  { name: "American Heart Association", organization: "AHA", category: "disease_specific", website: "heart.org/en/professional/research", focus_areas: ["heart disease", "stroke"], crawl_frequency: "monthly", priority: 5 },
  { name: "American Diabetes Association", organization: "ADA", category: "disease_specific", website: "diabetes.org/research", focus_areas: ["diabetes"], crawl_frequency: "monthly", priority: 6 },
  { name: "Alzheimer's Association", organization: "Alzheimers Assoc", category: "disease_specific", website: "alz.org/research", focus_areas: ["alzheimer's", "dementia"], crawl_frequency: "monthly", priority: 6 },
  { name: "Michael J. Fox Foundation", organization: "MJFF", category: "disease_specific", website: "michaeljfox.org", focus_areas: ["parkinson's"], crawl_frequency: "monthly", priority: 6 },
  { name: "Leukemia & Lymphoma Society", organization: "LLS", category: "disease_specific", website: "lls.org", focus_areas: ["blood cancers"], crawl_frequency: "monthly", priority: 6 },
  { name: "March of Dimes", organization: "March of Dimes", category: "disease_specific", website: "marchofdimes.org", focus_areas: ["premature birth", "birth defects"], crawl_frequency: "monthly", priority: 6 },
  { name: "Susan G. Komen", organization: "Komen", category: "disease_specific", website: "komen.org", focus_areas: ["breast cancer"], crawl_frequency: "monthly", priority: 6 },
  { name: "Brain & Behavior Research Foundation", organization: "BBRF", category: "disease_specific", website: "bbrfoundation.org", focus_areas: ["mental health research"], crawl_frequency: "monthly", priority: 6 },
];

// ── CORPORATE FOUNDATIONS (extended) ──────────────────────────────────
const MORE_CORPORATE: Entry[] = [
  { name: "Cisco Foundation", organization: "Cisco", category: "corporate_foundation", website: "cisco.com/c/en/us/about/csr", focus_areas: ["education", "disaster"], crawl_frequency: "monthly", priority: 5 },
  { name: "Intel Foundation", organization: "Intel", category: "corporate_foundation", website: "intel.com/content/www/us/en/corporate-responsibility/social-impact", focus_areas: ["STEM", "diversity"], crawl_frequency: "monthly", priority: 5 },
  { name: "Dell Technologies", organization: "Dell", category: "corporate_foundation", website: "dell.com/en-us/dt/corporate/social-impact", focus_areas: ["STEM", "youth"], crawl_frequency: "monthly", priority: 5 },
  { name: "Adobe Foundation", organization: "Adobe", category: "corporate_foundation", website: "adobe.com/corporate-responsibility/creativity", focus_areas: ["creativity", "education"], crawl_frequency: "monthly", priority: 6 },
  { name: "Verizon Foundation", organization: "Verizon", category: "corporate_foundation", website: "verizon.com/about/responsibility", focus_areas: ["digital inclusion"], crawl_frequency: "monthly", priority: 5 },
  { name: "AT&T Foundation", organization: "AT&T", category: "corporate_foundation", website: "att.com/csr", focus_areas: ["education", "technology"], crawl_frequency: "monthly", priority: 5 },
  { name: "Coca-Cola Foundation", organization: "Coca-Cola", category: "corporate_foundation", website: "coca-colacompany.com/shared-future/coca-cola-foundation", focus_areas: ["water", "women", "community"], crawl_frequency: "monthly", priority: 5 },
  { name: "PepsiCo Foundation", organization: "PepsiCo", category: "corporate_foundation", website: "pepsico.com/sustainability/strategy/philanthropy", focus_areas: ["food security", "water"], crawl_frequency: "monthly", priority: 6 },
  { name: "Citi Foundation", organization: "Citi", category: "corporate_foundation", website: "citigroup.com/citi/foundation", focus_areas: ["youth employment", "financial inclusion"], crawl_frequency: "monthly", priority: 5 },
  { name: "UPS Foundation", organization: "UPS", category: "corporate_foundation", website: "ups.com/us/en/about/ups-foundation", focus_areas: ["diversity", "environment"], crawl_frequency: "monthly", priority: 6 },
  { name: "Pfizer Foundation", organization: "Pfizer", category: "corporate_foundation", website: "pfizer.com/purpose/contributions-partnerships", focus_areas: ["healthcare access", "STEM"], crawl_frequency: "monthly", priority: 5 },
  { name: "Johnson & Johnson Foundation", organization: "J&J", category: "corporate_foundation", website: "jnj.com/about-jnj/jnj-foundation", focus_areas: ["health", "nursing"], crawl_frequency: "monthly", priority: 5 },
  { name: "Bristol-Myers Squibb Foundation", organization: "BMS", category: "corporate_foundation", website: "bms.com/about-us/responsibility/bristol-myers-squibb-foundation", focus_areas: ["health equity", "cancer"], crawl_frequency: "monthly", priority: 5 },
  { name: "Lockheed Martin Foundation", organization: "Lockheed Martin", category: "corporate_foundation", website: "lockheedmartin.com/en-us/who-we-are/communities", focus_areas: ["STEM"], crawl_frequency: "monthly", priority: 6 },
  { name: "Boeing Foundation", organization: "Boeing", category: "corporate_foundation", website: "boeing.com/principles/community-engagement", focus_areas: ["education", "veterans"], crawl_frequency: "monthly", priority: 6 },
];

// ── FAITH-BASED ───────────────────────────────────────────────────────
const FAITH: Entry[] = [
  { name: "Catholic Campaign for Human Development", organization: "USCCB", category: "faith_based", website: "usccb.org/about/catholic-campaign-for-human-development", focus_areas: ["poverty", "justice"], grant_range: "$25K-$75K", crawl_frequency: "quarterly", priority: 7 },
  { name: "Lilly Endowment Religion", organization: "Lilly Endowment", category: "faith_based", website: "lillyendowment.org", focus_areas: ["religion", "community"], crawl_frequency: "quarterly", priority: 6 },
  { name: "Templeton Foundation", organization: "John Templeton Foundation", category: "faith_based", website: "templeton.org", focus_areas: ["science and religion"], grant_range: "$50K-$5M", crawl_frequency: "monthly", priority: 5 },
  { name: "Koch Foundation", organization: "Koch Foundation", category: "faith_based", website: "kochfoundation.org", focus_areas: ["Catholic education"], crawl_frequency: "quarterly", priority: 7 },
  { name: "Hilton Foundation", organization: "Conrad N. Hilton Foundation", category: "faith_based", subcategory: "Catholic", website: "hiltonfoundation.org", focus_areas: ["Catholic Sisters", "homelessness", "water"], grant_range: "$100K-$5M", crawl_frequency: "monthly", priority: 5 },
];

// ── VETERANS & MILITARY ───────────────────────────────────────────────
const VETERANS: Entry[] = [
  { name: "Bob Woodruff Foundation", organization: "BWF", category: "other", subcategory: "veterans", website: "bobwoodrufffoundation.org", focus_areas: ["post-9/11 veterans"], crawl_frequency: "monthly", priority: 5 },
  { name: "Wounded Warrior Project", organization: "WWP", category: "other", subcategory: "veterans", website: "woundedwarriorproject.org", focus_areas: ["wounded veterans"], crawl_frequency: "monthly", priority: 6 },
  { name: "Gary Sinise Foundation", organization: "GSF", category: "other", subcategory: "veterans", website: "garysinisefoundation.org", focus_areas: ["veterans", "first responders"], crawl_frequency: "monthly", priority: 6 },
  { name: "Fisher House Foundation", organization: "Fisher House", category: "other", subcategory: "veterans", website: "fisherhouse.org", focus_areas: ["military families"], crawl_frequency: "quarterly", priority: 7 },
];

// ── WOMEN & MINORITIES ────────────────────────────────────────────────
const DEMOGRAPHICS: Entry[] = [
  { name: "Ms. Foundation for Women", organization: "Ms. Foundation", category: "other", subcategory: "women", website: "forwomen.org", focus_areas: ["women's rights"], crawl_frequency: "monthly", priority: 5 },
  { name: "Global Fund for Women", organization: "GFW", category: "other", subcategory: "women", website: "globalfundforwomen.org", focus_areas: ["women's rights globally"], crawl_frequency: "monthly", priority: 6 },
  { name: "First Nations Development Institute", organization: "First Nations", category: "other", subcategory: "indigenous", website: "firstnations.org", focus_areas: ["Native communities"], crawl_frequency: "monthly", priority: 5 },
  { name: "Hispanic Federation", organization: "Hispanic Federation", category: "other", subcategory: "hispanic", website: "hispanicfederation.org", focus_areas: ["Latino community"], crawl_frequency: "monthly", priority: 5 },
  { name: "Arcus Foundation", organization: "Arcus Foundation", category: "other", subcategory: "lgbtq", website: "arcusfoundation.org", focus_areas: ["LGBTQ rights"], crawl_frequency: "monthly", priority: 6 },
];

// ── ENVIRONMENT & CLIMATE ─────────────────────────────────────────────
const ENVIRONMENT: Entry[] = [
  { name: "ClimateWorks Foundation", organization: "ClimateWorks", category: "national_foundation", subcategory: "climate", website: "climateworks.org", focus_areas: ["climate mitigation"], grant_range: "$100K-$10M", crawl_frequency: "monthly", priority: 4 },
  { name: "Energy Foundation", organization: "Energy Foundation", category: "national_foundation", subcategory: "climate", website: "ef.org", focus_areas: ["clean energy policy"], grant_range: "$50K-$2M", crawl_frequency: "monthly", priority: 4 },
  { name: "National Fish and Wildlife Foundation", organization: "NFWF", category: "national_foundation", subcategory: "conservation", website: "nfwf.org", focus_areas: ["conservation"], grant_range: "$25K-$1M", crawl_frequency: "weekly", priority: 4 },
  { name: "Patagonia Environmental Grants", organization: "Patagonia", category: "corporate_foundation", subcategory: "environment", website: "patagonia.com/actionworks", focus_areas: ["grassroots environment"], grant_range: "Up to $20K", crawl_frequency: "monthly", priority: 6 },
];

// ── RESEARCH FUNDERS ──────────────────────────────────────────────────
const RESEARCH: Entry[] = [
  { name: "Howard Hughes Medical Institute", organization: "HHMI", category: "research", website: "hhmi.org", focus_areas: ["biomedical research"], crawl_frequency: "monthly", priority: 4 },
  { name: "Wellcome Trust", organization: "Wellcome", category: "research", website: "wellcome.org", focus_areas: ["global health research"], crawl_frequency: "monthly", priority: 4 },
  { name: "Sloan Foundation", organization: "Alfred P. Sloan Foundation", category: "research", website: "sloan.org", focus_areas: ["science", "economics"], crawl_frequency: "monthly", priority: 5 },
  { name: "Russell Sage Foundation", organization: "RSF", category: "research", website: "russellsage.org", focus_areas: ["social science"], grant_range: "$50K-$175K", crawl_frequency: "monthly", priority: 5 },
  { name: "W.M. Keck Foundation", organization: "Keck Foundation", category: "research", website: "wmkeck.org", focus_areas: ["science", "engineering"], grant_range: "$100K-$2M", crawl_frequency: "monthly", priority: 5 },
];

// ── ARTS & CULTURE ────────────────────────────────────────────────────
const ARTS: Entry[] = [
  { name: "Andrew W. Mellon Foundation", organization: "Mellon Foundation", category: "national_foundation", subcategory: "arts", website: "mellon.org", focus_areas: ["arts", "humanities", "higher ed"], grant_range: "$100K-$5M", crawl_frequency: "monthly", priority: 4 },
  { name: "Doris Duke Charitable Foundation", organization: "DDCF", category: "national_foundation", subcategory: "arts", website: "ddcf.org", focus_areas: ["performing arts", "environment"], crawl_frequency: "monthly", priority: 5 },
  { name: "Wallace Foundation", organization: "Wallace Foundation", category: "national_foundation", subcategory: "arts", website: "wallacefoundation.org", focus_areas: ["arts participation"], grant_range: "$100K-$2M", crawl_frequency: "monthly", priority: 5 },
  { name: "Jerome Foundation", organization: "Jerome Foundation", category: "national_foundation", subcategory: "arts", website: "jeromefdn.org", focus_areas: ["emerging artists"], geographic_focus: "MN, NYC", crawl_frequency: "monthly", priority: 6 },
  { name: "Creative Capital", organization: "Creative Capital", category: "other", subcategory: "arts", website: "creative-capital.org", focus_areas: ["artists"], grant_range: "$50K", crawl_frequency: "quarterly", priority: 6 },
];

// ── DISASTER & RAPID RESPONSE ─────────────────────────────────────────
const DISASTER: Entry[] = [
  { name: "FEMA Public Assistance", organization: "FEMA", category: "disaster", website: "fema.gov", focus_areas: ["disaster relief"], crawl_frequency: "daily", priority: 3 },
  { name: "SBA Disaster Loans", organization: "SBA", category: "disaster", website: "sba.gov/disaster", focus_areas: ["business disaster recovery"], crawl_frequency: "daily", priority: 3 },
  { name: "Urgent Action Fund for Women", organization: "UAF", category: "disaster", website: "urgentactionfund.org", focus_areas: ["women's rights crises"], crawl_frequency: "weekly", priority: 6 },
];

// ── FELLOWSHIPS ───────────────────────────────────────────────────────
const FELLOWSHIPS: Entry[] = [
  { name: "Echoing Green Fellowship", organization: "Echoing Green", category: "fellowship", website: "echoinggreen.org", focus_areas: ["social entrepreneurs"], grant_range: "$80K over 2 years", crawl_frequency: "quarterly", priority: 5 },
  { name: "Ashoka Fellowship", organization: "Ashoka", category: "fellowship", website: "ashoka.org", focus_areas: ["social entrepreneurs"], crawl_frequency: "quarterly", priority: 5 },
  { name: "Draper Richards Kaplan Foundation", organization: "DRK Foundation", category: "fellowship", website: "drkfoundation.org", focus_areas: ["early-stage nonprofits"], grant_range: "$300K over 3 years", crawl_frequency: "quarterly", priority: 5 },
  { name: "Skoll Award", organization: "Skoll Foundation", category: "fellowship", website: "skoll.org", focus_areas: ["social entrepreneurs"], grant_range: "$1.5M", crawl_frequency: "quarterly", priority: 5 },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const ALL = [
    ...STATES, ...COMMUNITY_FOUNDATIONS, ...DISEASE, ...MORE_CORPORATE,
    ...FAITH, ...VETERANS, ...DEMOGRAPHICS, ...ENVIRONMENT,
    ...RESEARCH, ...ARTS, ...DISASTER, ...FELLOWSHIPS,
  ];

  // Set defaults
  for (const e of ALL) {
    e.ingestion_status = e.ingestion_status ?? "not_started";
    e.crawl_frequency = e.crawl_frequency ?? "monthly";
    e.priority = e.priority ?? 5;
  }

  console.log(`Seeding ${ALL.length} additional sources...`);

  const { data: existing } = await supabase
    .from("grant_source_directory")
    .select("name, organization");

  const existingSet = new Set(
    (existing ?? []).map((e: { name: string; organization: string }) => `${e.name}|||${e.organization}`)
  );

  const newEntries = ALL.filter((e) => !existingSet.has(`${e.name}|||${e.organization}`));
  console.log(`${existingSet.size} already exist, ${newEntries.length} new to insert`);

  if (newEntries.length === 0) {
    console.log("Nothing new to insert.");
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

  console.log(`Done. ${inserted} new sources added. Total in directory: ${existingSet.size + inserted}`);
}

main().catch(console.error);
