/**
 * Common NAICS codes mapped from industry selections.
 * Used as fallback when user doesn't know their NAICS code.
 */
const INDUSTRY_TO_NAICS: Record<string, string> = {
  // Technology
  it_services: "541511",
  computer_software: "511210",
  computer_security: "541512",
  computer_networking: "517311",
  computer_hardware: "334111",
  computer_games: "511210",
  internet: "519130",

  // Healthcare
  hospital_healthcare: "622110",
  medical_practice: "621111",
  medical_devices: "339112",
  mental_health: "621330",
  health_wellness: "621999",
  pharmaceuticals: "325412",
  alternative_medicine: "621399",

  // Education
  higher_education: "611310",
  k12_education: "611110",
  education_management: "611710",
  elearning: "611710",
  professional_training: "611430",

  // Food & Agriculture
  farming: "111100",
  food_beverages: "311999",
  food_production: "311999",
  restaurants: "722511",
  dairy: "112120",
  ranching: "112111",
  fishery: "114111",

  // Construction & Real Estate
  construction: "236220",
  real_estate: "531210",
  architecture_planning: "541310",
  building_materials: "444190",
  civil_engineering: "237310",

  // Manufacturing
  electrical_manufacturing: "335999",
  industrial_automation: "333249",
  machinery: "333249",
  chemicals: "325199",
  plastics: "326199",
  textiles: "313110",

  // Finance & Business
  financial_services: "523999",
  banking: "522110",
  insurance: "524210",
  legal_services: "541110",
  business_supplies: "423420",
  logistics: "488510",
  human_resources: "541612",

  // Arts & Media
  performing_arts: "711110",
  fine_art: "711510",
  music: "711130",
  film: "512110",
  broadcast_media: "515120",
  animation: "512110",
  graphic_design: "541430",
  photography: "541921",
  publishing: "511130",
  newspapers: "511110",
  online_media: "519130",
  media_production: "512110",

  // Energy & Environment
  renewables: "221114",
  oil_energy: "211120",
  environmental_services: "562910",

  // Nonprofit & Social
  civic_social: "813410",
  nonprofit_management: "813211",
  family_services: "624190",
  philanthropy: "813211",
  religious: "813110",

  // Other
  retail: "445110",
  wholesale: "423990",
  hospitality: "721110",
  transportation: "484110",
  automotive: "441110",
  defense_space: "336411",
  biotechnology: "541711",
  nanotechnology: "541711",
  research: "541712",
  veterinary: "541940",
  warehousing: "493110",
  consumer_goods: "311999",
  cosmetics: "325620",
  sporting_goods: "451110",
  wine_spirits: "312130",
  telecommunications: "517311",
  utilities: "221310",
  government_admin: "921110",
  public_safety: "922120",
  import_export: "423990",
  maritime: "483111",
  mining_metals: "212210",
  semiconductors: "334413",
  wireless: "517312",
  supermarkets: "445110",
  furniture: "337110",
  printing: "323111",
  packaging: "322211",
  apparel_fashion: "315990",
  luxury_goods: "448310",
  consumer_electronics: "443142",
  consumer_services: "812990",
  design: "541430",
  information_services: "519190",
  think_tanks: "541720",
  recreation: "713940",
  sports: "711211",
  leisure_travel: "721110",
  libraries: "519120",
  museums: "712110",
};

/**
 * Get a likely NAICS code for an industry. Returns null if no mapping exists.
 */
export function lookupNaicsFromIndustry(industry: string): string | null {
  return INDUSTRY_TO_NAICS[industry] ?? null;
}
