import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const INDUSTRY_META: Record<
  string,
  {
    label: string;
    categories: string[];
    intro: string;
    faqs: Array<{ q: string; a: string }>;
    related: string[];
  }
> = {
  healthcare: {
    label: "Healthcare",
    categories: ["healthcare", "health", "medical", "mental health", "public health", "behavioral health"],
    intro:
      "Healthcare grants represent one of the largest pools of philanthropic and government funding in the United States. Federal agencies like HRSA, NIH, and the CDC allocate billions annually to organizations improving patient outcomes, expanding access to care, and addressing health disparities in underserved communities. State health departments, major foundations such as the Robert Wood Johnson Foundation and Kresge Foundation, and corporate philanthropies from hospital systems also fund a wide array of healthcare initiatives. Whether your organization delivers direct clinical services, trains healthcare workers, conducts community health outreach, conducts behavioral health programming, or builds health infrastructure in rural areas, there are dedicated grant programs designed to support your mission. Navigating this landscape requires understanding eligibility requirements—many federal awards require 501(c)(3) status or public entity classification—as well as the nuances of matching funds, indirect cost rates, and performance reporting. GrantAQ's AI matching engine analyzes your organization profile against all active healthcare funding opportunities so you spend time applying, not searching.",
    faqs: [
      {
        q: "What types of organizations are eligible for healthcare grants?",
        a: "Most healthcare grants accept 501(c)(3) nonprofits, federally qualified health centers (FQHCs), tribal organizations, public health departments, academic medical centers, and sometimes for-profit entities with community benefit components. Eligibility varies by funder.",
      },
      {
        q: "How large are typical healthcare grant awards?",
        a: "Healthcare grants range widely—from $5,000 community foundation mini-grants to multi-year NIH awards exceeding $1 million per year. Federal grants from HRSA for health center expansions can reach $650,000+ annually. Most foundation awards fall between $25,000 and $250,000.",
      },
      {
        q: "What is the most common deadline cycle for healthcare grants?",
        a: "Federal health grants often follow NIH standard due dates (February, June, October). Foundation deadlines vary by funder; many operate on annual or biannual cycles. Some state health department grants have rolling deadlines.",
      },
      {
        q: "Do I need to match healthcare grant funds?",
        a: "Many federal healthcare grants require matching funds ranging from 20% to 50% of total project cost. Foundation grants less commonly require match, though demonstrating community investment strengthens proposals significantly.",
      },
    ],
    related: ["mental-health", "research", "human-services", "youth"],
  },
  education: {
    label: "Education",
    categories: ["education", "literacy", "stem", "workforce", "tutoring", "after school", "k-12", "higher education"],
    intro:
      "Education grants encompass an enormous funding landscape that includes federal Title programs, state education agency grants, private foundations, and corporate giving programs. The U.S. Department of Education alone distributes more than $70 billion annually through formula grants and competitive awards targeting everything from early childhood literacy to STEM college pathways. Foundations like Bill & Melinda Gates, Walton Family, and Carnegie Corporation invest heavily in educational innovation, teacher effectiveness, and college access. Local community foundations often prioritize workforce-aligned education initiatives such as apprenticeship programs, adult basic education, and digital literacy. Successful education grant proposals typically demonstrate measurable learning outcomes, ties to evidence-based curricula, sustainable program models, and partnerships with school districts or higher education institutions. GrantAQ helps education nonprofits and schools identify every relevant opportunity in their region and category, generate match scores, and build winning proposals using AI trained on successful education grant narratives.",
    faqs: [
      {
        q: "Can K-12 public schools apply for education grants?",
        a: "Yes. Public schools and districts can apply for federal grants (Title I, Title IV, E-Rate), state competitive grants, and many foundation awards. Some foundation grants are restricted to nonprofits, so schools often partner with a 501(c)(3) fiscal sponsor.",
      },
      {
        q: "What are the biggest federal education grant programs?",
        a: "The largest competitive federal education grants include the Investing in Innovation (i3) program, Promise Neighborhoods, Education Innovation and Research (EIR), and AmeriCorps Education Award programs. Race to the Top and Title I set-aside funds flow through states.",
      },
      {
        q: "How long does education grant funding typically last?",
        a: "Education grants range from one-year pilot awards to five-year multi-site implementation grants. Federal awards often span three to five years with annual continuation requirements.",
      },
      {
        q: "Do education grants require accreditation?",
        a: "Accreditation is required for some higher education grants but not for most K-12 or nonprofit education programs. Many funders require evidence of program quality, which can be demonstrated through outcomes data rather than formal accreditation.",
      },
    ],
    related: ["youth", "workforce", "technology", "research"],
  },
  "arts-culture": {
    label: "Arts & Culture",
    categories: ["arts", "culture", "music", "theater", "visual arts", "performing arts", "humanities", "museums"],
    intro:
      "Arts and culture grants support a vibrant ecosystem of organizations that enrich communities, preserve heritage, and foster creative expression. The National Endowment for the Arts (NEA) and National Endowment for the Humanities (NEH) distribute federal funds through state arts agencies and direct grants. State arts councils provide critical infrastructure funding to regional organizations. Private foundations including the Mellon Foundation, Ford Foundation, Doris Duke Charitable Foundation, and hundreds of local community foundations invest in artists, arts organizations, cultural preservation, and arts education. Corporate sponsors—banks, media companies, luxury brands—often fund high-visibility cultural programming. Arts grants are available to individual artists, arts organizations, museums, cultural centers, and schools. Proposal success depends on articulating artistic quality, community impact, audience engagement metrics, and financial sustainability. GrantAQ tracks every active arts funding opportunity and helps your organization cut through the noise to find grants you actually qualify for.",
    faqs: [
      {
        q: "Can individual artists apply for arts grants?",
        a: "Yes. Many state arts agencies and private foundations offer grants directly to individual artists, including fellowships, project grants, and emergency funds. The NEA does not fund individuals directly but state arts councils often do.",
      },
      {
        q: "What documentation is typically required for arts grant applications?",
        a: "Arts grants commonly require work samples (images, audio, video, written excerpts), organizational financial statements, board lists, letters of support, project budgets, and artist bios or organizational history.",
      },
      {
        q: "How are arts grants different from corporate sponsorships?",
        a: "Grants are charitable contributions awarded based on mission alignment and merit; they do not require marketing deliverables. Corporate sponsorships are business transactions with branding and marketing expectations attached.",
      },
      {
        q: "Are there grants specifically for BIPOC arts organizations?",
        a: "Yes. Many major foundations including Ford, Mellon, and Surdna have specific initiatives for BIPOC-led arts organizations. State arts agencies increasingly have equity-focused grant programs as well.",
      },
    ],
    related: ["education", "youth", "human-services", "faith-based"],
  },
  environment: {
    label: "Environment",
    categories: ["environment", "conservation", "climate", "sustainability", "wildlife", "land", "water", "energy"],
    intro:
      "Environmental grants fund conservation, climate resilience, clean energy, environmental justice, and natural resource protection initiatives across all 50 states. Federal programs from the EPA, USDA, and Department of Energy channel billions into environmental projects through competitive grants and cooperative agreements. The Inflation Reduction Act created billions in new grant and rebate programs for clean energy, climate-smart agriculture, and environmental justice communities. Major foundations including Moore, Packard, Wilburforce, and Patagonia Environmental Grants support conservation science, policy advocacy, and community-based environmental work. Corporate ESG commitments have also generated new corporate grant programs tied to environmental impact. Environmental grant applicants typically include nonprofits, tribal governments, municipalities, academic institutions, and agricultural cooperatives. Proposals must demonstrate measurable ecological outcomes, community benefit, and sound scientific methodology. GrantAQ helps environmental organizations map funding to their specific geography, ecosystem focus, and organizational capacity.",
    faqs: [
      {
        q: "What federal agencies fund environmental grants?",
        a: "The EPA, USDA Forest Service, Natural Resources Conservation Service (NRCS), Fish and Wildlife Service, NOAA, Bureau of Land Management, and Department of Energy all administer competitive grant programs for environmental projects.",
      },
      {
        q: "Are there grants specifically for climate and clean energy projects?",
        a: "Yes. The Inflation Reduction Act created EPA's Climate Pollution Reduction Grants, USDA's Partnerships for Climate-Smart Commodities, and DOE's Industrial Demonstrations programs, totaling tens of billions in new environmental grant funding.",
      },
      {
        q: "Can for-profit businesses apply for environmental grants?",
        a: "Some USDA conservation programs and DOE energy efficiency grants allow for-profit applicants. Most EPA and foundation environmental grants restrict eligibility to nonprofits, tribes, or government entities.",
      },
      {
        q: "How competitive are major conservation grants?",
        a: "Very. Top conservation grants from foundations like Moore and Packard see hundreds of applications for limited awards. Federal grants vary by program; some USDA conservation programs are formula-based while others are highly competitive.",
      },
    ],
    related: ["research", "technology", "food-security", "youth"],
  },
  technology: {
    label: "Technology",
    categories: ["technology", "digital equity", "broadband", "stem", "innovation", "cybersecurity", "software", "ai"],
    intro:
      "Technology grants support digital infrastructure, STEM education, broadband expansion, digital equity, and technology innovation across nonprofit, government, and research sectors. The federal government is a major technology funder through NSF, NTIA (broadband), USDA ReConnect, EDA (economic development), and SBA innovation programs. The CHIPS and Science Act and Infrastructure Investment and Jobs Act created new grant programs for semiconductor research, broadband deployment, and digital equity initiatives. Foundations including Mozilla, Google.org, Schmidt Futures, and Hewlett invest in responsible technology, open-source development, and digital inclusion. Corporate technology companies often fund nonprofit technology capacity building, digital skills training, and equity-focused tech programs. Technology grants are available to nonprofits, school districts, local governments, rural cooperatives, tribes, and research universities. Successful proposals demonstrate technical feasibility, community benefit, long-term sustainability, and measurable outcomes tied to digital access and economic opportunity.",
    faqs: [
      {
        q: "What is the NTIA broadband grant program?",
        a: "NTIA administers the $42.45 billion BEAD Program (Broadband Equity, Access, and Deployment) through state broadband offices, targeting unserved and underserved communities. States are distributing subgrants to ISPs, cooperatives, and municipalities.",
      },
      {
        q: "Are there grants for nonprofit technology capacity building?",
        a: "Yes. Google.org, Microsoft Philanthropies, Tableau Foundation, and Salesforce.org fund nonprofit technology infrastructure, CRM implementation, cybersecurity, and digital skills training. TechSoup also administers direct grants.",
      },
      {
        q: "Can startups apply for technology grants?",
        a: "NSF SBIR/STTR programs are specifically designed for small businesses and startups with innovative technology. Awards range from $275,000 (Phase I) to $1,000,000+ (Phase II). DOE and DOD also have startup-focused technology grant programs.",
      },
      {
        q: "What is digital equity and are there grants for it?",
        a: "Digital equity means ensuring all people have access to information and communication technologies. The IIJA created a $2.75 billion Digital Equity Act with grants for states, coalitions, and nonprofits serving digitally-excluded populations.",
      },
    ],
    related: ["education", "research", "workforce", "small-business"],
  },
  housing: {
    label: "Housing",
    categories: ["housing", "affordable housing", "homelessness", "shelter", "mortgage", "rental", "community development"],
    intro:
      "Housing grants address one of the most critical needs in communities across America—safe, stable, and affordable places to live. HUD administers the largest federal housing grant programs including Community Development Block Grants (CDBG), HOME Investment Partnerships, Emergency Solutions Grants (ESG), and Housing Opportunities for Persons With AIDS (HOPWA). USDA Rural Development funds housing in rural communities through direct loans and grants. State housing finance agencies administer Low Income Housing Tax Credit allocations and additional state-funded grant programs. The Robert Wood Johnson Foundation, MacArthur Foundation, and Enterprise Community Partners invest in affordable housing production, preservation, and resident services. Housing grants are available to community development corporations (CDCs), housing authorities, nonprofits, tribal housing entities, and in some cases for-profit developers with community benefit agreements. Successful housing grant proposals demonstrate community need, financial feasibility, development experience, and alignment with federal and local housing priorities.",
    faqs: [
      {
        q: "What is CDBG and who can apply?",
        a: "Community Development Block Grants are HUD formula grants distributed to entitled communities (cities and counties). Nonprofits receive CDBG subgrants through their local government. Non-entitled communities apply through state CDBG programs.",
      },
      {
        q: "Are there grants for emergency rental assistance?",
        a: "Yes. Emergency Solutions Grants (ESG) fund emergency shelter, rapid re-housing, and homelessness prevention. Many states and localities have additional emergency rental assistance programs funded through federal and state appropriations.",
      },
      {
        q: "Can a nonprofit developer apply directly for HUD housing grants?",
        a: "Some HUD programs like Choice Neighborhoods and HOPWA accept direct nonprofit applications. Others flow through local governments. Nonprofits should also explore HUD's Continuum of Care (CoC) program for homelessness funding.",
      },
      {
        q: "What documentation is required for housing grant applications?",
        a: "Housing grants typically require audited financials, organizational capacity documentation, project pro formas, community need data, letters of site control, environmental reviews, and evidence of leveraged financing.",
      },
    ],
    related: ["human-services", "veterans", "faith-based", "workforce"],
  },
  workforce: {
    label: "Workforce Development",
    categories: ["workforce", "job training", "employment", "career", "apprenticeship", "reentry", "vocational"],
    intro:
      "Workforce development grants fund job training, career pathways, apprenticeship programs, and employment services that help individuals achieve economic self-sufficiency. The Department of Labor distributes billions annually through WIOA formula and competitive grants, including H-1B workforce training funds, Apprenticeship Building America, and Reentry Employment Opportunities. EDA, USDA, and HHS also fund workforce programs in specific communities. State workforce agencies administer additional grant programs through Workforce Development Boards. Corporate foundations from major employers in healthcare, manufacturing, technology, and construction invest heavily in workforce training aligned with their talent pipelines. Community foundations increasingly prioritize workforce equity—programs addressing barriers for justice-involved individuals, immigrants, people with disabilities, and disconnected youth. Workforce grant proposals must articulate employer partnerships, training curricula, credential attainment outcomes, job placement rates, and wage gains.",
    faqs: [
      {
        q: "What is WIOA and how does it fund workforce programs?",
        a: "The Workforce Innovation and Opportunity Act (WIOA) is the primary federal workforce law. It funds Adult, Dislocated Worker, and Youth programs through state and local workforce boards. Nonprofits receive funding through competitive contracts with their local American Job Center.",
      },
      {
        q: "Are there grants specifically for apprenticeship programs?",
        a: "Yes. DOL's Apprenticeship Building America program funds intermediaries that support new and expanding Registered Apprenticeship Programs. Grants range from $500,000 to $5 million over three years.",
      },
      {
        q: "Can community colleges apply for workforce grants?",
        a: "Yes. Community colleges are major recipients of workforce development funding including DOL TAACCCT grants, H-1B training funds, and state workforce grants. They also partner with nonprofits on federal workforce initiatives.",
      },
      {
        q: "What outcomes do workforce funders prioritize?",
        a: "Funders prioritize credential or certification attainment, job placement rate, starting wages, retention at six and twelve months, and advancement outcomes. Many also track demographics to ensure equitable access.",
      },
    ],
    related: ["education", "small-business", "human-services", "veterans"],
  },
  youth: {
    label: "Youth Programs",
    categories: ["youth", "children", "after school", "mentoring", "juvenile", "foster care", "child welfare", "teen"],
    intro:
      "Youth grants support programs that help children and teenagers thrive—academically, socially, emotionally, and physically. Major federal funders include the Department of Education (21st Century Community Learning Centers, Promise Neighborhoods), HHS (Head Start, Child Care Development Fund, Runaway & Homeless Youth), AmeriCorps, and the Office of Juvenile Justice and Delinquency Prevention (OJJDP). State agencies fund child welfare, juvenile justice, and education programs. The Annie E. Casey Foundation, Robert Wood Johnson Foundation, Boys & Girls Clubs of America, and hundreds of local community foundations invest in youth development, mentoring, and out-of-school time programming. Corporate giving programs from technology, sports, and entertainment companies often focus on youth STEM, arts, and entrepreneurship. Youth grant applications typically require youth outcome data, evidence-based program models, safety and supervision protocols, staff qualifications, and partnership letters from school districts.",
    faqs: [
      {
        q: "What is the 21st CCLC grant and how do organizations apply?",
        a: "21st Century Community Learning Centers grants fund after-school programs in high-poverty schools. Grants are administered by state education agencies through competitive RFPs. Nonprofits apply as direct grantees or partners with school districts.",
      },
      {
        q: "Are there grants specifically for mentoring programs?",
        a: "Yes. OJJDP's Mentoring Program funds youth mentoring. MENTOR (the national mentoring organization) manages training grants. Many corporate and community foundations prioritize mentoring as a youth development strategy.",
      },
      {
        q: "What age ranges do youth grants typically cover?",
        a: "Youth grants most commonly serve children ages 5-17. Early childhood grants (birth to 5) are often categorized separately. Some funders extend to 'transition age youth' ages 18-24, particularly for foster care, homelessness, and workforce programs.",
      },
      {
        q: "Do youth programs need to demonstrate evidence-based practices?",
        a: "Increasingly yes—especially for federal grants. Many federal programs require programs be listed in evidence registries like What Works Clearinghouse, Blueprints for Healthy Youth Development, or SAMHSA's National Registry of Evidence-based Programs.",
      },
    ],
    related: ["education", "human-services", "workforce", "arts-culture"],
  },
  veterans: {
    label: "Veterans",
    categories: ["veterans", "military", "vets", "veteran services", "veteran housing"],
    intro:
      "Veterans grants provide critical support to the millions of Americans who have served in the armed forces, addressing needs ranging from housing and employment to mental health, legal services, and community reintegration. The Department of Veterans Affairs funds nonprofit veterans service organizations through the VSO grant program and the Supportive Services for Veteran Families (SSVF) program for homeless prevention. HUD-VASH provides housing vouchers that community organizations support. DOL funds Veterans' Employment and Training Service (VETS) grants. Major foundations including Gary Sinise Foundation, Fisher House Foundation, Pat Tillman Foundation, and USAA Foundation support veterans programming. State veterans agencies administer additional grant programs. Organizations serving veterans should document the veteran population served, outcomes tied to VA priorities, coordination with VA medical centers, and evidence-based trauma-informed service models.",
    faqs: [
      {
        q: "What is the SSVF program and who can apply?",
        a: "Supportive Services for Veteran Families (SSVF) is a VA grant program that funds nonprofits providing rapid re-housing and homelessness prevention to very low-income veteran families. Competitive applications are accepted through periodic VA solicitations.",
      },
      {
        q: "Are there grants for veteran-owned businesses?",
        a: "Yes. SBA has SDVOSB (Service-Disabled Veteran-Owned Small Business) set-aside contracts. Some states have veteran business grant programs. Foundations like the U.S. Veterans Initiative also provide business training grants.",
      },
      {
        q: "Can non-veteran-specific organizations apply for veteran grants?",
        a: "Yes, if veterans are a primary population served. Many veterans grants are open to any qualifying 501(c)(3) that provides documented services to veterans. Organizations should ensure their programs align with veteran-specific needs.",
      },
      {
        q: "What documentation is needed for veterans grant applications?",
        a: "Typically required: proof of veteran population served (intake data), staff credentials and training in veteran-specific issues (especially trauma-informed care), partnerships with VA facilities, financial statements, and program outcome data.",
      },
    ],
    related: ["housing", "workforce", "mental-health", "human-services"],
  },
  "food-security": {
    label: "Food Security",
    categories: ["food", "hunger", "food bank", "nutrition", "food insecurity", "food pantry", "meals", "agriculture"],
    intro:
      "Food security grants address hunger, malnutrition, and food access challenges for millions of Americans experiencing food insecurity. USDA administers the nation's largest food assistance infrastructure through formula programs and competitive grants including the Emergency Food Assistance Program (TEFAP), Hunger-Free Communities, and Community Food Projects. The USDA Farm to School program and Local Food Purchase Assistance fund local food systems. Foundations including Feeding America's Network, Share Our Strength, and W.K. Kellogg Foundation invest in food banks, community gardens, nutrition education, and policy advocacy. State and local health departments fund anti-hunger programming tied to health outcomes. Food security grants are available to food banks, food pantries, soup kitchens, community gardens, agricultural cooperatives, schools, and health organizations. Strong proposals include community need data (food insecurity rates), distribution metrics (pounds of food, households served), and evidence of food quality and nutritional value.",
    faqs: [
      {
        q: "What USDA programs fund food banks and pantries?",
        a: "USDA's Emergency Food Assistance Program (TEFAP) provides commodity foods and administrative funding to state agencies, which distribute through food banks. The Community Food Projects Competitive Grant funds community-based food solutions.",
      },
      {
        q: "Are there grants for community gardens and urban agriculture?",
        a: "Yes. USDA Community Food Projects, USDA Urban Agriculture grants, and many local and state health department grants support community gardens. Foundation grants from W.K. Kellogg and regional foundations also fund urban food production.",
      },
      {
        q: "What outcomes do food security funders measure?",
        a: "Common metrics include pounds of food distributed, households served, meals provided, food insecurity rates pre/post program, access to healthy/fresh food, and nutrition education outcomes.",
      },
      {
        q: "Can for-profit grocery stores or restaurants apply for food security grants?",
        a: "Generally no for foundation grants. Some USDA healthy food access programs (Healthy Food Financing Initiative) do fund for-profit food retailers in food deserts. Corporate giving programs from food companies sometimes support food security nonprofits.",
      },
    ],
    related: ["health", "human-services", "youth", "environment"],
  },
  "faith-based": {
    label: "Faith-Based Organizations",
    categories: ["faith", "religious", "church", "congregation", "faith-based", "interfaith", "ministry"],
    intro:
      "Faith-based organizations are among the most active community service providers in the country, delivering food assistance, housing support, counseling, educational programs, and disaster relief through networks that reach deep into underserved communities. Federal law explicitly allows faith-based organizations to compete for government grants for secular programs, and many federal agencies have established Centers for Faith and Opportunity Initiatives to ensure equal access. HUD, DOL, HHS, and USDA all fund faith-based organizations delivering social services. Foundation funding for faith-based organizations tends to focus on programs rather than religious activities—funders support the community benefit work of congregations and faith-based nonprofits. Organizations must typically establish a 501(c)(3) or demonstrate fiscal sponsorship to receive most grants. Successful faith-based grant applications clearly separate the funded secular program from religious activities and document community reach, volunteer leverage, and cost-effectiveness.",
    faqs: [
      {
        q: "Can churches and congregations apply for government grants?",
        a: "Yes, for secular programs. Under the Equal Treatment regulations, faith-based organizations can compete for federal grants on the same basis as any other nonprofit. The funded program must be secular in nature and not use grant funds for religious activities.",
      },
      {
        q: "Do faith-based organizations need 501(c)(3) status to get grants?",
        a: "Most grants require 501(c)(3) or equivalent tax-exempt status. Churches are automatically tax-exempt under IRS code but may need to obtain formal 501(c)(3) determination letters for grant applications. Fiscal sponsorship is another option.",
      },
      {
        q: "Are there foundation grants specifically for faith-based organizations?",
        a: "Some foundations specifically fund faith-based work including Lilly Endowment, Louisville Institute, and various regional community foundations. Others fund the secular community service work of faith-based organizations without a specific faith-based designation.",
      },
      {
        q: "What makes a strong faith-based grant proposal?",
        a: "Strong faith-based proposals document community need, demonstrate deep community trust and volunteer networks, show cost-effectiveness (often lower overhead due to donated space), provide clear separation of funded secular activities, and present measurable community outcomes.",
      },
    ],
    related: ["human-services", "housing", "food-security", "youth"],
  },
  research: {
    label: "Research",
    categories: ["research", "science", "academic", "study", "clinical trial", "grant research", "university"],
    intro:
      "Research grants fund scientific inquiry, academic scholarship, program evaluation, and policy research across every sector. NIH is the world's largest public funder of biomedical and behavioral research, distributing more than $47 billion annually. NSF funds basic research across science, engineering, mathematics, and social sciences. DOE funds energy and physics research. USDA funds agricultural and food systems research. NEH and NEA fund humanities and arts research. Private foundations including Gates, Howard Hughes Medical Institute, MacArthur, and Simons Foundation invest heavily in scientific research. Industry-sponsored research through pharmaceutical, technology, and energy companies also generates significant grant funding at universities and research centers. Research grant proposals must include rigorous study designs, qualified investigators with relevant credentials, institutional support, detailed budgets with indirect cost rates, IRB/IACUC approvals where required, and data management plans.",
    faqs: [
      {
        q: "What are the main NIH grant mechanisms?",
        a: "Common NIH mechanisms include R01 (standard research project), R21 (exploratory/developmental), R03 (small research), K-series (career development), and F-series (fellowships). Each has different budget limits, page limits, and review criteria.",
      },
      {
        q: "Can small nonprofits without research infrastructure apply for research grants?",
        a: "Some research grants are accessible to community-based organizations, especially for community-engaged research, participatory action research, and program evaluation. Partnering with a university as the primary grantee is common for organizations building research capacity.",
      },
      {
        q: "What is indirect cost rate (F&A) and how does it affect grant budgets?",
        a: "Indirect costs (Facilities & Administrative costs) cover overhead expenses not directly tied to the project. Rates are negotiated with the federal government and typically range from 26% to 65% of direct costs. Some funders cap indirect costs or exclude them entirely.",
      },
      {
        q: "How long does it take to receive research grant funding after submission?",
        a: "NIH grants typically take 9-12 months from submission to funding. NSF takes 6-12 months. Foundation research grants vary from 3-12 months. Many foundations have letter of inquiry (LOI) processes that add 2-3 months before full proposal invitation.",
      },
    ],
    related: ["healthcare", "education", "technology", "environment"],
  },
  "human-services": {
    label: "Human Services",
    categories: ["human services", "social services", "case management", "family services", "disability", "seniors", "domestic violence"],
    intro:
      "Human services grants fund the broad array of programs that support individuals and families in crisis and help vulnerable populations achieve stability and self-sufficiency. HHS is the primary federal funder through programs administered by ACF, SAMHSA, HRSA, and ACL covering child welfare, substance use treatment, family support, disability services, aging services, and domestic violence prevention. Block grants like the Social Services Block Grant (SSBG) and Community Services Block Grant (CSBG) provide flexible human services funding through state agencies. United Way affiliates across the country invest hundreds of millions annually in human services. Local community foundations prioritize human services as their top funding category. Human services grant proposals must document community need through census data and local assessments, demonstrate evidence-based service models, show organizational capacity and track record, and present clear outcome metrics tied to client stability indicators.",
    faqs: [
      {
        q: "What is CSBG and who receives it?",
        a: "Community Services Block Grant funds Community Action Agencies (CAAs) in every state to reduce poverty. CAAs are designated by state agencies and typically operate a broad array of anti-poverty programs. Other nonprofits can receive CSBG subgrants from their state's designated agency.",
      },
      {
        q: "Are there grants for domestic violence organizations?",
        a: "Yes. The Violence Against Women Act (VAWA) funds domestic violence, sexual assault, dating violence, and stalking services through OVW grants administered by states. Many foundations including Blue Shield of California Foundation also prioritize domestic violence.",
      },
      {
        q: "What human services grants are available for seniors?",
        a: "The Older Americans Act funds senior nutrition (congregate and home-delivered meals), transportation, caregiver support, and legal assistance through Area Agencies on Aging. The Centers for Medicare & Medicaid Services fund various senior care programs.",
      },
      {
        q: "How do human services organizations demonstrate impact to funders?",
        a: "Common impact metrics include number of individuals/families served, crisis episodes prevented (hospitalizations, evictions, foster care placements), employment and income stability outcomes, and client-reported wellbeing improvements.",
      },
    ],
    related: ["healthcare", "housing", "food-security", "youth"],
  },
  "small-business": {
    label: "Small Business",
    categories: ["small business", "entrepreneur", "microenterprise", "startup", "minority business", "women-owned"],
    intro:
      "Small business grants provide capital to entrepreneurs, microenterprises, and small businesses without the repayment burden of loans. The SBA administers the Small Business Innovation Research (SBIR) and Small Business Technology Transfer (STTR) programs, distributing over $3 billion annually to small businesses conducting R&D. SBA also funds Small Business Development Centers (SBDCs), Women's Business Centers (WBCs), and SCORE mentoring programs. The Minority Business Development Agency (MBDA) funds business centers and provides grants to minority-owned businesses. Economic Development Administration (EDA) funds business incubators, accelerators, and regional economic development strategies. State economic development agencies, regional development organizations, and community development financial institutions (CDFIs) administer small business grant programs. Foundation grants for small business tend to focus on underserved entrepreneurs—women, BIPOC, veterans, and low-income business owners. Strong small business grant applications demonstrate business viability, job creation potential, community economic impact, and entrepreneur qualifications.",
    faqs: [
      {
        q: "What is SBIR/STTR and which businesses qualify?",
        a: "SBIR (Small Business Innovation Research) and STTR (Small Business Technology Transfer) are federal grant programs for small businesses (under 500 employees) conducting R&D with commercialization potential. STTR requires a research institution partner.",
      },
      {
        q: "Are there grants specifically for minority-owned businesses?",
        a: "Yes. MBDA Business Centers provide free consulting and grant referrals. SBA 8(a) program participants can access set-aside contracts. Many state programs and CDFIs offer grants specifically targeting minority entrepreneurs.",
      },
      {
        q: "Can early-stage startups with no revenue apply for grants?",
        a: "Yes—SBIR Phase I awards are specifically designed for early-stage innovation. Many economic development grants fund pre-revenue businesses in incubators. Personal financial data and business plan quality matter more than revenue history for these awards.",
      },
      {
        q: "What is the difference between a grant and a loan for small businesses?",
        a: "Grants do not require repayment and are awarded based on eligibility and merit. Loans require repayment with interest. Grants are typically for specific activities or innovation, while loans fund working capital, equipment, or real estate.",
      },
    ],
    related: ["technology", "workforce", "research", "veterans"],
  },
  "mental-health": {
    label: "Mental Health",
    categories: ["mental health", "behavioral health", "substance use", "addiction", "counseling", "psychiatric", "crisis"],
    intro:
      "Mental health grants address the growing crisis of behavioral health needs in communities across America. SAMHSA (Substance Abuse and Mental Health Services Administration) is the primary federal funder of mental health and substance use programs, distributing block grants and competitive awards to states and nonprofits. CMHS block grants flow through state mental health agencies to community mental health centers. Competitive SAMHSA grants fund suicide prevention, first episode psychosis, peer support, crisis services, and integrated care. NIH funds mental health research through NIMH. DOJ funds mental health diversion and forensic programs. Foundations including the Patrick J. Kennedy Foundation, One Mind, and Wellcome Trust invest in mental health innovation and destigmatization. Corporate mental health initiatives from major employers are also generating new grant opportunities. Mental health grant proposals must cite prevalence data, document evidence-based clinical approaches, demonstrate licensed clinical staff, show coordination with crisis systems, and present clear recovery outcomes.",
    faqs: [
      {
        q: "What SAMHSA grants are available for community mental health?",
        a: "SAMHSA's Certified Community Behavioral Health Clinic (CCBHC) grants, First Episode Psychosis (FEP) grants, 988 Suicide and Crisis Lifeline grants, and System of Care Expansion grants are among the major competitive programs.",
      },
      {
        q: "Are there grants for peer support and lived experience programs?",
        a: "Yes. SAMHSA explicitly funds peer support through multiple programs. DBSA, NAMI, and many foundations fund peer specialist training and peer-run organizations. State mental health authorities increasingly fund peer support services.",
      },
      {
        q: "Can telehealth mental health services receive grant funding?",
        a: "Yes. FCC's Healthcare Connect Fund supports telehealth infrastructure. HRSA and SAMHSA fund telehealth mental health services, particularly in rural and underserved areas. Many foundation grants also support telehealth mental health programs.",
      },
      {
        q: "What credentials are required for mental health grant eligibility?",
        a: "Most clinical mental health grants require licensed mental health professionals (LCSW, LPC, psychologist, psychiatrist) on staff. Some peer support and prevention programs have lower credential requirements. Always review the specific solicitation.",
      },
    ],
    related: ["healthcare", "human-services", "youth", "veterans"],
  },
};

export const TOP_30_INDUSTRIES = Object.keys(INDUSTRY_META);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

// ---------------------------------------------------------------------------
// Static Params & Metadata
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return TOP_30_INDUSTRIES.map((industry) => ({ industry }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry } = await params;
  const meta = INDUSTRY_META[industry];
  if (!meta) return {};

  return {
    title: `${meta.label} Grants — Funding Opportunities | GrantAQ`,
    description: `Find ${meta.label.toLowerCase()} grants for your organization. Browse active funding opportunities, see award amounts and deadlines, and get AI-matched to grants you qualify for.`,
    alternates: {
      canonical: `https://grantaq.com/grants/${industry}`,
    },
    openGraph: {
      title: `${meta.label} Grants — Funding Opportunities | GrantAQ`,
      description: `Browse ${meta.label.toLowerCase()} grants and get matched to funding your organization qualifies for.`,
      url: `https://grantaq.com/grants/${industry}`,
      siteName: "GrantAQ",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IndustryHubPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  const meta = INDUSTRY_META[industry];
  if (!meta) notFound();

  const supabase = createAdminClient();
  const { data: grants, count } = await supabase
    .from("grant_sources")
    .select(
      "id, name, funder_name, source_type, amount_max, amount_min, deadline, category, description",
      { count: "exact" }
    )
    .eq("is_active", true)
    .in(
      "category",
      meta.categories.map((c) => c.toLowerCase())
    )
    .order("amount_max", { ascending: false, nullsFirst: false })
    .limit(24);

  const grantCount = count ?? grants?.length ?? 0;

  // Stats
  const amounts = (grants ?? [])
    .map((g) => g.amount_max)
    .filter((a): a is number => typeof a === "number" && a > 0);
  const totalFunding = amounts.reduce((s, a) => s + a, 0);
  const avgAward = amounts.length ? Math.round(totalFunding / amounts.length) : null;
  const topFunders = [
    ...new Set((grants ?? []).map((g) => g.funder_name).filter(Boolean)),
  ].slice(0, 4);

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://grantaq.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Grant Directory",
        item: "https://grantaq.com/grant-directory",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${meta.label} Grants`,
        item: `https://grantaq.com/grants/${industry}`,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Breadcrumbs */}
        <nav className="text-sm text-warm-500 mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-brand-teal">
                Home
              </Link>
            </li>
            <li className="text-warm-300">/</li>
            <li>
              <Link href="/grant-directory" className="hover:text-brand-teal">
                Grant Directory
              </Link>
            </li>
            <li className="text-warm-300">/</li>
            <li className="text-warm-700 dark:text-warm-300">{meta.label} Grants</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50">
            {meta.label} Grants:{" "}
            <span className="text-brand-teal">
              {grantCount > 0 ? `${grantCount}+` : "Active"} Funding Opportunities
            </span>
          </h1>
          <p className="text-warm-600 dark:text-warm-400 mt-4 max-w-3xl leading-relaxed">
            {meta.intro.slice(0, 320)}...
          </p>
        </div>

        {/* Stats Block */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Active Grants", value: grantCount > 0 ? `${grantCount}+` : "—" },
            {
              label: "Total Funding Tracked",
              value: totalFunding > 0 ? formatCurrency(totalFunding) : "—",
            },
            {
              label: "Average Award",
              value: avgAward ? formatCurrency(avgAward) : "—",
            },
            {
              label: "Top Funders",
              value: topFunders.length > 0 ? topFunders[0] : "Various",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-warm-200 dark:border-warm-700 p-4 bg-warm-50 dark:bg-warm-800/30 text-center"
            >
              <p className="text-xl font-bold text-brand-teal truncate">{stat.value}</p>
              <p className="text-xs text-warm-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Intro paragraph */}
        <div className="prose dark:prose-invert max-w-3xl mb-10">
          <p className="text-warm-600 dark:text-warm-400 leading-relaxed">{meta.intro}</p>
        </div>

        {/* Grant Cards */}
        {grants && grants.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-5">
              Featured {meta.label} Grants
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {grants.map((grant) => (
                <Link key={grant.id} href={`/grant-directory/${grant.id}`}>
                  <Card className="h-full border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug line-clamp-2">
                          {grant.name}
                        </CardTitle>
                        {grant.source_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300 shrink-0 capitalize">
                            {grant.source_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-warm-500">{grant.funder_name}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-warm-500 line-clamp-2 mb-3">
                        {grant.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-warm-600 dark:text-warm-400">
                        <span>
                          {grant.amount_max
                            ? `Up to ${formatCurrency(grant.amount_max)}`
                            : "Amount varies"}
                        </span>
                        <span>
                          {grant.deadline
                            ? `Due ${new Date(grant.deadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}`
                            : "Rolling deadline"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-warm-500 border border-warm-200 dark:border-warm-800 rounded-xl mb-10">
            <p className="font-medium">New grants are added daily.</p>
            <p className="text-sm mt-1">
              Create a free account to get notified when new {meta.label.toLowerCase()} grants
              are posted.
            </p>
          </div>
        )}

        {/* Related industries */}
        {meta.related.length > 0 && (
          <div className="mb-10">
            <h3 className="text-base font-semibold text-warm-700 dark:text-warm-300 mb-3">
              Related Funding Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {meta.related
                .filter((slug) => INDUSTRY_META[slug])
                .map((slug) => (
                  <Link key={slug} href={`/grants/${slug}`}>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300 hover:border-brand-teal hover:text-brand-teal transition-colors">
                      {INDUSTRY_META[slug].label} Grants
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-6">
            Frequently Asked Questions: {meta.label} Grants
          </h2>
          <div className="space-y-5">
            {meta.faqs.map((faq) => (
              <div
                key={faq.q}
                className="border border-warm-200 dark:border-warm-700 rounded-xl p-5"
              >
                <h3 className="font-semibold text-warm-900 dark:text-warm-50 mb-2">{faq.q}</h3>
                <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
            Find {meta.label} grants that match YOUR organization
          </h2>
          <p className="text-warm-500 mt-2 max-w-xl mx-auto">
            GrantAQ&apos;s AI matches your organization profile to every active{" "}
            {meta.label.toLowerCase()} grant you qualify for — in seconds.
          </p>
          <Button
            className="mt-5 bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/signup">Get Your Free Match Report</Link>}
          />
        </div>
      </div>
    </>
  );
}
