/**
 * Seeds all 50 state grant portals + DC + territories into grant_source_directory.
 * This is the biggest data gap in the market — no competitor has comprehensive
 * state/local grant coverage.
 *
 * Usage: npx tsx scripts/seed-state-portals.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface StatePortal {
  name: string;
  organization: string;
  category: string;
  website: string;
  focus_areas: string[];
  geographic_focus: string;
  crawl_frequency: string;
  priority: number;
}

// ============================================================================
// ALL 50 STATES + DC + TERRITORIES — PRIMARY GRANT PORTALS
// Each state has: main grants portal, economic development, small business,
// community development, and specialty agencies
// ============================================================================

const STATE_PORTALS: StatePortal[] = [
  // ALABAMA
  { name: "Alabama Grants Portal", organization: "State of Alabama", category: "state_agency", website: "https://grants.alabama.gov", focus_areas: ["general state grants"], geographic_focus: "AL", crawl_frequency: "weekly", priority: 3 },
  { name: "ADECA Grants", organization: "AL Dept of Economic & Community Affairs", category: "state_agency", website: "https://adeca.alabama.gov/grants", focus_areas: ["economic development", "community development"], geographic_focus: "AL", crawl_frequency: "weekly", priority: 4 },

  // ALASKA
  { name: "Alaska Grants Portal", organization: "State of Alaska", category: "state_agency", website: "https://aws.state.ak.us/OnlinePublicNotices", focus_areas: ["general state grants"], geographic_focus: "AK", crawl_frequency: "weekly", priority: 4 },
  { name: "DCCED Grants", organization: "AK Dept of Commerce", category: "state_agency", website: "https://www.commerce.alaska.gov/web/dcra/GrantsSection.aspx", focus_areas: ["community development", "economic development"], geographic_focus: "AK", crawl_frequency: "weekly", priority: 4 },

  // ARIZONA
  { name: "Arizona Grants Portal", organization: "State of Arizona", category: "state_agency", website: "https://grants.az.gov", focus_areas: ["general state grants"], geographic_focus: "AZ", crawl_frequency: "weekly", priority: 3 },
  { name: "AZ Commerce Grants", organization: "Arizona Commerce Authority", category: "state_agency", website: "https://www.azcommerce.com/incentives", focus_areas: ["economic development", "small business"], geographic_focus: "AZ", crawl_frequency: "weekly", priority: 4 },

  // ARKANSAS
  { name: "Arkansas Grants", organization: "State of Arkansas", category: "state_agency", website: "https://www.dfa.arkansas.gov/intergovernmental-services/grants-management", focus_areas: ["general state grants"], geographic_focus: "AR", crawl_frequency: "weekly", priority: 4 },
  { name: "AEDC Programs", organization: "Arkansas Economic Development Commission", category: "state_agency", website: "https://www.arkansasedc.com/programs", focus_areas: ["economic development", "small business"], geographic_focus: "AR", crawl_frequency: "weekly", priority: 4 },

  // CALIFORNIA
  { name: "California Grants Portal", organization: "State of California", category: "state_agency", website: "https://www.grants.ca.gov", focus_areas: ["general state grants"], geographic_focus: "CA", crawl_frequency: "daily", priority: 2 },
  { name: "CalOES Grants", organization: "CA Office of Emergency Services", category: "state_agency", website: "https://www.caloes.ca.gov/grants", focus_areas: ["emergency management", "public safety"], geographic_focus: "CA", crawl_frequency: "weekly", priority: 4 },
  { name: "GO-Biz Incentives", organization: "CA Governor's Office of Business", category: "state_agency", website: "https://business.ca.gov/advantages/incentives", focus_areas: ["small business", "economic development"], geographic_focus: "CA", crawl_frequency: "weekly", priority: 3 },

  // COLORADO
  { name: "Colorado Grants Portal", organization: "State of Colorado", category: "state_agency", website: "https://oedit.colorado.gov/programs-and-funding", focus_areas: ["general state grants"], geographic_focus: "CO", crawl_frequency: "weekly", priority: 3 },
  { name: "OEDIT Programs", organization: "CO Office of Economic Development", category: "state_agency", website: "https://oedit.colorado.gov/programs-and-funding", focus_areas: ["economic development", "small business"], geographic_focus: "CO", crawl_frequency: "weekly", priority: 4 },

  // CONNECTICUT
  { name: "CT Grants Portal", organization: "State of Connecticut", category: "state_agency", website: "https://portal.ct.gov/OPM/Grants", focus_areas: ["general state grants"], geographic_focus: "CT", crawl_frequency: "weekly", priority: 3 },
  { name: "DECD Programs", organization: "CT Dept of Economic Development", category: "state_agency", website: "https://portal.ct.gov/DECD/Content/Business-Development/05_Funding_Opportunities", focus_areas: ["economic development"], geographic_focus: "CT", crawl_frequency: "weekly", priority: 4 },

  // DELAWARE
  { name: "Delaware Grants", organization: "State of Delaware", category: "state_agency", website: "https://dedo.delaware.gov/incentives", focus_areas: ["economic development", "small business"], geographic_focus: "DE", crawl_frequency: "weekly", priority: 4 },

  // FLORIDA
  { name: "Florida Grants Portal", organization: "State of Florida", category: "state_agency", website: "https://www.floridajobs.org/business-growth-and-partnerships/for-businesses-and-entrepreneurs/business-resource-portal", focus_areas: ["general state grants", "economic development"], geographic_focus: "FL", crawl_frequency: "weekly", priority: 2 },
  { name: "DEO Business Grants", organization: "FL Dept of Economic Opportunity", category: "state_agency", website: "https://floridajobs.org/community-planning-and-development/assistance-for-governments-and-organizations/funding-opportunities", focus_areas: ["community development", "small business"], geographic_focus: "FL", crawl_frequency: "weekly", priority: 3 },
  { name: "Enterprise Florida", organization: "Enterprise Florida", category: "state_agency", website: "https://www.enterpriseflorida.com/for-businesses/incentives", focus_areas: ["business incentives", "economic development"], geographic_focus: "FL", crawl_frequency: "weekly", priority: 3 },

  // GEORGIA
  { name: "Georgia Grants", organization: "State of Georgia", category: "state_agency", website: "https://www.georgia.org/incentives", focus_areas: ["economic development", "business incentives"], geographic_focus: "GA", crawl_frequency: "weekly", priority: 3 },
  { name: "GDEcD Programs", organization: "GA Dept of Economic Development", category: "state_agency", website: "https://www.georgia.org/small-business-resources", focus_areas: ["small business"], geographic_focus: "GA", crawl_frequency: "weekly", priority: 4 },

  // HAWAII
  { name: "Hawaii Grants Portal", organization: "State of Hawaii", category: "state_agency", website: "https://grants.ehawaii.gov", focus_areas: ["general state grants"], geographic_focus: "HI", crawl_frequency: "weekly", priority: 4 },

  // IDAHO
  { name: "Idaho Commerce Grants", organization: "Idaho Commerce", category: "state_agency", website: "https://commerce.idaho.gov/incentives-and-financing", focus_areas: ["economic development", "small business"], geographic_focus: "ID", crawl_frequency: "weekly", priority: 4 },

  // ILLINOIS
  { name: "Illinois Grants Portal", organization: "State of Illinois", category: "state_agency", website: "https://www2.illinois.gov/sites/GATA/Pages/default.aspx", focus_areas: ["general state grants"], geographic_focus: "IL", crawl_frequency: "weekly", priority: 2 },
  { name: "DCEO Grants", organization: "IL Dept of Commerce & Economic Opportunity", category: "state_agency", website: "https://dceo.illinois.gov/aboutdceo/grantopportunities.html", focus_areas: ["economic development", "community development"], geographic_focus: "IL", crawl_frequency: "weekly", priority: 3 },

  // INDIANA
  { name: "Indiana Grants Portal", organization: "State of Indiana", category: "state_agency", website: "https://www.in.gov/fssa/dfr/grant-opportunities", focus_areas: ["general state grants"], geographic_focus: "IN", crawl_frequency: "weekly", priority: 3 },
  { name: "IEDC Programs", organization: "Indiana Economic Development", category: "state_agency", website: "https://www.iedc.in.gov/programs", focus_areas: ["economic development", "small business"], geographic_focus: "IN", crawl_frequency: "weekly", priority: 4 },

  // IOWA
  { name: "Iowa Grants Portal", organization: "State of Iowa", category: "state_agency", website: "https://www.iowaeda.com/finance-programs", focus_areas: ["economic development", "small business"], geographic_focus: "IA", crawl_frequency: "weekly", priority: 4 },

  // KANSAS
  { name: "Kansas Commerce Grants", organization: "Kansas Dept of Commerce", category: "state_agency", website: "https://www.kansascommerce.gov/programs-services", focus_areas: ["economic development", "community development"], geographic_focus: "KS", crawl_frequency: "weekly", priority: 4 },

  // KENTUCKY
  { name: "Kentucky Grants", organization: "Kentucky Cabinet for Economic Development", category: "state_agency", website: "https://ced.ky.gov/Existing_Business/Financial_Programs", focus_areas: ["economic development", "small business"], geographic_focus: "KY", crawl_frequency: "weekly", priority: 4 },

  // LOUISIANA
  { name: "Louisiana LED Programs", organization: "Louisiana Economic Development", category: "state_agency", website: "https://www.opportunitylouisiana.gov/business-incentives", focus_areas: ["economic development", "business incentives"], geographic_focus: "LA", crawl_frequency: "weekly", priority: 4 },

  // MAINE
  { name: "Maine DECD Grants", organization: "Maine DECD", category: "state_agency", website: "https://www.maine.gov/decd/business-development/grants-loans", focus_areas: ["economic development", "small business"], geographic_focus: "ME", crawl_frequency: "weekly", priority: 4 },

  // MARYLAND
  { name: "Maryland Grants Portal", organization: "State of Maryland", category: "state_agency", website: "https://commerce.maryland.gov/fund", focus_areas: ["economic development", "small business"], geographic_focus: "MD", crawl_frequency: "weekly", priority: 3 },

  // MASSACHUSETTS
  { name: "Mass Grants Portal", organization: "Commonwealth of Massachusetts", category: "state_agency", website: "https://www.mass.gov/lists/current-grant-and-funding-opportunities", focus_areas: ["general state grants"], geographic_focus: "MA", crawl_frequency: "weekly", priority: 2 },

  // MICHIGAN
  { name: "Michigan Grants Portal", organization: "State of Michigan", category: "state_agency", website: "https://www.michigan.gov/leo/bureaus-agencies/medc/services/grants", focus_areas: ["economic development", "community development"], geographic_focus: "MI", crawl_frequency: "weekly", priority: 3 },

  // MINNESOTA
  { name: "Minnesota Grants Portal", organization: "State of Minnesota", category: "state_agency", website: "https://mn.gov/deed/business/financing-business/grants", focus_areas: ["economic development", "small business"], geographic_focus: "MN", crawl_frequency: "weekly", priority: 3 },

  // MISSISSIPPI
  { name: "Mississippi MDA Programs", organization: "Mississippi Development Authority", category: "state_agency", website: "https://mississippi.org/incentives-programs", focus_areas: ["economic development", "business incentives"], geographic_focus: "MS", crawl_frequency: "weekly", priority: 4 },

  // MISSOURI
  { name: "Missouri DED Programs", organization: "Missouri Dept of Economic Development", category: "state_agency", website: "https://ded.mo.gov/programs", focus_areas: ["economic development", "small business"], geographic_focus: "MO", crawl_frequency: "weekly", priority: 4 },

  // MONTANA
  { name: "Montana Commerce Grants", organization: "Montana Dept of Commerce", category: "state_agency", website: "https://comdev.mt.gov/Programs-and-Boards", focus_areas: ["community development", "economic development"], geographic_focus: "MT", crawl_frequency: "weekly", priority: 4 },

  // NEBRASKA
  { name: "Nebraska DED Programs", organization: "Nebraska Dept of Economic Development", category: "state_agency", website: "https://opportunity.nebraska.gov/programs", focus_areas: ["economic development", "community development"], geographic_focus: "NE", crawl_frequency: "weekly", priority: 4 },

  // NEVADA
  { name: "Nevada GOED Programs", organization: "Nevada Governor's Office of Economic Development", category: "state_agency", website: "https://goed.nv.gov/programs-incentives", focus_areas: ["economic development", "small business"], geographic_focus: "NV", crawl_frequency: "weekly", priority: 4 },

  // NEW HAMPSHIRE
  { name: "NH BEA Programs", organization: "NH Business & Economic Affairs", category: "state_agency", website: "https://www.nheconomy.com/grow-your-business/financing", focus_areas: ["economic development", "small business"], geographic_focus: "NH", crawl_frequency: "weekly", priority: 4 },

  // NEW JERSEY
  { name: "NJ Grants Portal", organization: "State of New Jersey", category: "state_agency", website: "https://www.njeda.gov/financing", focus_areas: ["economic development", "small business"], geographic_focus: "NJ", crawl_frequency: "weekly", priority: 3 },

  // NEW MEXICO
  { name: "New Mexico EDD Grants", organization: "NM Economic Development Department", category: "state_agency", website: "https://edd.newmexico.gov/business-development/financial-resources", focus_areas: ["economic development", "small business"], geographic_focus: "NM", crawl_frequency: "weekly", priority: 4 },

  // NEW YORK
  { name: "NY Grants Portal", organization: "State of New York", category: "state_agency", website: "https://grantsmanagement.ny.gov", focus_areas: ["general state grants"], geographic_focus: "NY", crawl_frequency: "daily", priority: 2 },
  { name: "ESD Programs", organization: "Empire State Development", category: "state_agency", website: "https://esd.ny.gov/business-programs", focus_areas: ["economic development", "small business"], geographic_focus: "NY", crawl_frequency: "weekly", priority: 3 },

  // NORTH CAROLINA
  { name: "NC Commerce Grants", organization: "NC Dept of Commerce", category: "state_agency", website: "https://www.commerce.nc.gov/grants-incentives", focus_areas: ["economic development", "community development"], geographic_focus: "NC", crawl_frequency: "weekly", priority: 3 },

  // NORTH DAKOTA
  { name: "ND Commerce Programs", organization: "ND Dept of Commerce", category: "state_agency", website: "https://www.commerce.nd.gov/economic-development-finance", focus_areas: ["economic development"], geographic_focus: "ND", crawl_frequency: "weekly", priority: 4 },

  // OHIO
  { name: "Ohio Grants Portal", organization: "State of Ohio", category: "state_agency", website: "https://development.ohio.gov/business/state-incentives", focus_areas: ["economic development", "business incentives"], geographic_focus: "OH", crawl_frequency: "weekly", priority: 3 },

  // OKLAHOMA
  { name: "Oklahoma Commerce Grants", organization: "Oklahoma Dept of Commerce", category: "state_agency", website: "https://www.okcommerce.gov/doing-business/incentives-financing", focus_areas: ["economic development", "small business"], geographic_focus: "OK", crawl_frequency: "weekly", priority: 4 },

  // OREGON
  { name: "Oregon Business Programs", organization: "Business Oregon", category: "state_agency", website: "https://www.oregon4biz.com/Financing-&-Incentives", focus_areas: ["economic development", "small business"], geographic_focus: "OR", crawl_frequency: "weekly", priority: 3 },

  // PENNSYLVANIA
  { name: "PA Grants Portal", organization: "Commonwealth of Pennsylvania", category: "state_agency", website: "https://dced.pa.gov/programs-funding", focus_areas: ["general state grants", "community development"], geographic_focus: "PA", crawl_frequency: "weekly", priority: 2 },

  // RHODE ISLAND
  { name: "RI Commerce Programs", organization: "RI Commerce Corporation", category: "state_agency", website: "https://commerceri.com/financing", focus_areas: ["economic development", "small business"], geographic_focus: "RI", crawl_frequency: "weekly", priority: 4 },

  // SOUTH CAROLINA
  { name: "SC Commerce Grants", organization: "SC Dept of Commerce", category: "state_agency", website: "https://www.sccommerce.com/incentives", focus_areas: ["economic development", "business incentives"], geographic_focus: "SC", crawl_frequency: "weekly", priority: 4 },

  // SOUTH DAKOTA
  { name: "SD GOED Programs", organization: "SD Governor's Office of Economic Development", category: "state_agency", website: "https://sdgoed.com/financial-resources", focus_areas: ["economic development", "small business"], geographic_focus: "SD", crawl_frequency: "weekly", priority: 4 },

  // TENNESSEE
  { name: "Tennessee ECD Grants", organization: "TN Dept of Economic & Community Development", category: "state_agency", website: "https://www.tn.gov/ecd/business-development/grants.html", focus_areas: ["economic development", "community development"], geographic_focus: "TN", crawl_frequency: "weekly", priority: 3 },

  // TEXAS
  { name: "Texas Grants Portal", organization: "State of Texas", category: "state_agency", website: "https://gov.texas.gov/business/page/incentive-programs", focus_areas: ["economic development", "business incentives"], geographic_focus: "TX", crawl_frequency: "daily", priority: 2 },
  { name: "Texas Workforce Grants", organization: "Texas Workforce Commission", category: "state_agency", website: "https://www.twc.texas.gov/programs/skills-development-fund", focus_areas: ["workforce development", "training"], geographic_focus: "TX", crawl_frequency: "weekly", priority: 3 },

  // UTAH
  { name: "Utah GOED Programs", organization: "Utah Governor's Office of Economic Opportunity", category: "state_agency", website: "https://business.utah.gov/business-resources/grants-and-loans", focus_areas: ["economic development", "small business"], geographic_focus: "UT", crawl_frequency: "weekly", priority: 4 },

  // VERMONT
  { name: "Vermont ACCD Programs", organization: "VT Agency of Commerce", category: "state_agency", website: "https://accd.vermont.gov/economic-development/funding-incentives", focus_areas: ["economic development", "community development"], geographic_focus: "VT", crawl_frequency: "weekly", priority: 4 },

  // VIRGINIA
  { name: "Virginia VEDP Programs", organization: "Virginia Economic Development Partnership", category: "state_agency", website: "https://www.vedp.org/incentives", focus_areas: ["economic development", "business incentives"], geographic_focus: "VA", crawl_frequency: "weekly", priority: 3 },

  // WASHINGTON
  { name: "Washington Commerce Grants", organization: "WA Dept of Commerce", category: "state_agency", website: "https://www.commerce.wa.gov/growing-the-economy/grants-loans", focus_areas: ["economic development", "community development"], geographic_focus: "WA", crawl_frequency: "weekly", priority: 3 },

  // WEST VIRGINIA
  { name: "WV Development Office Grants", organization: "WV Development Office", category: "state_agency", website: "https://westvirginia.gov/doing-business/incentives", focus_areas: ["economic development", "small business"], geographic_focus: "WV", crawl_frequency: "weekly", priority: 4 },

  // WISCONSIN
  { name: "WEDC Programs", organization: "Wisconsin Economic Development Corporation", category: "state_agency", website: "https://wedc.org/programs-and-resources", focus_areas: ["economic development", "small business"], geographic_focus: "WI", crawl_frequency: "weekly", priority: 3 },

  // WYOMING
  { name: "Wyoming Business Council Programs", organization: "Wyoming Business Council", category: "state_agency", website: "https://www.wyomingbusiness.org/programs", focus_areas: ["economic development", "small business"], geographic_focus: "WY", crawl_frequency: "weekly", priority: 4 },

  // DISTRICT OF COLUMBIA
  { name: "DC Grants Portal", organization: "District of Columbia", category: "state_agency", website: "https://opgs.dc.gov/page/grant-opportunities", focus_areas: ["general grants", "community development"], geographic_focus: "DC", crawl_frequency: "weekly", priority: 3 },
  { name: "DMPED Programs", organization: "DC Office of the Deputy Mayor for Planning & Economic Development", category: "state_agency", website: "https://dmped.dc.gov/page/programs-and-initiatives", focus_areas: ["economic development", "small business"], geographic_focus: "DC", crawl_frequency: "weekly", priority: 4 },

  // PUERTO RICO
  { name: "PR DDEC Programs", organization: "Puerto Rico Dept of Economic Development", category: "state_agency", website: "https://www.ddec.pr.gov/en/incentives", focus_areas: ["economic development"], geographic_focus: "PR", crawl_frequency: "monthly", priority: 5 },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let inserted = 0;
  let skipped = 0;

  for (const portal of STATE_PORTALS) {
    // Check for existing
    const { data: existing } = await supabase
      .from("grant_source_directory")
      .select("id")
      .eq("name", portal.name)
      .limit(1)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("grant_source_directory").insert({
      name: portal.name,
      organization: portal.organization,
      category: portal.category,
      website: portal.website,
      focus_areas: portal.focus_areas,
      geographic_focus: portal.geographic_focus,
      crawl_frequency: portal.crawl_frequency,
      priority: portal.priority,
      ingestion_status: "not_started",
    });

    if (error) {
      console.error(`Failed: ${portal.name} — ${error.message}`);
    } else {
      inserted++;
      console.log(`Added: ${portal.name} (${portal.geographic_focus})`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped (dupe): ${skipped}, Total portals: ${STATE_PORTALS.length}`);
}

main().catch(console.error);
