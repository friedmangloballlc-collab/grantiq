/**
 * Seeds ALL remaining grant sources — corporate foundations, community foundations,
 * disease-specific, international, fiscal sponsors, and more.
 * Deduplicates against existing entries automatically.
 *
 * Usage: npx tsx scripts/seed-directory-remaining.ts
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

// ── CORPORATE FOUNDATIONS (A-M) ───────────────────────────────────────
const CORP_AM: Entry[] = [
  { name: "3M Foundation", organization: "3M", category: "corporate_foundation", website: "3m.com/gives", focus_areas: ["education", "community", "environment"], priority: 6 },
  { name: "Abbott Fund", organization: "Abbott", category: "corporate_foundation", website: "abbott.com/responsibility", focus_areas: ["health", "nutrition", "STEM"], priority: 6 },
  { name: "AbbVie Foundation", organization: "AbbVie", category: "corporate_foundation", website: "abbvie.com/responsibility", focus_areas: ["healthcare", "STEM"], priority: 6 },
  { name: "Accenture Foundation", organization: "Accenture", category: "corporate_foundation", website: "accenture.com/us-en/about/accenture-foundation-index", focus_areas: ["skills training", "digital"], priority: 6 },
  { name: "Aflac Foundation", organization: "Aflac", category: "corporate_foundation", website: "aflac.com/about-aflac/corporate-citizenship", focus_areas: ["childhood cancer"], priority: 7 },
  { name: "Albertsons Foundation", organization: "Albertsons", category: "corporate_foundation", website: "albertsonscompanies.com/our-impact", focus_areas: ["hunger", "health"], priority: 7 },
  { name: "Allstate Foundation", organization: "Allstate", category: "corporate_foundation", website: "allstatefoundation.org", focus_areas: ["youth", "domestic violence"], priority: 6 },
  { name: "Amazon", organization: "Amazon", category: "corporate_foundation", website: "aboutamazon.com/impact", focus_areas: ["housing", "STEM", "disaster"], priority: 5 },
  { name: "American Express Foundation", organization: "American Express", category: "corporate_foundation", website: "americanexpress.com/en-us/company/corporate-responsibility", focus_areas: ["historic preservation", "leadership"], priority: 6 },
  { name: "Amgen Foundation", organization: "Amgen", category: "corporate_foundation", website: "amgen.com/responsibility/amgen-foundation", focus_areas: ["science education", "healthcare"], priority: 6 },
  { name: "Apple Giving", organization: "Apple", category: "corporate_foundation", website: "apple.com/giving", focus_areas: ["education", "environment"], priority: 6 },
  { name: "Bank of America Foundation", organization: "Bank of America", category: "corporate_foundation", website: "bankofamerica.com/foundation", focus_areas: ["economic mobility", "workforce"], priority: 4 },
  { name: "Best Buy Foundation", organization: "Best Buy", category: "corporate_foundation", website: "bestbuy.com/site/best-buy-foundation", focus_areas: ["teen tech"], priority: 6 },
  { name: "Boeing Foundation", organization: "Boeing", category: "corporate_foundation", website: "boeing.com/principles/community-engagement", focus_areas: ["education", "veterans"], priority: 6 },
  { name: "Capital One", organization: "Capital One", category: "corporate_foundation", website: "capitalone.com/about/corporate-citizenship", focus_areas: ["financial literacy", "workforce"], priority: 5 },
  { name: "Caterpillar Foundation", organization: "Caterpillar", category: "corporate_foundation", website: "caterpillar.com/en/company/caterpillar-foundation", focus_areas: ["environment", "education"], priority: 6 },
  { name: "Chevron", organization: "Chevron", category: "corporate_foundation", website: "chevron.com/sustainability/social", focus_areas: ["education", "health", "economic development"], priority: 6 },
  { name: "Chick-fil-A Foundation", organization: "Chick-fil-A", category: "corporate_foundation", website: "chick-fil-a.com/about/giving-back", focus_areas: ["youth", "education"], priority: 7 },
  { name: "Cigna Foundation", organization: "Cigna", category: "corporate_foundation", website: "cigna.com/about-us/corporate-responsibility/cigna-foundation", focus_areas: ["health", "wellness"], priority: 6 },
  { name: "Comcast Foundation", organization: "Comcast NBCUniversal", category: "corporate_foundation", website: "comcastcorporation.com/impact", focus_areas: ["digital equity", "entrepreneurship"], priority: 5 },
  { name: "Costco Charitable", organization: "Costco", category: "corporate_foundation", website: "costco.com/charitable-giving-standards-and-guidelines.html", focus_areas: ["children", "education"], priority: 7 },
  { name: "CVS Health Foundation", organization: "CVS Health", category: "corporate_foundation", website: "cvshealth.com/social-responsibility/cvs-health-foundation", focus_areas: ["smoking cessation", "health"], priority: 5 },
  { name: "Deere Foundation", organization: "John Deere", category: "corporate_foundation", website: "deere.com/en/our-company/about-john-deere/giving", focus_areas: ["education", "hunger"], priority: 6 },
  { name: "Delta Air Lines Foundation", organization: "Delta", category: "corporate_foundation", website: "delta.com/us/en/about-delta/community", focus_areas: ["veterans", "education"], priority: 6 },
  { name: "Discover Foundation", organization: "Discover", category: "corporate_foundation", website: "discover.com/company/our-company/discover-foundation", focus_areas: ["financial education"], priority: 7 },
  { name: "Dollar General Literacy Foundation", organization: "Dollar General", category: "corporate_foundation", website: "dglfcommunity.com", focus_areas: ["literacy"], priority: 5 },
  { name: "Dominion Energy Foundation", organization: "Dominion Energy", category: "corporate_foundation", website: "dominionenergy.com/company/community/corporate-giving", focus_areas: ["education", "environment"], priority: 6 },
  { name: "Dow Foundation", organization: "Dow", category: "corporate_foundation", website: "dow.com/en-us/about/company/corporate-affairs/corporate-citizenship", focus_areas: ["education", "STEM"], priority: 6 },
  { name: "Duke Energy Foundation", organization: "Duke Energy", category: "corporate_foundation", website: "duke-energy.com/our-company/about-us/foundation", focus_areas: ["education", "environment"], priority: 6 },
  { name: "Eli Lilly Foundation", organization: "Eli Lilly", category: "corporate_foundation", website: "lilly.com/about/corporate-responsibility", focus_areas: ["education", "community"], geographic_focus: "Indiana", priority: 6 },
  { name: "ExxonMobil Foundation", organization: "ExxonMobil", category: "corporate_foundation", website: "corporate.exxonmobil.com/Community-engagement", focus_areas: ["education", "women", "malaria"], priority: 5 },
  { name: "Ford Motor Company Fund", organization: "Ford Motor", category: "corporate_foundation", website: "ford.com/about/community", focus_areas: ["driving", "mobility", "community"], priority: 6 },
  { name: "Gap Foundation", organization: "Gap Inc", category: "corporate_foundation", website: "gapinc.com/en-us/values/sustainability/social/gap-foundation", focus_areas: ["youth opportunity"], priority: 7 },
  { name: "GE Foundation", organization: "General Electric", category: "corporate_foundation", website: "ge.com/sustainability/ge-foundation", focus_areas: ["health", "education", "disaster"], priority: 5 },
  { name: "General Mills Foundation", organization: "General Mills", category: "corporate_foundation", website: "generalmills.com/company/giving-back", focus_areas: ["hunger", "sustainability"], priority: 6 },
  { name: "GM Foundation", organization: "General Motors", category: "corporate_foundation", website: "gm.com/company/giving.html", focus_areas: ["STEM", "safety", "community"], priority: 6 },
  { name: "Gilead Sciences", organization: "Gilead", category: "corporate_foundation", website: "gilead.com/purpose/giving", focus_areas: ["HIV/AIDS", "hepatitis", "cancer"], priority: 5 },
  { name: "Goldman Sachs Foundation", organization: "Goldman Sachs", category: "corporate_foundation", website: "goldmansachs.com/our-firm/history/philanthropy", focus_areas: ["education", "small business"], priority: 5 },
  { name: "Hallmark Foundation", organization: "Hallmark", category: "corporate_foundation", website: "hallmark.com/responsible-business", focus_areas: ["arts", "literacy"], geographic_focus: "Kansas City", priority: 7 },
  { name: "Hershey Foundation", organization: "Hershey", category: "corporate_foundation", website: "thehersheycompany.com/en_us/sustainability.html", focus_areas: ["youth", "children"], priority: 7 },
  { name: "Honeywell Foundation", organization: "Honeywell", category: "corporate_foundation", website: "honeywell.com/us/en/company/corporate-responsibility", focus_areas: ["STEM", "housing"], priority: 6 },
  { name: "Humana Foundation", organization: "Humana", category: "corporate_foundation", website: "humanafoundation.org", focus_areas: ["health", "food security"], priority: 5 },
  { name: "IBM Foundation", organization: "IBM", category: "corporate_foundation", website: "ibm.org", focus_areas: ["education", "workforce"], priority: 5 },
  { name: "KeyBank Foundation", organization: "KeyBank", category: "corporate_foundation", website: "key.com/about/community/key-foundation", focus_areas: ["education", "workforce"], priority: 6 },
  { name: "Kohl's Cares", organization: "Kohl's", category: "corporate_foundation", website: "corporate.kohls.com/community", focus_areas: ["children's health"], priority: 7 },
  { name: "Kraft Heinz Foundation", organization: "Kraft Heinz", category: "corporate_foundation", website: "kraftheinzcompany.com/esg/community", focus_areas: ["hunger", "nutrition"], priority: 6 },
  { name: "Kroger Foundation", organization: "Kroger", category: "corporate_foundation", website: "thekrogerco.com/community/zero-hunger-zero-waste-foundation", focus_areas: ["hunger"], priority: 6 },
  { name: "Levi Strauss Foundation", organization: "Levi Strauss", category: "corporate_foundation", website: "levistrauss.com/values-in-action/levi-strauss-foundation", focus_areas: ["worker wellbeing", "HIV/AIDS"], priority: 6 },
  { name: "Lowe's Foundation", organization: "Lowe's", category: "corporate_foundation", website: "lowes.com/l/company-information/community", focus_areas: ["housing", "trades"], priority: 5 },
  { name: "Macy's Foundation", organization: "Macy's", category: "corporate_foundation", website: "macysinc.com/purpose", focus_areas: ["education", "HIV/AIDS"], priority: 6 },
  { name: "Marriott Foundation", organization: "Marriott", category: "corporate_foundation", website: "marriott.com/about/social-responsibility", focus_areas: ["youth employment"], priority: 6 },
  { name: "Mastercard Foundation", organization: "Mastercard", category: "corporate_foundation", website: "mastercardfdn.org", focus_areas: ["youth livelihoods", "financial inclusion"], geographic_focus: "Africa", priority: 5 },
  { name: "McDonald's Foundation", organization: "McDonald's", category: "corporate_foundation", website: "mcdonalds.com/us/en-us/community", focus_areas: ["education", "Ronald McDonald Houses"], priority: 6 },
  { name: "McKesson Foundation", organization: "McKesson", category: "corporate_foundation", website: "mckesson.com/Our-Company/Community-Impact", focus_areas: ["health", "STEM"], priority: 6 },
  { name: "Medtronic Foundation", organization: "Medtronic", category: "corporate_foundation", website: "foundation.medtronic.com", focus_areas: ["healthcare access"], priority: 5 },
  { name: "Merck Foundation", organization: "Merck", category: "corporate_foundation", website: "merck.com/company-overview/responsibility", focus_areas: ["health", "access to medicines"], priority: 5 },
  { name: "MetLife Foundation", organization: "MetLife", category: "corporate_foundation", website: "metlife.com/about-us/corporate-responsibility/metlife-foundation", focus_areas: ["financial health"], priority: 6 },
  { name: "Morgan Stanley Foundation", organization: "Morgan Stanley", category: "corporate_foundation", website: "morganstanley.com/about-us-governance/giving-back", focus_areas: ["education"], geographic_focus: "NYC", priority: 6 },
  { name: "Motorola Solutions Foundation", organization: "Motorola Solutions", category: "corporate_foundation", website: "motorolasolutions.com/en_us/about/company-overview/corporate-responsibility", focus_areas: ["STEM", "public safety"], priority: 6 },
];

// ── CORPORATE FOUNDATIONS (N-Z) ───────────────────────────────────────
const CORP_NZ: Entry[] = [
  { name: "Nestlé Foundation", organization: "Nestlé", category: "corporate_foundation", website: "nestleusa.com/csv", focus_areas: ["nutrition", "rural development"], priority: 6 },
  { name: "Nike Foundation", organization: "Nike", category: "corporate_foundation", website: "about.nike.com/en/impact", focus_areas: ["sport for development"], priority: 6 },
  { name: "Nordstrom", organization: "Nordstrom", category: "corporate_foundation", website: "nordstrom.com/browse/about/community", focus_areas: ["community", "diversity"], priority: 7 },
  { name: "Northrop Grumman Foundation", organization: "Northrop Grumman", category: "corporate_foundation", website: "northropgrumman.com/corporate-responsibility", focus_areas: ["STEM"], priority: 6 },
  { name: "Northwestern Mutual Foundation", organization: "Northwestern Mutual", category: "corporate_foundation", website: "northwesternmutual.com/foundation", focus_areas: ["childhood cancer"], priority: 6 },
  { name: "NVIDIA Foundation", organization: "NVIDIA", category: "corporate_foundation", website: "nvidia.com/en-us/foundation", focus_areas: ["STEM", "AI for good"], priority: 5 },
  { name: "Oracle Foundation", organization: "Oracle", category: "corporate_foundation", website: "oracle.com/corporate/citizenship", focus_areas: ["education", "environment"], priority: 6 },
  { name: "PayPal Foundation", organization: "PayPal", category: "corporate_foundation", website: "about.pypl.com/values-in-action", focus_areas: ["financial health", "economic opportunity"], priority: 6 },
  { name: "PNC Foundation", organization: "PNC", category: "corporate_foundation", website: "pnc.com/en/about-pnc/corporate-responsibility/philanthropy", focus_areas: ["education", "arts"], priority: 5 },
  { name: "P&G Foundation", organization: "Procter & Gamble", category: "corporate_foundation", website: "pg.com/community-impact", focus_areas: ["disaster relief", "education"], priority: 5 },
  { name: "Prudential Foundation", organization: "Prudential", category: "corporate_foundation", website: "prudential.com/links/about/corporate-social-responsibility", focus_areas: ["financial wellness", "Newark"], priority: 5 },
  { name: "Publix Charities", organization: "Publix", category: "corporate_foundation", website: "publix.com/sustainability", focus_areas: ["hunger"], geographic_focus: "Southeast US", priority: 6 },
  { name: "Qualcomm Foundation", organization: "Qualcomm", category: "corporate_foundation", website: "qualcomm.com/company/corporate-responsibility", focus_areas: ["STEM"], priority: 6 },
  { name: "Raytheon Foundation", organization: "RTX/Raytheon", category: "corporate_foundation", website: "rtx.com/responsibility/citizenship", focus_areas: ["STEM", "military"], priority: 6 },
  { name: "REI Co-op", organization: "REI", category: "corporate_foundation", website: "rei.com/stewardship/community", focus_areas: ["outdoor access", "environment"], priority: 6 },
  { name: "SAP Foundation", organization: "SAP", category: "corporate_foundation", website: "sap.com/about/company/purpose-and-sustainability", focus_areas: ["education", "entrepreneurship"], priority: 6 },
  { name: "Shell Foundation", organization: "Shell", category: "corporate_foundation", website: "shellfoundation.org", focus_areas: ["energy access", "mobility"], priority: 6 },
  { name: "Siemens Foundation", organization: "Siemens", category: "corporate_foundation", website: "siemens-foundation.org", focus_areas: ["STEM"], priority: 6 },
  { name: "Southern Company Foundation", organization: "Southern Company", category: "corporate_foundation", website: "southerncompany.com/about-us/community", focus_areas: ["education", "environment"], priority: 6 },
  { name: "Starbucks Foundation", organization: "Starbucks", category: "corporate_foundation", website: "starbucks.com/responsibility/community", focus_areas: ["youth", "veterans"], priority: 5 },
  { name: "State Farm Foundation", organization: "State Farm", category: "corporate_foundation", website: "statefarm.com/about-us/community-involvement", focus_areas: ["safety", "education"], priority: 5 },
  { name: "Synchrony Foundation", organization: "Synchrony", category: "corporate_foundation", website: "synchrony.com/about-us/social-responsibility", focus_areas: ["financial education"], priority: 7 },
  { name: "T-Mobile Foundation", organization: "T-Mobile", category: "corporate_foundation", website: "t-mobile.com/responsibility", focus_areas: ["youth", "diversity"], priority: 6 },
  { name: "Taco Bell Foundation", organization: "Taco Bell", category: "corporate_foundation", website: "tacobellfoundation.org", focus_areas: ["youth education"], priority: 7 },
  { name: "Target Foundation", organization: "Target", category: "corporate_foundation", website: "corporate.target.com/corporate-responsibility", focus_areas: ["wellbeing", "education"], priority: 5 },
  { name: "TD Bank Foundation", organization: "TD Bank", category: "corporate_foundation", website: "td.com/responsibility", focus_areas: ["housing", "financial literacy"], priority: 6 },
  { name: "Texas Instruments Foundation", organization: "Texas Instruments", category: "corporate_foundation", website: "ti.com/about-ti/communities/giving", focus_areas: ["STEM"], priority: 6 },
  { name: "Toyota USA Foundation", organization: "Toyota", category: "corporate_foundation", website: "toyotausa.com/community", focus_areas: ["STEM", "environment"], priority: 5 },
  { name: "Travelers Foundation", organization: "Travelers", category: "corporate_foundation", website: "travelers.com/about-travelers/community", focus_areas: ["education", "disaster"], priority: 6 },
  { name: "Tyson Foods Foundation", organization: "Tyson", category: "corporate_foundation", website: "tysonfoods.com/who-we-are/giving-back", focus_areas: ["hunger", "disaster"], priority: 6 },
  { name: "US Bank Foundation", organization: "US Bank", category: "corporate_foundation", website: "usbank.com/about-us-bank/community", focus_areas: ["economic empowerment"], priority: 5 },
  { name: "Union Pacific Foundation", organization: "Union Pacific", category: "corporate_foundation", website: "up.com/aboutup/community/foundation", focus_areas: ["safety", "community"], priority: 6 },
  { name: "United Airlines Foundation", organization: "United Airlines", category: "corporate_foundation", website: "united.com/en/us/fly/company/global-citizenship", focus_areas: ["education", "environment"], priority: 6 },
  { name: "UnitedHealth Foundation", organization: "UnitedHealth Group", category: "corporate_foundation", website: "unitedhealthgroup.com/what-we-do/united-health-foundation", focus_areas: ["health access"], priority: 5 },
  { name: "UPS Foundation", organization: "UPS", category: "corporate_foundation", website: "ups.com/us/en/about/ups-foundation", focus_areas: ["diversity", "environment", "safety"], priority: 5 },
  { name: "Visa Foundation", organization: "Visa", category: "corporate_foundation", website: "usa.visa.com/visa-everywhere/global-impact", focus_areas: ["small business", "financial inclusion"], priority: 5 },
  { name: "Walmart Foundation", organization: "Walmart", category: "corporate_foundation", website: "walmart.org", focus_areas: ["workforce", "hunger"], priority: 4 },
  { name: "Wells Fargo Foundation", organization: "Wells Fargo", category: "corporate_foundation", website: "wellsfargo.com/about/corporate-responsibility", focus_areas: ["housing", "small business"], priority: 4 },
];

// ── MORE COMMUNITY FOUNDATIONS ────────────────────────────────────────
const MORE_COMMUNITY: Entry[] = [
  { name: "Pittsburgh Foundation", organization: "Pittsburgh Foundation", category: "community_foundation", website: "pittsburghfoundation.org", geographic_focus: "Pittsburgh, PA", priority: 5 },
  { name: "Hartford Foundation", organization: "Hartford Foundation for Public Giving", category: "community_foundation", website: "hfpg.org", geographic_focus: "Hartford, CT", priority: 5 },
  { name: "Philadelphia Foundation", organization: "Philadelphia Foundation", category: "community_foundation", website: "philafound.org", geographic_focus: "Philadelphia, PA", priority: 5 },
  { name: "Rhode Island Foundation", organization: "RI Foundation", category: "community_foundation", website: "rifoundation.org", geographic_focus: "Rhode Island", priority: 6 },
  { name: "Maine Community Foundation", organization: "MaineCF", category: "community_foundation", website: "mainecf.org", geographic_focus: "Maine", priority: 6 },
  { name: "NH Charitable Foundation", organization: "NHCF", category: "community_foundation", website: "nhcf.org", geographic_focus: "New Hampshire", priority: 6 },
  { name: "Vermont Community Foundation", organization: "VCF", category: "community_foundation", website: "vermontcf.org", geographic_focus: "Vermont", priority: 6 },
  { name: "Community Foundation of NJ", organization: "CFNJ", category: "community_foundation", website: "cfnj.org", geographic_focus: "New Jersey", priority: 5 },
  { name: "Greater Milwaukee Foundation", organization: "GMF", category: "community_foundation", website: "greatermilwaukeefoundation.org", geographic_focus: "Milwaukee, WI", priority: 5 },
  { name: "Indianapolis Foundation", organization: "CICF", category: "community_foundation", website: "cicf.org", geographic_focus: "Indianapolis, IN", priority: 5 },
  { name: "Greater Cincinnati Foundation", organization: "GCF", category: "community_foundation", website: "gcfdn.org", geographic_focus: "Cincinnati, OH", priority: 5 },
  { name: "Minneapolis Foundation", organization: "Minneapolis Foundation", category: "community_foundation", website: "minneapolisfoundation.org", geographic_focus: "Minneapolis, MN", priority: 5 },
  { name: "Omaha Community Foundation", organization: "OCF", category: "community_foundation", website: "omahafoundation.org", geographic_focus: "Omaha, NE", priority: 6 },
  { name: "St. Louis Community Foundation", organization: "SLCF", category: "community_foundation", website: "stlgives.org", geographic_focus: "St. Louis, MO", priority: 5 },
  { name: "Grand Rapids Community Foundation", organization: "GRCF", category: "community_foundation", website: "grfoundation.org", geographic_focus: "Grand Rapids, MI", priority: 6 },
  { name: "Community Foundation of SE Michigan", organization: "CFSEM", category: "community_foundation", website: "cfsem.org", geographic_focus: "Detroit, MI", priority: 5 },
  { name: "Greater Des Moines Foundation", organization: "GDMF", category: "community_foundation", website: "desmoinesfoundation.org", geographic_focus: "Des Moines, IA", priority: 6 },
  { name: "Marin Community Foundation", organization: "MCF", category: "community_foundation", website: "marincf.org", geographic_focus: "Marin County, CA", priority: 6 },
  { name: "East Bay Community Foundation", organization: "EBCF", category: "community_foundation", website: "ebcf.org", geographic_focus: "Oakland, CA", priority: 5 },
  { name: "Sacramento Region Foundation", organization: "SRCF", category: "community_foundation", website: "sacregcf.org", geographic_focus: "Sacramento, CA", priority: 6 },
  { name: "Baton Rouge Area Foundation", organization: "BRAF", category: "community_foundation", website: "bfrpa.org", geographic_focus: "Baton Rouge, LA", priority: 6 },
  { name: "Greater New Orleans Foundation", organization: "GNOF", category: "community_foundation", website: "gnof.org", geographic_focus: "New Orleans, LA", priority: 5 },
  { name: "Nashville Community Foundation", organization: "CFMT", category: "community_foundation", website: "cfmt.org", geographic_focus: "Nashville, TN", priority: 5 },
  { name: "San Antonio Area Foundation", organization: "SAAF", category: "community_foundation", website: "saafdn.org", geographic_focus: "San Antonio, TX", priority: 5 },
  { name: "Austin Community Foundation", organization: "ACF Austin", category: "community_foundation", website: "austincf.org", geographic_focus: "Austin, TX", priority: 5 },
  { name: "Central Florida Foundation", organization: "CFF", category: "community_foundation", website: "cffound.org", geographic_focus: "Orlando, FL", priority: 6 },
  { name: "Community Foundation of North FL", organization: "CFNFL", category: "community_foundation", website: "jaxcf.org", geographic_focus: "Jacksonville, FL", priority: 6 },
  { name: "Triangle Community Foundation", organization: "TCF", category: "community_foundation", website: "trianglecf.org", geographic_focus: "Raleigh-Durham, NC", priority: 6 },
  { name: "Tulsa Community Foundation", organization: "TCF Tulsa", category: "community_foundation", website: "tulsacf.org", geographic_focus: "Tulsa, OK", priority: 5 },
  { name: "Communities Foundation of Texas", organization: "CFT", category: "community_foundation", website: "cftexas.org", geographic_focus: "Dallas, TX", priority: 5 },
];

// ── INTERNATIONAL & MULTILATERAL ──────────────────────────────────────
const INTERNATIONAL: Entry[] = [
  { name: "United Nations Foundation", organization: "UN Foundation", category: "international", website: "unfoundation.org", focus_areas: ["UN priorities"], priority: 5 },
  { name: "World Bank Trust Funds", organization: "World Bank", category: "international", website: "worldbank.org", focus_areas: ["development"], priority: 6 },
  { name: "Global Fund", organization: "Global Fund", category: "international", website: "theglobalfund.org", focus_areas: ["HIV/AIDS", "TB", "malaria"], priority: 5 },
  { name: "GAVI", organization: "GAVI Alliance", category: "international", website: "gavi.org", focus_areas: ["vaccines"], priority: 6 },
  { name: "Global Environment Facility", organization: "GEF", category: "international", website: "thegef.org", focus_areas: ["environment"], priority: 6 },
  { name: "Green Climate Fund", organization: "GCF", category: "international", website: "greenclimate.fund", focus_areas: ["climate"], priority: 6 },
  { name: "Inter-American Foundation", organization: "IAF", category: "international", website: "iaf.gov", focus_areas: ["Latin America grassroots"], priority: 6 },
  { name: "African Development Foundation", organization: "USADF", category: "international", website: "usadf.gov", focus_areas: ["African enterprises"], priority: 6 },
  { name: "National Endowment for Democracy", organization: "NED", category: "international", website: "ned.org", focus_areas: ["democracy"], priority: 6 },
  { name: "Millennium Challenge Corp", organization: "MCC", category: "international", website: "mcc.gov", focus_areas: ["country compacts"], priority: 7 },
];

// ── FISCAL SPONSORS ───────────────────────────────────────────────────
const FISCAL_SPONSORS: Entry[] = [
  { name: "Tides Center", organization: "Tides", category: "fiscal_sponsor", website: "tides.org", focus_areas: ["social justice"], priority: 6 },
  { name: "Fractured Atlas", organization: "Fractured Atlas", category: "fiscal_sponsor", website: "fracturedatlas.org", focus_areas: ["arts"], priority: 6 },
  { name: "Community Partners", organization: "Community Partners LA", category: "fiscal_sponsor", website: "communitypartners.org", geographic_focus: "Los Angeles", priority: 6 },
  { name: "NEO Philanthropy", organization: "NEO Philanthropy", category: "fiscal_sponsor", website: "neophilanthropy.org", focus_areas: ["advocacy", "democracy"], priority: 6 },
  { name: "Social Good Fund", organization: "Social Good Fund", category: "fiscal_sponsor", website: "socialgoodfund.org", focus_areas: ["progressive causes"], priority: 7 },
  { name: "TSNE MissionWorks", organization: "TSNE", category: "fiscal_sponsor", website: "tsne.org", focus_areas: ["all sectors"], priority: 7 },
  { name: "New York Foundation for the Arts", organization: "NYFA", category: "fiscal_sponsor", website: "nyfa.org", focus_areas: ["arts"], priority: 6 },
];

// ── MORE DISEASE-SPECIFIC ─────────────────────────────────────────────
const MORE_DISEASE: Entry[] = [
  { name: "American Lung Association", organization: "ALA", category: "disease_specific", website: "lung.org/research", focus_areas: ["lung health"], priority: 6 },
  { name: "Arthritis Foundation", organization: "AF", category: "disease_specific", website: "arthritis.org", focus_areas: ["arthritis"], priority: 7 },
  { name: "Cystic Fibrosis Foundation", organization: "CFF", category: "disease_specific", website: "cff.org", focus_areas: ["cystic fibrosis"], priority: 6 },
  { name: "Epilepsy Foundation", organization: "Epilepsy Foundation", category: "disease_specific", website: "epilepsy.com", focus_areas: ["epilepsy"], priority: 7 },
  { name: "JDRF", organization: "JDRF", category: "disease_specific", website: "jdrf.org", focus_areas: ["type 1 diabetes"], priority: 6 },
  { name: "Lupus Foundation", organization: "LFA", category: "disease_specific", website: "lupus.org", focus_areas: ["lupus"], priority: 7 },
  { name: "MS Society", organization: "National MS Society", category: "disease_specific", website: "nationalmssociety.org", focus_areas: ["multiple sclerosis"], priority: 6 },
  { name: "Muscular Dystrophy Association", organization: "MDA", category: "disease_specific", website: "mda.org", focus_areas: ["neuromuscular diseases"], priority: 6 },
  { name: "National Kidney Foundation", organization: "NKF", category: "disease_specific", website: "kidney.org", focus_areas: ["kidney disease"], priority: 7 },
  { name: "Parkinson's Foundation", organization: "PF", category: "disease_specific", website: "parkinson.org", focus_areas: ["parkinson's"], priority: 6 },
  { name: "Pancreatic Cancer Action Network", organization: "PanCAN", category: "disease_specific", website: "pancan.org", focus_areas: ["pancreatic cancer"], priority: 7 },
  { name: "ALS Association", organization: "ALS Association", category: "disease_specific", website: "als.org", focus_areas: ["ALS"], priority: 6 },
  { name: "Christopher Reeve Foundation", organization: "Reeve Foundation", category: "disease_specific", website: "christopherreeve.org", focus_areas: ["spinal cord"], priority: 7 },
  { name: "NAMI", organization: "National Alliance on Mental Illness", category: "disease_specific", website: "nami.org", focus_areas: ["mental health"], priority: 5 },
  { name: "Mental Health America", organization: "MHA", category: "disease_specific", website: "mhanational.org", focus_areas: ["mental health"], priority: 5 },
];

// ── IN-KIND / PRODUCT DONATIONS ───────────────────────────────────────
const IN_KIND: Entry[] = [
  { name: "TechSoup", organization: "TechSoup Global", category: "in_kind", website: "techsoup.org", focus_areas: ["software", "hardware donations"], priority: 5 },
  { name: "Google Ad Grants", organization: "Google", category: "in_kind", website: "google.com/grants", focus_areas: ["advertising"], grant_range: "$10K/month in ads", priority: 4 },
  { name: "Microsoft 365 for Nonprofits", organization: "Microsoft", category: "in_kind", website: "nonprofit.microsoft.com", focus_areas: ["software"], priority: 5 },
  { name: "Salesforce Power of Us", organization: "Salesforce", category: "in_kind", website: "salesforce.org", focus_areas: ["CRM licenses"], priority: 5 },
  { name: "Good360", organization: "Good360", category: "in_kind", website: "good360.org", focus_areas: ["consumer goods"], priority: 6 },
  { name: "Canva for Nonprofits", organization: "Canva", category: "in_kind", website: "canva.com/nonprofits", focus_areas: ["design software"], priority: 6 },
  { name: "AWS Credits for Nonprofits", organization: "Amazon Web Services", category: "in_kind", website: "aws.amazon.com/government", focus_areas: ["cloud credits"], priority: 5 },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const ALL = [
    ...CORP_AM, ...CORP_NZ, ...MORE_COMMUNITY, ...INTERNATIONAL,
    ...FISCAL_SPONSORS, ...MORE_DISEASE, ...IN_KIND,
  ];

  for (const e of ALL) {
    e.ingestion_status = e.ingestion_status ?? "not_started";
    e.crawl_frequency = e.crawl_frequency ?? "monthly";
    e.priority = e.priority ?? 6;
  }

  console.log(`Seeding ${ALL.length} remaining sources...`);

  const { data: existing } = await supabase
    .from("grant_source_directory")
    .select("name, organization");

  const existingSet = new Set(
    (existing ?? []).map((e: { name: string; organization: string }) => `${e.name}|||${e.organization}`)
  );

  const newEntries = ALL.filter((e) => !existingSet.has(`${e.name}|||${e.organization}`));
  console.log(`${existingSet.size} already exist, ${newEntries.length} new to insert`);

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
      console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${newEntries.length}`);
    }
  }

  console.log(`\nDone. ${inserted} new sources added. Total: ${existingSet.size + inserted}`);
}

main().catch(console.error);
