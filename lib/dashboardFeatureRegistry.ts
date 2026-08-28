// Only for seeding per-plan defaults for the core pages below. planPermissions
// imports permissions.ts and nothing else, so there is no cycle back here.
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";

export type DashboardFeaturePlanCode = "STARTER" | "PRO" | "ENTERPRISE" | "CUSTOM";

export type DashboardBusinessGroup = "retail" | "distribution" | "trading" | "wholesale" | "manufacturing" | "service" | "restaurant" | "healthcare" | "real_estate" | "construction" | "school" | "hotel" | "pharmacy" | "transport" | "trade" | "ecommerce" | "salon" | "gym" | "agriculture" | "ngo" | "law_firm" | "it" | "automotive" | "repair" | "maintenance" | "media" | "subscriptions" | "isp" | "solar" | "events" | "rentals" | "travel" | "firm" | "franchise";

export type DashboardFeatureDefinition = {
  id: string;
  label: string;
  route: string;
  business: DashboardBusinessGroup;
  businessLabel: string;
  section: string;
  businessTypes?: string[];
  description?: string;
  category?: string;
  plans?: string[];
  defaultEnabled?: boolean;
  /**
   * Cross-business page — a salon, a pharmacy and a trading company all get it.
   * Core pages ignore `business` / `businessTypes` entirely and appear in every
   * business type's list in Plans → Pages & Modules.
   */
  core?: boolean;
  /**
   * The permission this page used to be gated by. Only used to seed the
   * per-plan defaults in `createDefaultDashboardFeatureFlags` so a fresh
   * install starts on the same ladder the pricing page sells; once an admin
   * saves Pages & Modules, their list wins and this is ignored.
   */
  permKey?: string;
};

export const DASHBOARD_FEATURE_DEFS: DashboardFeatureDefinition[] = [
  {
    id: "SALON_OVERVIEW",
    label: "Salon Overview",
    route: "/dashboard/salon",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Control Center",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_APPOINTMENTS",
    label: "Appointments",
    route: "/dashboard/salon/appointments",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Front Desk",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_STYLISTS",
    label: "Stylists",
    route: "/dashboard/salon/stylists",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Team & Capacity",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_SERVICES",
    label: "Service Menu",
    route: "/dashboard/salon/services",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Commercial",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_PACKAGES",
    label: "Beauty Packages",
    route: "/dashboard/salon/packages",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Commercial",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_CLIENT_HISTORY",
    label: "Client History",
    route: "/dashboard/salon/client-history",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Customer Desk",
    businessTypes: ["salon"],
  },
  {
    id: "SALON_ANALYTICS",
    label: "Salon Analytics",
    route: "/dashboard/salon/analytics",
    business: "salon",
    businessLabel: "Salon / Beauty",
    section: "Control Center",
    businessTypes: ["salon"],
  },
  {
    id: "GYM_OVERVIEW",
    label: "Gym Overview",
    route: "/dashboard/gym",
    business: "gym",
    businessLabel: "Gym / Fitness",
    section: "Control Center",
    businessTypes: ["gym"],
  },
  {
    id: "GYM_MEMBERSHIPS",
    label: "Memberships",
    route: "/dashboard/gym/memberships",
    business: "gym",
    businessLabel: "Gym / Fitness",
    section: "Membership Desk",
    businessTypes: ["gym"],
  },
  {
    id: "GYM_CLASSES",
    label: "Classes",
    route: "/dashboard/gym/classes",
    business: "gym",
    businessLabel: "Gym / Fitness",
    section: "Operations",
    businessTypes: ["gym"],
  },
  {
    id: "GYM_TRAINERS",
    label: "Trainers",
    route: "/dashboard/gym/trainers",
    business: "gym",
    businessLabel: "Gym / Fitness",
    section: "Operations",
    businessTypes: ["gym"],
  },
  {
    id: "GYM_ANALYTICS",
    label: "Gym Analytics",
    route: "/dashboard/gym/analytics",
    business: "gym",
    businessLabel: "Gym / Fitness",
    section: "Control Center",
    businessTypes: ["gym"],
  },
  {
    id: "AGRICULTURE_OVERVIEW",
    label: "Farm Overview",
    route: "/dashboard/agriculture",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Control Center",
    businessTypes: ["agriculture"],
  },
  {
    id: "AGRICULTURE_CROPS",
    label: "Crops",
    route: "/dashboard/agriculture/crops",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Farm Desk",
    businessTypes: ["agriculture"],
  },
  {
    id: "AGRICULTURE_LIVESTOCK",
    label: "Livestock",
    route: "/dashboard/agriculture/livestock",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Farm Desk",
    businessTypes: ["agriculture"],
  },
  {
    id: "AGRICULTURE_FIELDS",
    label: "Fields",
    route: "/dashboard/agriculture/fields",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Farm Desk",
    businessTypes: ["agriculture"],
  },
  {
    id: "AGRICULTURE_HARVEST",
    label: "Harvest",
    route: "/dashboard/agriculture/harvest",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Farm Desk",
    businessTypes: ["agriculture"],
  },
  {
    id: "AGRICULTURE_ANALYTICS",
    label: "Farm Analytics",
    route: "/dashboard/agriculture/analytics",
    business: "agriculture",
    businessLabel: "Agriculture / Farm",
    section: "Control Center",
    businessTypes: ["agriculture"],
  },
  {
    id: "NGO_OVERVIEW",
    label: "NGO Overview",
    route: "/dashboard/ngo",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Control Center",
    businessTypes: ["ngo"],
  },
  {
    id: "NGO_DONORS",
    label: "Donors",
    route: "/dashboard/ngo/donors",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Fundraising",
    businessTypes: ["ngo"],
  },
  {
    id: "NGO_GRANTS",
    label: "Grants",
    route: "/dashboard/ngo/grants",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Fundraising",
    businessTypes: ["ngo"],
  },
  {
    id: "NGO_BENEFICIARIES",
    label: "Beneficiaries",
    route: "/dashboard/ngo/beneficiaries",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Programs",
    businessTypes: ["ngo"],
  },
  {
    id: "NGO_FUNDS",
    label: "Fund Accounting",
    route: "/dashboard/ngo/funds",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Finance Desk",
    businessTypes: ["ngo"],
  },
  {
    id: "NGO_ANALYTICS",
    label: "NGO Analytics",
    route: "/dashboard/ngo/analytics",
    business: "ngo",
    businessLabel: "NGO / Non-Profit",
    section: "Control Center",
    businessTypes: ["ngo"],
  },
  {
    id: "LAW_OVERVIEW",
    label: "Law Overview",
    route: "/dashboard/law-firm",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Control Center",
    businessTypes: ["law_firm"],
  },
  {
    id: "LAW_CASES",
    label: "Cases",
    route: "/dashboard/law-firm/cases",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Practice Desk",
    businessTypes: ["law_firm"],
  },
  {
    id: "LAW_CLIENTS",
    label: "Clients",
    route: "/dashboard/law-firm/clients",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Practice Desk",
    businessTypes: ["law_firm"],
  },
  {
    id: "LAW_BILLING",
    label: "Legal Billing",
    route: "/dashboard/law-firm/billing",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Finance Desk",
    businessTypes: ["law_firm"],
  },
  {
    id: "LAW_TIME_BILLING",
    label: "Time Billing",
    route: "/dashboard/law-firm/time-billing",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Finance Desk",
    businessTypes: ["law_firm"],
  },
  {
    id: "LAW_ANALYTICS",
    label: "Law Analytics",
    route: "/dashboard/law-firm/analytics",
    business: "law_firm",
    businessLabel: "Law Firm",
    section: "Control Center",
    businessTypes: ["law_firm"],
  },
  {
    id: "IT_OVERVIEW",
    label: "IT Overview",
    route: "/dashboard/it",
    business: "it",
    businessLabel: "IT Company",
    section: "Control Center",
    description: "IT project, contract, sprint, aur support command center.",
    category: "business_modules",
    businessTypes: ["it_company"],
    plans: ["starter", "professional", "enterprise"],
    defaultEnabled: true,
  },
  {
    id: "IT_PROJECTS",
    label: "Projects",
    route: "/dashboard/it/projects",
    business: "it",
    businessLabel: "IT Company",
    section: "Delivery",
    businessTypes: ["it_company", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "IT_SPRINTS",
    label: "Sprints",
    route: "/dashboard/it/sprints",
    business: "it",
    businessLabel: "IT Company",
    section: "Delivery",
    businessTypes: ["it_company"],
  },
  {
    id: "IT_CONTRACTS",
    label: "Contracts",
    route: "/dashboard/it/contracts",
    business: "it",
    businessLabel: "IT Company",
    section: "Commercial",
    businessTypes: ["it_company"],
  },
  {
    id: "IT_ANALYTICS",
    label: "IT Analytics",
    route: "/dashboard/it/analytics",
    business: "it",
    businessLabel: "IT Company",
    section: "Control Center",
    description: "Delivery health, support backlog, aur stack mix analytics.",
    category: "business_modules",
    businessTypes: ["it_company"],
    plans: ["starter", "professional", "enterprise"],
    defaultEnabled: true,
  },
  {
    id: "IT_SUPPORT",
    label: "Support Tickets",
    route: "/dashboard/it/support",
    business: "it",
    businessLabel: "IT Company",
    section: "Support",
    businessTypes: ["it_company"],
  },
  {
    id: "AUTOMOTIVE_OVERVIEW",
    label: "Showroom Overview",
    route: "/dashboard/automotive",
    business: "automotive",
    businessLabel: "Car Showroom",
    section: "Control Center",
    businessTypes: ["car_showroom"],
  },
  {
    id: "AUTOMOTIVE_VEHICLES",
    label: "Vehicle Stock",
    route: "/dashboard/automotive/vehicles",
    business: "automotive",
    businessLabel: "Car Showroom",
    section: "Inventory",
    businessTypes: ["car_showroom"],
  },
  {
    id: "AUTOMOTIVE_TEST_DRIVES",
    label: "Test Drives",
    route: "/dashboard/automotive/test-drives",
    business: "automotive",
    businessLabel: "Car Showroom",
    section: "Sales Desk",
    businessTypes: ["car_showroom"],
  },
  {
    id: "AUTOMOTIVE_ANALYTICS",
    label: "Showroom Analytics",
    route: "/dashboard/automotive/analytics",
    business: "automotive",
    businessLabel: "Car Showroom",
    section: "Control Center",
    businessTypes: ["car_showroom"],
  },
  {
    id: "AUTOMOTIVE_DEALS",
    label: "Deals & Finance",
    route: "/dashboard/automotive/deals",
    business: "automotive",
    businessLabel: "Car Showroom",
    section: "Sales Desk",
    businessTypes: ["car_showroom"],
  },
  {
    id: "WORKSHOP_OVERVIEW",
    label: "Workshop Overview",
    route: "/dashboard/workshop",
    business: "automotive",
    businessLabel: "Car Workshop",
    section: "Control Center",
    businessTypes: ["car_workshop"],
  },
  {
    id: "WORKSHOP_JOBS",
    label: "Job Cards",
    route: "/dashboard/workshop/jobs",
    business: "automotive",
    businessLabel: "Workshop / Jobs",
    section: "Service Desk",
    businessTypes: ["car_workshop"],
  },
  {
    id: "WORKSHOP_PARTS",
    label: "Parts Used",
    route: "/dashboard/workshop/parts",
    business: "automotive",
    businessLabel: "Workshop / Jobs",
    section: "Service Desk",
    businessTypes: ["car_workshop"],
  },
  {
    id: "WORKSHOP_MECHANICS",
    label: "Mechanics",
    route: "/dashboard/workshop/mechanics",
    business: "automotive",
    businessLabel: "Workshop / Jobs",
    section: "Service Desk",
    businessTypes: ["car_workshop"],
  },
  {
    id: "WORKSHOP_WARRANTY",
    label: "Warranty",
    route: "/dashboard/workshop/warranty",
    business: "automotive",
    businessLabel: "Workshop / Jobs",
    section: "Service Desk",
    businessTypes: ["car_workshop"],
  },
  {
    id: "WORKSHOP_ANALYTICS",
    label: "Workshop Analytics",
    route: "/dashboard/workshop/analytics",
    business: "automotive",
    businessLabel: "Car Workshop",
    section: "Control Center",
    businessTypes: ["car_workshop"],
  },
  {
    id: "REPAIR_OVERVIEW",
    label: "Repair Overview",
    route: "/dashboard/repair",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Control Center",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair", "spare_parts"],
  },
  {
    id: "REPAIR_JOBS",
    label: "Repair Job Cards",
    route: "/dashboard/repair/jobs",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Service Desk",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair"],
  },
  {
    id: "REPAIR_PARTS",
    label: "Spare Parts",
    route: "/dashboard/repair/parts",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Service Desk",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair"],
  },
  {
    id: "REPAIR_WARRANTY",
    label: "Warranty",
    route: "/dashboard/repair/warranty",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Service Desk",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair"],
  },
  {
    id: "REPAIR_TECHNICIANS",
    label: "Technicians",
    route: "/dashboard/repair/technicians",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Service Desk",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair"],
  },
  {
    id: "REPAIR_ANALYTICS",
    label: "Repair Analytics",
    route: "/dashboard/repair/analytics",
    business: "repair",
    businessLabel: "Repair Jobs",
    section: "Control Center",
    businessTypes: ["mobile_repair", "computer_repair", "electronics_repair", "spare_parts"],
  },
  {
    id: "MAINTENANCE_OVERVIEW",
    label: "Maintenance Overview",
    route: "/dashboard/maintenance",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Control Center",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MAINTENANCE_CONTRACTS",
    label: "AMC Contracts",
    route: "/dashboard/maintenance/contracts",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Contracts",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MAINTENANCE_SCHEDULE",
    label: "Service Schedule",
    route: "/dashboard/maintenance/schedule",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Operations",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MAINTENANCE_JOBS",
    label: "Service Jobs",
    route: "/dashboard/maintenance/jobs",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Operations",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MAINTENANCE_PARTS",
    label: "Parts & Stock",
    route: "/dashboard/maintenance/parts",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Operations",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MAINTENANCE_ANALYTICS",
    label: "Maintenance Analytics",
    route: "/dashboard/maintenance/analytics",
    business: "maintenance",
    businessLabel: "Equipment Maintenance",
    section: "Control Center",
    businessTypes: ["equipment_maintenance"],
  },
  {
    id: "MEDIA_OVERVIEW",
    label: "Media Overview",
    route: "/dashboard/media",
    business: "media",
    businessLabel: "Media & Advertising",
    section: "Control Center",
    businessTypes: ["advertising_agency", "digital_marketing", "media_house", "production_house", "printing_press"],
  },
  {
    id: "MEDIA_CAMPAIGNS",
    label: "Campaigns",
    route: "/dashboard/media/campaigns",
    business: "media",
    businessLabel: "Media & Advertising",
    section: "Campaign Desk",
    businessTypes: ["advertising_agency", "digital_marketing", "media_house", "production_house"],
  },
  {
    id: "MEDIA_CLIENTS",
    label: "Clients",
    route: "/dashboard/media/clients",
    business: "media",
    businessLabel: "Media & Advertising",
    section: "Campaign Desk",
    businessTypes: ["advertising_agency", "digital_marketing", "media_house", "production_house"],
  },
  {
    id: "MEDIA_PLAN",
    label: "Media Plan",
    route: "/dashboard/media/media-plan",
    business: "media",
    businessLabel: "Media & Advertising",
    section: "Campaign Desk",
    businessTypes: ["advertising_agency", "digital_marketing", "media_house", "production_house"],
  },
  {
    id: "MEDIA_ANALYTICS",
    label: "Media Analytics",
    route: "/dashboard/media/analytics",
    business: "media",
    businessLabel: "Media & Advertising",
    section: "Control Center",
    businessTypes: ["advertising_agency", "digital_marketing", "media_house", "production_house", "printing_press"],
  },
  {
    id: "SUBSCRIPTIONS_OVERVIEW",
    label: "SaaS Overview",
    route: "/dashboard/subscriptions",
    business: "subscriptions",
    businessLabel: "Subscriptions",
    section: "Control Center",
    businessTypes: ["saas_company", "membership_website", "subscription_box"],
  },
  {
    id: "SUBSCRIPTIONS_PLANS",
    label: "Plans",
    route: "/dashboard/subscriptions/plans",
    business: "subscriptions",
    businessLabel: "Subscriptions",
    section: "Commercial",
    businessTypes: ["saas_company", "membership_website", "subscription_box"],
  },
  {
    id: "SUBSCRIPTIONS_SUBSCRIBERS",
    label: "Subscribers",
    route: "/dashboard/subscriptions/subscribers",
    business: "subscriptions",
    businessLabel: "Subscriptions",
    section: "Customer Desk",
    businessTypes: ["saas_company", "membership_website", "subscription_box"],
  },
  {
    id: "SUBSCRIPTIONS_BILLING",
    label: "Recurring Billing",
    route: "/dashboard/subscriptions/billing",
    business: "subscriptions",
    businessLabel: "Subscriptions",
    section: "Finance Desk",
    businessTypes: ["saas_company", "membership_website", "subscription_box"],
  },
  {
    id: "SUBSCRIPTIONS_MRR",
    label: "MRR / ARR",
    route: "/dashboard/subscriptions/mrr",
    business: "subscriptions",
    businessLabel: "Subscriptions",
    section: "Control Center",
    businessTypes: ["saas_company", "membership_website", "subscription_box"],
  },
  {
    id: "MEMBERSHIP_CONTENT_TIERS",
    label: "Content Tiers",
    route: "/dashboard/subscriptions/content-tiers",
    business: "subscriptions",
    businessLabel: "Membership Website",
    section: "Content Desk",
    businessTypes: ["membership_website"],
  },
  {
    id: "MEMBERSHIP_MEMBER_ACCESS",
    label: "Member Access",
    route: "/dashboard/subscriptions/member-access",
    business: "subscriptions",
    businessLabel: "Membership Website",
    section: "Content Desk",
    businessTypes: ["membership_website"],
  },
  {
    id: "BOX_CATALOG",
    label: "Box Catalog",
    route: "/dashboard/subscriptions/box-catalog",
    business: "subscriptions",
    businessLabel: "Subscription Box",
    section: "Catalog Desk",
    businessTypes: ["subscription_box"],
  },
  {
    id: "BOX_FULFILLMENT",
    label: "Fulfillment Cycles",
    route: "/dashboard/subscriptions/fulfillment",
    business: "subscriptions",
    businessLabel: "Subscription Box",
    section: "Operations",
    businessTypes: ["subscription_box"],
  },
  {
    id: "ISP_OVERVIEW",
    label: "ISP Overview",
    route: "/dashboard/isp",
    business: "isp",
    businessLabel: "ISP / Cable Network",
    section: "Control Center",
    businessTypes: ["isp", "cable_network"],
  },
  {
    id: "ISP_CONNECTIONS",
    label: "Connections",
    route: "/dashboard/isp/connections",
    business: "isp",
    businessLabel: "ISP / Cable Network",
    section: "Operations",
    businessTypes: ["isp", "cable_network"],
  },
  {
    id: "ISP_BILLING",
    label: "Monthly Bills",
    route: "/dashboard/isp/billing",
    business: "isp",
    businessLabel: "ISP / Cable Network",
    section: "Finance Desk",
    businessTypes: ["isp", "cable_network"],
  },
  {
    id: "ISP_PACKAGES",
    label: "Packages",
    route: "/dashboard/isp/packages",
    business: "isp",
    businessLabel: "ISP / Cable Network",
    section: "Commercial",
    businessTypes: ["isp", "cable_network"],
  },
  {
    id: "ISP_SUPPORT",
    label: "Support Tickets",
    route: "/dashboard/isp/support",
    business: "isp",
    businessLabel: "ISP / Cable Network",
    section: "Support",
    businessTypes: ["isp", "cable_network"],
  },
  {
    id: "UTILITIES_OVERVIEW",
    label: "Utilities Overview",
    route: "/dashboard/utilities",
    business: "solar",
    businessLabel: "Utilities",
    section: "Control Center",
    businessTypes: ["electric_company", "gas_distribution", "water_supply"],
  },
  {
    id: "UTILITIES_CONNECTIONS",
    label: "Connections",
    route: "/dashboard/utilities/connections",
    business: "solar",
    businessLabel: "Utilities",
    section: "Operations",
    businessTypes: ["electric_company", "gas_distribution", "water_supply"],
  },
  {
    id: "UTILITIES_BILLING",
    label: "Utility Billing",
    route: "/dashboard/utilities/billing",
    business: "solar",
    businessLabel: "Utilities",
    section: "Finance Desk",
    businessTypes: ["electric_company", "gas_distribution", "water_supply"],
  },
  {
    id: "UTILITIES_METERS",
    label: "Meter Readings",
    route: "/dashboard/utilities/meters",
    business: "solar",
    businessLabel: "Utilities",
    section: "Operations",
    businessTypes: ["electric_company", "gas_distribution", "water_supply"],
  },
  {
    id: "UTILITIES_ANALYTICS",
    label: "Utilities Analytics",
    route: "/dashboard/utilities/analytics",
    business: "solar",
    businessLabel: "Utilities",
    section: "Control Center",
    businessTypes: ["electric_company", "gas_distribution", "water_supply"],
  },
  {
    id: "SOLAR_OVERVIEW",
    label: "Solar Overview",
    route: "/dashboard/solar",
    business: "solar",
    businessLabel: "Solar Company",
    section: "Control Center",
    businessTypes: ["solar_company"],
  },
  {
    id: "SOLAR_PROJECTS",
    label: "Projects",
    route: "/dashboard/solar/projects",
    business: "solar",
    businessLabel: "Solar Company",
    section: "Execution",
    businessTypes: ["solar_company"],
  },
  {
    id: "SOLAR_EQUIPMENT",
    label: "Equipment Stock",
    route: "/dashboard/solar/equipment",
    business: "solar",
    businessLabel: "Solar Company",
    section: "Execution",
    businessTypes: ["solar_company"],
  },
  {
    id: "SOLAR_AMC",
    label: "AMC Schedule",
    route: "/dashboard/solar/amc",
    business: "solar",
    businessLabel: "Solar Company",
    section: "Service Desk",
    businessTypes: ["solar_company"],
  },
  {
    id: "SOLAR_ANALYTICS",
    label: "Solar Analytics",
    route: "/dashboard/solar/analytics",
    business: "solar",
    businessLabel: "Solar Company",
    section: "Control Center",
    businessTypes: ["solar_company"],
  },
  {
    id: "EVENTS_OVERVIEW",
    label: "Events Overview",
    route: "/dashboard/events",
    business: "events",
    businessLabel: "Event Management",
    section: "Control Center",
    businessTypes: ["event_planner", "wedding_planner", "decorator", "sound_services"],
  },
  {
    id: "EVENTS_BOOKINGS",
    label: "Bookings",
    route: "/dashboard/events/bookings",
    business: "events",
    businessLabel: "Event Management",
    section: "Execution",
    businessTypes: ["event_planner", "wedding_planner", "decorator", "sound_services"],
  },
  {
    id: "EVENTS_VENDORS",
    label: "Vendors",
    route: "/dashboard/events/vendors",
    business: "events",
    businessLabel: "Event Management",
    section: "Execution",
    businessTypes: ["event_planner", "wedding_planner", "decorator", "sound_services"],
  },
  {
    id: "EVENTS_BUDGET",
    label: "Event Budget",
    route: "/dashboard/events/budget",
    business: "events",
    businessLabel: "Event Management",
    section: "Finance Desk",
    businessTypes: ["event_planner", "wedding_planner", "decorator", "sound_services"],
  },
  {
    id: "EVENTS_ANALYTICS",
    label: "Events Analytics",
    route: "/dashboard/events/analytics",
    business: "events",
    businessLabel: "Event Management",
    section: "Control Center",
    businessTypes: ["event_planner", "wedding_planner", "decorator", "sound_services"],
  },
  {
    id: "TRAVEL_OVERVIEW",
    label: "Travel Overview",
    route: "/dashboard/travel",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Control Center",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_TICKETS",
    label: "Airline Tickets",
    route: "/dashboard/travel/tickets",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Ticketing Desk",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_VISAS",
    label: "Visa Cases",
    route: "/dashboard/travel/visas",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Visa Desk",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_SETTLEMENTS",
    label: "Supplier Settlements",
    route: "/dashboard/travel/settlements",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Finance Desk",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_HOTELS",
    label: "Hotel Packages",
    route: "/dashboard/travel/hotel-packages",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Bookings",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_TOURS",
    label: "Group Tours",
    route: "/dashboard/travel/tours",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Bookings",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_PASSPORTS",
    label: "Passport Database",
    route: "/dashboard/travel/passports",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Operations",
    businessTypes: ["travel"],
  },
  {
    id: "TRAVEL_ANALYTICS",
    label: "Travel Analytics",
    route: "/dashboard/travel/analytics",
    business: "travel",
    businessLabel: "Travel Agency",
    section: "Control Center",
    businessTypes: ["travel"],
  },
  {
    id: "RENTALS_OVERVIEW",
    label: "Rentals Overview",
    route: "/dashboard/rentals",
    business: "rentals",
    businessLabel: "Rentals",
    section: "Control Center",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental", "car_rental"],
  },
  {
    id: "RENTALS_ITEMS",
    label: "Rental Items",
    route: "/dashboard/rentals/items",
    business: "rentals",
    businessLabel: "Rental Business",
    section: "Inventory",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental"],
  },
  {
    id: "RENTALS_BOOKINGS",
    label: "Bookings",
    route: "/dashboard/rentals/bookings",
    business: "rentals",
    businessLabel: "Rental Business",
    section: "Operations",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental"],
  },
  {
    id: "RENTALS_AGREEMENTS",
    label: "Agreements",
    route: "/dashboard/rentals/agreements",
    business: "rentals",
    businessLabel: "Rental Business",
    section: "Operations",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental"],
  },
  {
    id: "RENTALS_MAINTENANCE",
    label: "Maintenance",
    route: "/dashboard/rentals/maintenance",
    business: "rentals",
    businessLabel: "Rental Business",
    section: "Operations",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental"],
  },
  {
    id: "RENTALS_ANALYTICS",
    label: "Rentals Analytics",
    route: "/dashboard/rentals/analytics",
    business: "rentals",
    businessLabel: "Rentals",
    section: "Control Center",
    businessTypes: ["equipment_rental", "property_rental", "generator_rental", "car_rental"],
  },
  {
    id: "FRANCHISE_OVERVIEW",
    label: "Franchise Overview",
    route: "/dashboard/franchise",
    business: "franchise",
    businessLabel: "Franchise",
    section: "Control Center",
    businessTypes: ["chain_store", "franchise_brand", "franchise_restaurant"],
  },
  {
    id: "FRANCHISE_OUTLETS",
    label: "Outlets",
    route: "/dashboard/franchise/outlets",
    business: "franchise",
    businessLabel: "Franchise",
    section: "HQ Desk",
    businessTypes: ["chain_store", "franchise_brand", "franchise_restaurant"],
  },
  {
    id: "FRANCHISE_ROYALTY",
    label: "Royalty",
    route: "/dashboard/franchise/royalty",
    business: "franchise",
    businessLabel: "Franchise",
    section: "HQ Desk",
    businessTypes: ["chain_store", "franchise_brand", "franchise_restaurant"],
  },
  {
    id: "FRANCHISE_ANALYTICS",
    label: "Franchise Analytics",
    route: "/dashboard/franchise/analytics",
    business: "franchise",
    businessLabel: "Franchise",
    section: "Control Center",
    businessTypes: ["chain_store", "franchise_brand", "franchise_restaurant"],
  },
  {
    id: "FIRM_OVERVIEW",
    label: "Firm Overview",
    route: "/dashboard/firm",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Control Center",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "FIRM_CLIENTS",
    label: "Clients",
    route: "/dashboard/firm/clients",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Client Desk",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "FIRM_PROJECTS",
    label: "Engagements",
    route: "/dashboard/firm/projects",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Delivery",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "FIRM_BILLING",
    label: "Fee Billing",
    route: "/dashboard/firm/billing",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Finance Desk",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "FIRM_TIMESHEETS",
    label: "Timesheets",
    route: "/dashboard/firm/timesheets",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Delivery",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "CONSULTANCY_PROPOSALS",
    label: "Proposals",
    route: "/dashboard/firm/proposals",
    business: "firm",
    businessLabel: "Consultancy Firm",
    section: "Commercial",
    businessTypes: ["consultancy_firm"],
  },
  {
    id: "CONSULTANCY_DELIVERABLES",
    label: "Deliverables",
    route: "/dashboard/firm/deliverables",
    business: "firm",
    businessLabel: "Consultancy Firm",
    section: "Delivery",
    businessTypes: ["consultancy_firm"],
  },
  {
    id: "ARCH_DESIGN_BRIEFS",
    label: "Design Briefs",
    route: "/dashboard/firm/design-briefs",
    business: "firm",
    businessLabel: "Architecture Firm",
    section: "Design Desk",
    businessTypes: ["architecture_firm"],
  },
  {
    id: "ARCH_DRAWINGS",
    label: "Drawings",
    route: "/dashboard/firm/drawings",
    business: "firm",
    businessLabel: "Architecture Firm",
    section: "Design Desk",
    businessTypes: ["architecture_firm"],
  },
  {
    id: "ARCH_MILESTONES",
    label: "Milestones",
    route: "/dashboard/firm/milestones",
    business: "firm",
    businessLabel: "Architecture Firm",
    section: "Delivery",
    businessTypes: ["architecture_firm"],
  },
  {
    id: "AUDIT_PLANNING",
    label: "Audit Planning",
    route: "/dashboard/firm/audit-planning",
    business: "firm",
    businessLabel: "Audit Firm",
    section: "Audit Desk",
    businessTypes: ["audit_firm"],
  },
  {
    id: "AUDIT_FINDINGS",
    label: "Audit Findings",
    route: "/dashboard/firm/findings",
    business: "firm",
    businessLabel: "Audit Firm",
    section: "Audit Desk",
    businessTypes: ["audit_firm"],
  },
  {
    id: "FIRM_ANALYTICS",
    label: "Firm Analytics",
    route: "/dashboard/firm/analytics",
    business: "firm",
    businessLabel: "Professional Firm",
    section: "Analytics",
    businessTypes: ["accounting_firm", "audit_firm", "consultancy_firm", "architecture_firm"],
  },
  {
    id: "ECOMMERCE_OVERVIEW",
    label: "Ecommerce Overview",
    route: "/dashboard/ecommerce",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Control Center",
    businessTypes: ["ecommerce"],
  },
  {
    id: "ECOMMERCE_PRODUCTS",
    label: "Product Listings",
    route: "/dashboard/ecommerce/products",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Catalog",
    businessTypes: ["ecommerce"],
  },
  {
    id: "ECOMMERCE_ORDERS",
    label: "Orders",
    route: "/dashboard/ecommerce/orders",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Commercial",
    businessTypes: ["ecommerce"],
  },
  {
    id: "ECOMMERCE_RETURNS",
    label: "Returns",
    route: "/dashboard/ecommerce/returns",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Customer Care",
    businessTypes: ["ecommerce"],
  },
  {
    id: "ECOMMERCE_SHIPPING",
    label: "Shipping",
    route: "/dashboard/ecommerce/shipping",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Fulfillment",
    businessTypes: ["ecommerce"],
  },
  {
    id: "ECOMMERCE_ANALYTICS",
    label: "Ecommerce Analytics",
    route: "/dashboard/ecommerce/analytics",
    business: "ecommerce",
    businessLabel: "E-Commerce / Online Store",
    section: "Control Center",
    businessTypes: ["ecommerce"],
  },
  {
    id: "TRADE_OVERVIEW",
    label: "Import / Export Overview",
    route: "/dashboard/trade",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Control Center",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_SHIPMENTS",
    label: "Shipments",
    route: "/dashboard/trade/shipments",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Operations",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_LC",
    label: "LC / TT",
    route: "/dashboard/trade/lc",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Finance Desk",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_CUSTOMS",
    label: "Customs",
    route: "/dashboard/trade/customs",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Operations",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_HS_CODES",
    label: "HS Code Master",
    route: "/dashboard/trade/hs-codes",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Costing & Compliance",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_IMPORT_COSTING",
    label: "Import Costing",
    route: "/dashboard/trade/costing",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Costing & Compliance",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_COMMERCIAL_INVOICE",
    label: "Commercial Invoice",
    route: "/dashboard/commercial-invoice",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Export Documentation",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_PACKING_LIST",
    label: "Packing List",
    route: "/dashboard/packing-list",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Export Documentation",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_REBATE",
    label: "Export Rebate / Drawback",
    route: "/dashboard/trade/rebate",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Costing & Compliance",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_ANALYTICS",
    label: "Trade Analytics",
    route: "/dashboard/trade/analytics",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Control Center",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "CNF_JOBS",
    label: "C&F Job Files",
    route: "/dashboard/cnf",
    business: "trade",
    businessLabel: "Clearing & Forwarding",
    section: "C&F Operations",
    businessTypes: ["clearing_forwarding"],
  },
  {
    id: "TRADE_CONTAINERS",
    label: "Containers",
    route: "/dashboard/trade/containers",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Operations",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_FREIGHT",
    label: "Freight",
    route: "/dashboard/trade/freight",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Operations",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_CERTIFICATE_OF_ORIGIN",
    label: "Certificate of Origin",
    route: "/dashboard/trade/certificate-of-origin",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Export Documentation",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_EXPORT_DOCS",
    label: "Export Documents",
    route: "/dashboard/trade/export-docs",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Export Documentation",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRADE_EXPORT_PERFORMANCE",
    label: "Export Performance",
    route: "/dashboard/reports/export-performance",
    business: "trade",
    businessLabel: "Import / Export",
    section: "Control Center",
    businessTypes: ["import_company", "export_company", "clearing_forwarding"],
  },
  {
    id: "TRANSPORT_OVERVIEW",
    label: "Transport Overview",
    route: "/dashboard/transport",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Control Center",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_FLEET",
    label: "Fleet",
    route: "/dashboard/transport/fleet",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_TRIPS",
    label: "Trips",
    route: "/dashboard/transport/trips",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_DISPATCH",
    label: "Dispatch Board",
    route: "/dashboard/transport/dispatch",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_DRIVERS",
    label: "Drivers",
    route: "/dashboard/transport/drivers",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_FUEL",
    label: "Fuel Tracking",
    route: "/dashboard/transport/fuel",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_MAINTENANCE",
    label: "Maintenance",
    route: "/dashboard/transport/maintenance",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Operations",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_EXPENSES",
    label: "Trip Expenses",
    route: "/dashboard/transport/expenses",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Finance Desk",
    businessTypes: ["transport"],
  },
  {
    id: "TRANSPORT_ANALYTICS",
    label: "Transport Analytics",
    route: "/dashboard/transport/analytics",
    business: "transport",
    businessLabel: "Transport / Logistics",
    section: "Control Center",
    businessTypes: ["transport"],
  },
  {
    id: "PHARMACY_OVERVIEW",
    label: "Pharmacy Overview",
    route: "/dashboard/pharmacy",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Control Center",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_INVENTORY",
    label: "Drug Inventory",
    route: "/dashboard/pharmacy/inventory",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Inventory",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_BATCHES",
    label: "Batch Control",
    route: "/dashboard/pharmacy/batches",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Inventory",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_EXPIRY",
    label: "Expiry Tracking",
    route: "/dashboard/pharmacy/expiry",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Inventory",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_PURCHASES",
    label: "Medicine Purchases",
    route: "/dashboard/pharmacy/purchases",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Commercial",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_PRESCRIPTIONS",
    label: "Prescriptions",
    route: "/dashboard/pharmacy/prescriptions",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Operations",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_COUNTER_SALES",
    label: "Counter Sales",
    route: "/dashboard/pharmacy/counter-sales",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Commercial",
    businessTypes: ["pharmacy"],
  },
  {
    id: "PHARMACY_ANALYTICS",
    label: "Pharmacy Analytics",
    route: "/dashboard/pharmacy/analytics",
    business: "pharmacy",
    businessLabel: "Pharmacy / Medical Store",
    section: "Control Center",
    businessTypes: ["pharmacy"],
  },
  {
    id: "HOTEL_OVERVIEW",
    label: "Hotel Overview",
    route: "/dashboard/hotel",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Control Center",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_ROOMS",
    label: "Room Booking",
    route: "/dashboard/hotel/rooms",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Inventory",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_FRONT_DESK",
    label: "Front Desk",
    route: "/dashboard/hotel/front-desk",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Operations",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_HOUSEKEEPING",
    label: "Housekeeping",
    route: "/dashboard/hotel/housekeeping",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Operations",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_ROOM_SERVICE",
    label: "Room Service",
    route: "/dashboard/hotel/room-service",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Operations",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_FOLIOS",
    label: "Billing Folios",
    route: "/dashboard/hotel/folios",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Commercial",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_GUEST_HISTORY",
    label: "Guest History",
    route: "/dashboard/hotel/guest-history",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Commercial",
    businessTypes: ["hotel"],
  },
  {
    id: "HOTEL_ANALYTICS",
    label: "Hotel Analytics",
    route: "/dashboard/hotel/analytics",
    business: "hotel",
    businessLabel: "Hotel / Guest House",
    section: "Control Center",
    businessTypes: ["hotel"],
  },
  {
    id: "SCHOOL_OVERVIEW",
    label: "School Overview",
    route: "/dashboard/school",
    business: "school",
    businessLabel: "School / Academy",
    section: "Control Center",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_STUDENTS",
    label: "Students",
    route: "/dashboard/school/students",
    business: "school",
    businessLabel: "School / Academy",
    section: "Academic Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_ADMISSIONS",
    label: "Admissions",
    route: "/dashboard/school/admissions",
    business: "school",
    businessLabel: "School / Academy",
    section: "Front Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_ATTENDANCE",
    label: "Attendance",
    route: "/dashboard/school/attendance",
    business: "school",
    businessLabel: "School / Academy",
    section: "Academic Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_TEACHERS",
    label: "Teachers & Rooms",
    route: "/dashboard/school/teachers",
    business: "school",
    businessLabel: "School / Academy",
    section: "Academic Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_FEES",
    label: "Fee Collection",
    route: "/dashboard/school/fees",
    business: "school",
    businessLabel: "School / Academy",
    section: "Finance Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_SCHEDULE",
    label: "Class Schedule",
    route: "/dashboard/school/schedule",
    business: "school",
    businessLabel: "School / Academy",
    section: "Academic Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_EXAMS",
    label: "Exam Results",
    route: "/dashboard/school/exams",
    business: "school",
    businessLabel: "School / Academy",
    section: "Academic Desk",
    businessTypes: ["school"],
  },
  {
    id: "SCHOOL_ANALYTICS",
    label: "School Analytics",
    route: "/dashboard/school/analytics",
    business: "school",
    businessLabel: "School / Academy",
    section: "Control Center",
    businessTypes: ["school"],
  },
  {
    id: "CONSTRUCTION_OVERVIEW",
    label: "Construction Overview",
    route: "/dashboard/construction",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Control Center",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_PROJECTS",
    label: "Projects",
    route: "/dashboard/construction/projects",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Execution",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_SITES",
    label: "Site Management",
    route: "/dashboard/construction/sites",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Execution",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_MATERIALS",
    label: "Material Control",
    route: "/dashboard/construction/materials",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Procurement",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_BOQ",
    label: "BOQ Control",
    route: "/dashboard/construction/boq",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Commercial",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_BILLING",
    label: "Progress Billing",
    route: "/dashboard/construction/billing",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Commercial",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_EXPENSES",
    label: "Site Expenses",
    route: "/dashboard/construction/expenses",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Commercial",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_CONTRACTOR_PAYMENTS",
    label: "Contractor Payments",
    route: "/dashboard/construction/contractor-payments",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Commercial",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_SUBCONTRACTORS",
    label: "Subcontractors",
    route: "/dashboard/construction/subcontractors",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Execution",
    businessTypes: ["construction"],
  },
  {
    id: "CONSTRUCTION_ANALYTICS",
    label: "Construction Analytics",
    route: "/dashboard/construction/analytics",
    business: "construction",
    businessLabel: "Construction / Contractor",
    section: "Control Center",
    businessTypes: ["construction"],
  },
  {
    id: "REAL_ESTATE_OVERVIEW",
    label: "Real Estate Overview",
    route: "/dashboard/real-estate",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Control Center",
    businessTypes: ["real_estate"],
  },
  {
    id: "REAL_ESTATE_PROPERTIES",
    label: "Properties",
    route: "/dashboard/real-estate/properties",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Portfolio",
    businessTypes: ["real_estate"],
  },
  {
    id: "REAL_ESTATE_TENANTS",
    label: "Tenants",
    route: "/dashboard/real-estate/tenants",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Portfolio",
    businessTypes: ["real_estate"],
  },
  {
    id: "REAL_ESTATE_RENT",
    label: "Rent Collection",
    route: "/dashboard/real-estate/rent",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Portfolio",
    businessTypes: ["real_estate"],
  },
  {
    id: "REAL_ESTATE_LEASES",
    label: "Lease Agreements",
    route: "/dashboard/real-estate/leases",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Portfolio",
    businessTypes: ["real_estate"],
  },
  {
    id: "REAL_ESTATE_ANALYTICS",
    label: "Real Estate Analytics",
    route: "/dashboard/real-estate/analytics",
    business: "real_estate",
    businessLabel: "Real Estate",
    section: "Control Center",
    businessTypes: ["real_estate"],
  },
  {
    id: "HEALTHCARE_OVERVIEW",
    label: "Healthcare Overview",
    route: "/dashboard/hospital",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Control Center",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "HEALTHCARE_PATIENTS",
    label: "Patient Records",
    route: "/dashboard/hospital/patients",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Clinical Desk",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "HEALTHCARE_APPOINTMENTS",
    label: "Appointments",
    route: "/dashboard/hospital/appointments",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Front Desk",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "HEALTHCARE_PRESCRIPTIONS",
    label: "Prescriptions",
    route: "/dashboard/hospital/prescriptions",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Clinical Desk",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "HEALTHCARE_LAB",
    label: "Lab Tests",
    route: "/dashboard/hospital/lab",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Clinical Desk",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "HEALTHCARE_ANALYTICS",
    label: "Healthcare Analytics",
    route: "/dashboard/hospital/analytics",
    business: "healthcare",
    businessLabel: "Healthcare / Clinic",
    section: "Control Center",
    businessTypes: ["hospital", "clinic"],
  },
  {
    id: "RESTAURANT_OVERVIEW",
    label: "Restaurant Overview",
    route: "/dashboard/restaurant",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Control Center",
  },
  {
    id: "RESTAURANT_ORDER_BOARD",
    label: "Order Board",
    route: "/dashboard/restaurant/orders",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Operations",
  },
  {
    id: "RESTAURANT_RESERVATIONS",
    label: "Reservations",
    route: "/dashboard/restaurant/reservations",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Front Desk",
  },
  {
    id: "RESTAURANT_TABLES",
    label: "Table Management",
    route: "/dashboard/restaurant/tables",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Front Desk",
  },
  {
    id: "RESTAURANT_MENU",
    label: "Menu Items",
    route: "/dashboard/restaurant/menu",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Menu & Costing",
  },
  {
    id: "RESTAURANT_KITCHEN",
    label: "Kitchen Orders",
    route: "/dashboard/restaurant/kitchen",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Operations",
  },
  {
    id: "RESTAURANT_RECIPE_COSTING",
    label: "Recipe Costing",
    route: "/dashboard/restaurant/recipe-costing",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Menu & Costing",
  },
  {
    id: "RESTAURANT_ANALYTICS",
    label: "Restaurant Analytics",
    route: "/dashboard/restaurant/analytics",
    business: "restaurant",
    businessLabel: "Restaurant / Cafe",
    section: "Control Center",
  },
  {
    id: "SERVICE_OVERVIEW",
    label: "Service Overview",
    route: "/dashboard/services",
    business: "service",
    businessLabel: "Service / Agency",
    section: "Control Center",
  },
  {
    id: "SERVICE_CATALOG",
    label: "Service Catalog",
    route: "/dashboard/services/catalog",
    business: "service",
    businessLabel: "Service / Agency",
    section: "Commercial",
  },
  {
    id: "SERVICE_PROJECTS",
    label: "Client Projects",
    route: "/dashboard/services/projects",
    business: "service",
    businessLabel: "Service / Agency",
    section: "Delivery",
  },
  {
    id: "SERVICE_DELIVERY",
    label: "Delivery Tracker",
    route: "/dashboard/services/delivery",
    business: "service",
    businessLabel: "Service / Agency",
    section: "Delivery",
  },
  {
    id: "SERVICE_TIME_BILLING",
    label: "Time Billing",
    route: "/dashboard/services/time-billing",
    business: "service",
    businessLabel: "Service / Agency",
    section: "Billing",
  },
  {
    id: "FOOD_PROCESSING_OVERVIEW",
    label: "Food Processing Overview",
    route: "/dashboard/food-processing",
    business: "manufacturing",
    businessLabel: "Food Processing",
    section: "Control Center",
    businessTypes: ["food_processing"],
  },
  {
    id: "FOOD_PROCESSING_RECIPE",
    label: "Recipe Costing",
    route: "/dashboard/food-processing/recipe-costing",
    business: "manufacturing",
    businessLabel: "Food Processing",
    section: "Recipe & Costing",
    businessTypes: ["food_processing"],
  },
  {
    id: "FOOD_PROCESSING_ANALYTICS",
    label: "Food Processing Analytics",
    route: "/dashboard/food-processing/analytics",
    business: "manufacturing",
    businessLabel: "Food Processing",
    section: "Control Center",
    businessTypes: ["food_processing"],
  },
  {
    id: "MANUFACTURING_OVERVIEW",
    label: "Manufacturing Overview",
    route: "/dashboard/manufacturing",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Control Center",
  },
  {
    id: "MANUFACTURING_BOM",
    label: "Bill of Materials",
    route: "/dashboard/manufacturing/bom",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Production Planning",
  },
  {
    id: "MANUFACTURING_PRODUCTION_ORDERS",
    label: "Production Orders",
    route: "/dashboard/manufacturing/production-orders",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Production Planning",
  },
  {
    id: "MANUFACTURING_WORK_ORDERS",
    label: "Work Orders",
    route: "/dashboard/manufacturing/work-orders",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Production Planning",
  },
  {
    id: "MANUFACTURING_RAW_MATERIALS",
    label: "Raw Materials",
    route: "/dashboard/manufacturing/raw-materials",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Inventory & Quality",
  },
  {
    id: "MANUFACTURING_FINISHED_GOODS",
    label: "Finished Goods",
    route: "/dashboard/manufacturing/finished-goods",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Inventory & Quality",
  },
  {
    id: "MANUFACTURING_QUALITY",
    label: "Quality Control",
    route: "/dashboard/manufacturing/quality",
    business: "manufacturing",
    businessLabel: "Manufacturing",
    section: "Inventory & Quality",
  },
  {
    id: "RETAIL_POS",
    label: "POS Terminal",
    route: "/dashboard/retail/pos",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_POS_SESSIONS",
    label: "POS Sessions",
    route: "/dashboard/retail/pos-sessions",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_DISCOUNTS",
    label: "Discounts & Promotions",
    route: "/dashboard/retail/discounts",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_LOYALTY",
    label: "Loyalty Points",
    route: "/dashboard/retail/loyalty",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_STOCK_TRANSFER",
    label: "Stock Transfer",
    route: "/dashboard/retail/stock-transfer",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_ONLINE_SYNC",
    label: "Online Store Sync",
    route: "/dashboard/retail/online-sync",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_SUPPLIER_PORTAL",
    label: "Supplier Portal",
    route: "/dashboard/retail/supplier-portal",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Point of Sale",
  },
  {
    id: "RETAIL_CATALOG",
    label: "Product Catalog",
    route: "/dashboard/retail/catalog",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_STOCK_ADJUSTMENT",
    label: "Stock Adjustment",
    route: "/dashboard/retail/stock-adjustment",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_BATCH_EXPIRY",
    label: "Batch & Expiry",
    route: "/dashboard/retail/batch-expiry",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_CUSTOMERS",
    label: "Customer List",
    route: "/dashboard/retail/customers",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Customers & Suppliers",
  },
  {
    id: "RETAIL_SUPPLIERS",
    label: "Supplier List",
    route: "/dashboard/retail/suppliers",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Customers & Suppliers",
  },
  {
    id: "RETAIL_BRANCHES",
    label: "Branches",
    route: "/dashboard/retail/branches",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_BRANCH_USERS",
    label: "Branch Users",
    route: "/dashboard/retail/branch-users",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "RETAIL_BRANCH_REPORTS",
    label: "Branch Reports",
    route: "/dashboard/retail/branch-reports",
    business: "retail",
    businessLabel: "Retail Store",
    section: "Inventory & Multi-Store",
  },
  {
    id: "DISTRIBUTION_ROUTES",
    label: "Routes",
    route: "/dashboard/distribution/routes",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Operations",
  },
  {
    id: "DISTRIBUTION_DELIVERY",
    label: "Delivery Tracking",
    route: "/dashboard/distribution/delivery",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Operations",
  },
  {
    id: "DISTRIBUTION_VAN_SALES",
    label: "Van Sales",
    route: "/dashboard/distribution/van-sales",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Operations",
  },
  {
    id: "DISTRIBUTION_STOCK_ON_VAN",
    label: "Stock On Van",
    route: "/dashboard/distribution/stock-on-van",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Operations",
  },
  {
    id: "DISTRIBUTION_COLLECTIONS",
    label: "Collections",
    route: "/dashboard/distribution/collections",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Operations",
  },
  {
    id: "DISTRIBUTION_ANALYTICS",
    label: "Analytics",
    route: "/dashboard/distribution/analytics",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Control Center",
  },
  {
    id: "DISTRIBUTION_TRIP_SHEET",
    label: "Trip Sheet",
    route: "/dashboard/distribution/trip-sheet",
    business: "distribution",
    businessLabel: "Distribution",
    section: "Control Center",
  },
  {
    id: "TRADING_OVERVIEW",
    label: "Trading Overview",
    route: "/dashboard/trading",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_ORDER_DESK",
    label: "Order Desk",
    route: "/dashboard/trading/order-desk",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_PROCUREMENT",
    label: "Procurement",
    route: "/dashboard/trading/procurement",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_STOCK_CONTROL",
    label: "Stock Control",
    route: "/dashboard/trading/stock-control",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_OUTSTANDINGS",
    label: "Outstandings",
    route: "/dashboard/trading/outstandings",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_DISPATCH_BOARD",
    label: "Dispatch Board",
    route: "/dashboard/trading/dispatch-board",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_CONVERSION_CENTER",
    label: "Conversion Center",
    route: "/dashboard/trading/conversion-center",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_ANALYTICS",
    label: "Trading Analytics",
    route: "/dashboard/trading/analytics",
    business: "trading",
    businessLabel: "Trading",
    section: "Control Center",
  },
  {
    id: "TRADING_DELIVERY_ORDER",
    label: "Delivery Orders",
    route: "/dashboard/delivery-order",
    business: "trading",
    businessLabel: "Trading",
    section: "Sales",
    businessTypes: ["trading", "wholesale", "distribution"],
  },
  {
    id: "TRADING_STOCK_MOVEMENTS",
    label: "Stock Movements",
    route: "/dashboard/stock-movements",
    business: "trading",
    businessLabel: "Trading",
    section: "Inventory",
    businessTypes: ["trading", "wholesale", "distribution"],
  },
  {
    id: "TRADING_PRODUCT_CATEGORIES",
    label: "Product Categories",
    route: "/dashboard/product-categories",
    business: "trading",
    businessLabel: "Trading",
    section: "Inventory",
    businessTypes: ["trading", "wholesale", "distribution"],
  },
  // TRADING_WAREHOUSE_TRANSFERS moved to the core Inventory block below — the
  // sidebar links it from the shared Inventory group for every trade.
  {
    id: "TRADING_PURCHASE_REQUISITION",
    label: "Purchase Requisition",
    route: "/dashboard/purchase-requisition",
    business: "trading",
    businessLabel: "Trading",
    section: "Purchases",
    businessTypes: ["trading", "wholesale", "distribution"],
  },
  // Trading only, on purpose. A rate that falls out of gauge × width × length
  // is a trading-house habit; a salon or a clinic has nothing to put in those
  // columns, and the page would only be one more thing to ignore.
  {
    id: "TRADING_RATE_FORMULA",
    label: "Rate Formula",
    route: "/dashboard/rate-formula",
    business: "trading",
    businessLabel: "Trading",
    section: "Settings",
    businessTypes: ["trading"],
    description:
      "Price a line from your own calculation — rate per mm × gauge × width × length ÷ 54 — instead of a flat rate.",
  },

  // ── WHOLESALE ────────────────────────────────────────────────
  {
    id: "WHOLESALE_OVERVIEW",
    label: "Wholesale Overview",
    route: "/dashboard/wholesale",
    business: "wholesale",
    businessLabel: "Wholesale",
    section: "Control Center",
    businessTypes: ["wholesale"],
  },
  {
    id: "WHOLESALE_SALES_ORDER",
    label: "Sales Orders",
    route: "/dashboard/sales-order",
    business: "wholesale",
    businessLabel: "Wholesale",
    section: "Sales",
    businessTypes: ["wholesale", "trading", "distribution"],
  },
  // WHOLESALE_PRICE_LISTS moved to the core Inventory block below.
  {
    id: "WHOLESALE_CREDIT_LIMITS",
    label: "Credit Limits",
    route: "/dashboard/credit-limits",
    business: "wholesale",
    businessLabel: "Wholesale",
    section: "Finance Desk",
    businessTypes: ["wholesale", "trading", "distribution"],
  },
  // WHOLESALE_WAREHOUSES moved to the core Inventory block below.
  // ── Costing — deliberately not tied to one business type. A printer, a
  //    garment unit and a plastics moulder all cost their work from a formula;
  //    only the formula differs, and the user writes that themselves. So both
  //    are `core`: without it the industry guard read `business: "trading"`
  //    literally and bounced every non-trading company back to /dashboard from
  //    a link its own sidebar had just offered. ──
  // Manufacturing only. These were `core: true` on the reasoning that a printer,
  // a garment unit and a plastics moulder all cost jobs the same way — but none
  // of those are business types here; the catalogue has eight, and only
  // `manufacturing` carries the production modules (bom, work_orders,
  // raw_materials). So the flag put a job-costing sheet in front of every
  // trader, wholesaler and travel agent instead. Import / Export keeps its own
  // Import Costing page (TRADE_IMPORT_COSTING) and is unaffected.
  { id: "COSTING_SHEETS",   label: "Costing",  route: "/dashboard/costing",          business: "manufacturing", businessTypes: ["manufacturing"], businessLabel: "Costing", section: "Operations", description: "Work out job cost from your own formulas and save it as a sheet." },
  { id: "COSTING_FORMULAS", label: "Formulas", route: "/dashboard/costing/formulas", business: "manufacturing", businessTypes: ["manufacturing"], businessLabel: "Costing", section: "Operations", description: "Write and version the costing formulas your trade uses." },

  // ── AI Intelligence tools (sub-tab level; routes are virtual — won't trigger layout redirects) ──
  { id: "AI_OVERVIEW",        label: "Business Health Score",   route: "/dashboard/ai?tab=overview",        business: "trading", businessLabel: "AI Intelligence", section: "Core",      description: "Real-time score 0–100 based on revenue, profit, cash, and receivables." },
  { id: "AI_CHAT",            label: "Ask AI Anything",         route: "/dashboard/ai?tab=chat",            business: "trading", businessLabel: "AI Intelligence", section: "Core",      description: "Chat with your financial data in plain English. Get instant answers." },
  { id: "AI_INSIGHTS",        label: "AI Insights",             route: "/dashboard/ai?tab=insights",        business: "trading", businessLabel: "AI Intelligence", section: "Core",      description: "Deep analytical insights into your financial performance." },
  { id: "AI_ALERTS",          label: "Smart Alerts",            route: "/dashboard/ai?tab=alerts",          business: "trading", businessLabel: "AI Intelligence", section: "Core",      description: "Auto-detect overdue invoices, cash risks, expense spikes, revenue drops." },
  { id: "AI_FORECAST",        label: "30/60/90-Day Forecast",   route: "/dashboard/ai?tab=forecast",        business: "trading", businessLabel: "AI Intelligence", section: "Reports",   description: "AI predicts your next 3 months of revenue, expenses, and cashflow." },
  { id: "AI_TAX",             label: "Tax Estimate",            route: "/dashboard/ai?tab=tax",             business: "trading", businessLabel: "AI Intelligence", section: "Reports",   description: "Get AI-powered tax estimates based on your current financials." },
  { id: "AI_REPORT",          label: "Monthly Report",          route: "/dashboard/ai?tab=report",          business: "trading", businessLabel: "AI Intelligence", section: "Reports",   description: "AI-generated monthly performance report with insights." },
  { id: "AI_RATIOS",          label: "Financial Ratios",        route: "/dashboard/ai?tab=ratios",          business: "trading", businessLabel: "AI Intelligence", section: "Reports",   description: "Key financial ratios computed and benchmarked automatically." },
  { id: "AI_BUDGET",          label: "Budget & Variance",       route: "/dashboard/ai?tab=budget",          business: "trading", businessLabel: "AI Intelligence", section: "Reports",   description: "Track budget vs actual and get AI-powered variance analysis." },
  { id: "AI_RECOMMENDATIONS", label: "AI Recommendations",      route: "/dashboard/ai?tab=recommendations", business: "trading", businessLabel: "AI Intelligence", section: "Operations", description: "Get prioritized action items to improve business performance." },
  { id: "AI_REMINDERS",       label: "Invoice Reminders",       route: "/dashboard/ai?tab=reminders",       business: "trading", businessLabel: "AI Intelligence", section: "Operations", description: "Auto-detect and send payment reminders for overdue invoices." },
  { id: "AI_INVOICE_GEN",     label: "Quick Invoice",           route: "/dashboard/ai?tab=invoice-gen",     business: "trading", businessLabel: "AI Intelligence", section: "Operations", description: "Generate invoices from natural language descriptions." },
  { id: "AI_SCAN",            label: "Scan Receipt",            route: "/dashboard/ai?tab=scan",            business: "trading", businessLabel: "AI Intelligence", section: "Operations", description: "Scan receipts and invoices to auto-create expense entries." },
  { id: "AI_RECONCILIATION",  label: "AI Reconciliation",       route: "/dashboard/ai?tab=reconciliation",  business: "trading", businessLabel: "AI Intelligence", section: "Operations", description: "AI-powered bank reconciliation matching and verification." },
  { id: "AI_MARKET",          label: "Market Intelligence",     route: "/dashboard/ai?tab=market",          business: "trading", businessLabel: "AI Intelligence", section: "Growth",    description: "Discover what products to add and what trends are hitting your industry." },
  { id: "AI_ADVISOR",         label: "Business Advisor",        route: "/dashboard/ai?tab=advisor",         business: "trading", businessLabel: "AI Intelligence", section: "Growth",    description: "Get a personalized growth plan, cross-sell ideas, and risk warnings." },
  { id: "AI_INV_FORECAST",    label: "Stock Forecast",          route: "/dashboard/ai?tab=inv-forecast",    business: "trading", businessLabel: "AI Intelligence", section: "Inventory", description: "Predict inventory needs and reorder points with AI." },
  { id: "AI_CASHFLOW_OPT",    label: "Cash Optimizer",          route: "/dashboard/ai?tab=cashflow-opt",    business: "trading", businessLabel: "AI Intelligence", section: "Inventory", description: "Optimize cash flow with AI-driven payment scheduling." },
  { id: "AI_SUPPLIER_INTEL",  label: "Supplier Intel",          route: "/dashboard/ai?tab=supplier-intel",  business: "trading", businessLabel: "AI Intelligence", section: "Inventory", description: "Analyze supplier performance and negotiate better terms." },
  { id: "AI_CHURN",           label: "Churn Prediction",        route: "/dashboard/ai?tab=churn",           business: "trading", businessLabel: "AI Intelligence", section: "Analytics", description: "Identify customers at risk of churning before they leave." },
  { id: "AI_CUSTOMER_PROFIT", label: "Customer Profitability",  route: "/dashboard/ai?tab=customer-profit", business: "trading", businessLabel: "AI Intelligence", section: "Analytics", description: "Analyze profitability by customer segment and individual." },
  { id: "AI_GL_SUGGEST",      label: "GL Auto-Code",            route: "/dashboard/ai?tab=gl-suggest",      business: "trading", businessLabel: "AI Intelligence", section: "Analytics", description: "Automatically suggest general ledger codes for transactions." },
  { id: "AI_EXPENSE_CAT",     label: "Expense Categories",      route: "/dashboard/ai?tab=expense-cat",     business: "trading", businessLabel: "AI Intelligence", section: "Analytics", description: "AI-powered expense categorization for better tracking." },
  { id: "AI_DUPLICATE",       label: "Duplicate Detection",     route: "/dashboard/ai?tab=duplicate",       business: "trading", businessLabel: "AI Intelligence", section: "Analytics", description: "Find and flag duplicate transactions and invoices." },
];


/**
 * Cross-business pages — the ones every business type has.
 *
 * These were the gap that made "Pages & Modules controls the dashboard" untrue:
 * the registry only knew industry pages (salon, gym, pharmacy…), so CRM, HR,
 * invoicing, the report groups and settings had no entry here at all and could
 * only ever be gated by a permission. With them listed, an admin can assign
 * every sidebar page to a plan from one screen, and NavLink hides anything the
 * plan does not include without needing a per-link check.
 */
export const CORE_DASHBOARD_FEATURES: DashboardFeatureDefinition[] = [
  // ── Industry sub-pages that had a sidebar link but no def, so nothing could
  //    assign them to a plan. Not `core` — they stay scoped to their trade. ──
  { id: "RETAIL_SALES_HISTORY", label: "Sales History", route: "/dashboard/retail/sales-history", section: "Point of Sale", business: "retail", businessLabel: "Retail / Multi-Store", businessTypes: ["retail"] },
  { id: "RETAIL_CATEGORIES", label: "Categories", route: "/dashboard/retail/categories", section: "Inventory", business: "retail", businessLabel: "Retail / Multi-Store", businessTypes: ["retail"] },
  { id: "RETAIL_STOCK_RECEIPTS", label: "Stock Receipts", route: "/dashboard/retail/stock-receipts", section: "Inventory", business: "retail", businessLabel: "Retail / Multi-Store", businessTypes: ["retail"] },
  { id: "RENTAL_BOOKINGS_ALT", label: "Rental Bookings", route: "/dashboard/rental/bookings", section: "Operations", business: "rentals", businessLabel: "Rental Business", businessTypes: ["equipment_rental", "property_rental", "generator_rental", "car_rental"] },
  { id: "RENTAL_AGREEMENTS_ALT", label: "Rental Agreements", route: "/dashboard/rental/agreements", section: "Operations", business: "rentals", businessLabel: "Rental Business", businessTypes: ["equipment_rental", "property_rental", "generator_rental", "car_rental"] },
  { id: "PRINTING_ORDERS", label: "Print Orders", route: "/dashboard/printing/orders", section: "Production", business: "media", businessLabel: "Printing Press", businessTypes: ["printing_press"] },
  { id: "PRINTING_PAPER_STOCK", label: "Paper Stock", route: "/dashboard/printing/paper-stock", section: "Production", business: "media", businessLabel: "Printing Press", businessTypes: ["printing_press"] },
  { id: "PRINTING_DELIVERY", label: "Print Delivery", route: "/dashboard/printing/delivery", section: "Production", business: "media", businessLabel: "Printing Press", businessTypes: ["printing_press"] },

  // ── Sales & Purchase ──
  { id: "CORE_INVOICES", label: "All Invoices", route: "/dashboard/invoices", section: "Sales & Purchase", core: true, permKey: "VIEW_INVENTORY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PURCHASE_ORDER", label: "Purchase Order", route: "/dashboard/purchase-order", section: "Sales & Purchase", core: true, permKey: "CREATE_PURCHASE_ORDER", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_GRN", label: "GRN (Goods Receipt)", route: "/dashboard/grn", section: "Sales & Purchase", core: true, permKey: "VIEW_INVENTORY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PURCHASE_INVOICE", label: "Purchase Invoice", route: "/dashboard/purchase-invoice", section: "Sales & Purchase", core: true, permKey: "CREATE_PURCHASE_INVOICE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PURCHASE_RETURN", label: "Purchase Return", route: "/dashboard/purchase-return", section: "Sales & Purchase", core: true, permKey: "CREATE_PURCHASE_INVOICE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_QUOTATION", label: "Quotation", route: "/dashboard/quotation", section: "Sales & Purchase", core: true, permKey: "CREATE_QUOTATION", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SALES_INVOICE", label: "Sales Invoice", route: "/dashboard/sales-invoice", section: "Sales & Purchase", core: true, permKey: "CREATE_SALES_INVOICE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SALE_RETURN", label: "Sale Return", route: "/dashboard/sale-return", section: "Sales & Purchase", core: true, permKey: "CREATE_SALE_RETURN", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_DELIVERY_CHALLAN", label: "Delivery Challan", route: "/dashboard/delivery-challan", section: "Sales & Purchase", core: true, permKey: "CREATE_DELIVERY_CHALLAN", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_OUTWARD", label: "Outward / Dispatch", route: "/dashboard/outward", section: "Sales & Purchase", core: true, permKey: "CREATE_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_LANDED_COST", label: "Landed Cost", route: "/dashboard/landed-cost", section: "Sales & Purchase", core: true, permKey: "CREATE_PURCHASE_INVOICE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PAYMENT_RECEIPTS", label: "Payment Receipts", route: "/dashboard/payment-receipts", section: "Sales & Purchase", core: true, permKey: "PAYMENT_RECEIPTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PROMOTIONS", label: "Promotions", route: "/dashboard/promotions", section: "Sales & Purchase", core: true, permKey: "MANAGE_PROMOTIONS", business: "service", businessLabel: "Core (all businesses)" },
  // ── Inventory ──
  { id: "CORE_INVENTORY", label: "Inventory Overview", route: "/dashboard/inventory", section: "Inventory", core: true, permKey: "VIEW_INVENTORY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ITEMS_NEW", label: "Inventory Items", route: "/dashboard/items-new", section: "Inventory", core: true, permKey: "CREATE_ITEMS", business: "service", businessLabel: "Core (all businesses)" },
  // Warehouses, Warehouse Transfers and Price Lists used to be industry defs
  // (WHOLESALE_WAREHOUSES / TRADING_WAREHOUSE_TRANSFERS / WHOLESALE_PRICE_LISTS)
  // scoped to wholesale + trading + distribution, while the sidebar links all
  // three from the shared Inventory group for every trade. That mismatch cost
  // twice: /admin/plans showed the Inventory group with 6 pages instead of 9 for
  // every other business type, so the three could not be assigned to a plan at
  // all; and the industry guard in the dashboard layout bounced anyone whose
  // trade was not on that list straight back to /dashboard the moment they
  // clicked the link their own sidebar had just offered.
  //
  // They are core pages — a warehouse is a warehouse whatever you sell — so the
  // gate is the permission (MULTI_BRANCH / MANAGE_PRICE_LISTS), same as
  // CORE_BRANCHES. The ids keep their old prefixes on purpose: they are already
  // saved in live plan and per-company page configs, and renaming them would
  // silently switch the pages off for every company that has them ticked.
  { id: "WHOLESALE_WAREHOUSES", label: "Warehouses", route: "/dashboard/warehouses", section: "Inventory", core: true, permKey: "MULTI_BRANCH", business: "service", businessLabel: "Core (all businesses)" },
  { id: "TRADING_WAREHOUSE_TRANSFERS", label: "Warehouse Transfers", route: "/dashboard/warehouse-transfers", section: "Inventory", core: true, permKey: "MULTI_BRANCH", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PRODUCT_VARIANTS", label: "Product Variants", route: "/dashboard/product-variants", section: "Inventory", core: true, permKey: "VIEW_CATALOG", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BATCH_TRACKING", label: "Batch & Serial", route: "/dashboard/batch-tracking", section: "Inventory", core: true, permKey: "VIEW_INVENTORY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "WHOLESALE_PRICE_LISTS", label: "Price Lists", route: "/dashboard/price-lists", section: "Inventory", core: true, permKey: "MANAGE_PRICE_LISTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_STOCK_RATE", label: "Stock Rates", route: "/dashboard/stock-rate", section: "Inventory", core: true, permKey: "CREATE_STOCK_RATE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BARCODE", label: "Barcode", route: "/dashboard/barcode", section: "Inventory", core: true, permKey: "MANAGE_BARCODE", business: "service", businessLabel: "Core (all businesses)" },
  // ── Banking & Payments ──
  { id: "CORE_BANK_RECONCILIATION", label: "Bank Reconciliation", route: "/dashboard/bank-reconciliation", section: "Banking & Payments", core: true, permKey: "BANK_RECONCILIATION", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_EXPENSE_VOUCHERS", label: "Expense Vouchers", route: "/dashboard/expense-vouchers", section: "Banking & Payments", core: true, permKey: "EXPENSE_VOUCHERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_TAX_CONFIGURATION", label: "Tax & GST", route: "/dashboard/tax-configuration", section: "Banking & Payments", core: true, permKey: "TAX_CONFIGURATION", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BULK_PAYMENTS", label: "Bulk Payments", route: "/dashboard/bulk-payments", section: "Banking & Payments", core: true, permKey: "BULK_PAYMENTS", business: "service", businessLabel: "Core (all businesses)" },
  // ── Accounting ──
  { id: "CORE_ACCOUNTS", label: "Chart of Accounts", route: "/dashboard/accounts", section: "Accounting", core: true, permKey: "CREATE_ACCOUNTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CPV", label: "CPV (Cash Payment)", route: "/dashboard/cpv", section: "Accounting", core: true, permKey: "CREATE_CPV", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CRV", label: "CRV (Cash Receipt)", route: "/dashboard/crv", section: "Accounting", core: true, permKey: "CREATE_CRV", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_JV", label: "Journal Voucher", route: "/dashboard/jv", section: "Accounting", core: true, permKey: "CREATE_JV", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CONTRA", label: "Contra Entry", route: "/dashboard/contra", section: "Accounting", core: true, permKey: "CREATE_CONTRA", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_OPENING_BALANCES", label: "Opening Balances", route: "/dashboard/opening-balances", section: "Accounting", core: true, permKey: "MANAGE_OPENING_BALANCES", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ADVANCE_PAYMENT", label: "Advance Payment", route: "/dashboard/advance-payment", section: "Accounting", core: true, permKey: "MANAGE_ADVANCE_PAYMENT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PETTY_CASH", label: "Petty Cash", route: "/dashboard/petty-cash", section: "Accounting", core: true, permKey: "MANAGE_PETTY_CASH", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_LOANS", label: "Loans", route: "/dashboard/loans", section: "Accounting", core: true, permKey: "MANAGE_LOANS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_RECURRING_TRANSACTIONS", label: "Recurring Transactions", route: "/dashboard/recurring-transactions", section: "Accounting", core: true, permKey: "MANAGE_RECURRING", business: "service", businessLabel: "Core (all businesses)" },
  // ── CRM ──
  { id: "CORE_CRM", label: "CRM Overview", route: "/dashboard/crm", section: "CRM", core: true, permKey: "VIEW_CRM", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CRM_CONTACTS", label: "Contacts", route: "/dashboard/crm/contacts", section: "CRM", core: true, permKey: "VIEW_CRM", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CRM_OPPORTUNITIES", label: "Opportunities", route: "/dashboard/crm/opportunities", section: "CRM", core: true, permKey: "VIEW_CRM", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CRM_INTERACTIONS", label: "Interactions", route: "/dashboard/crm/interactions", section: "CRM", core: true, permKey: "VIEW_CRM", business: "service", businessLabel: "Core (all businesses)" },
  // ── HR & Payroll ──
  { id: "CORE_HR_PAYROLL", label: "HR Overview", route: "/dashboard/hr-payroll", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_EMPLOYEES", label: "Employees", route: "/dashboard/employees", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ATTENDANCE", label: "Attendance", route: "/dashboard/attendance", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ATTENDANCE_DEVICES", label: "Attendance Devices", route: "/dashboard/attendance/devices", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)", description: "Fingerprint / face machines, employee enrollment mapping and the raw punch log" },
  { id: "CORE_PAYROLL", label: "Payroll", route: "/dashboard/payroll", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ADVANCE_SALARY", label: "Advance Salary", route: "/dashboard/advance-salary", section: "HR & Payroll", core: true, permKey: "VIEW_HR_PAYROLL", business: "service", businessLabel: "Core (all businesses)" },
  // ── Financial Reports ──
  { id: "CORE_REPORTS", label: "All Reports", route: "/dashboard/reports", section: "Financial Reports", core: true, permKey: "VIEW_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_TRIAL_BALANCE", label: "Trial Balance", route: "/dashboard/reports/trial-balance", section: "Financial Reports", core: true, permKey: "VIEW_TRIAL_BALANCE_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_PROFIT_LOSS", label: "Profit & Loss", route: "/dashboard/reports/profit-loss", section: "Financial Reports", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_BALANCE_SHEET", label: "Balance Sheet", route: "/dashboard/reports/balance-sheet", section: "Financial Reports", core: true, permKey: "VIEW_BALANCE_SHEET_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_LEDGER", label: "Ledger", route: "/dashboard/reports/ledger", section: "Financial Reports", core: true, permKey: "VIEW_LEDGER_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_CASH_FLOW", label: "Cash Flow", route: "/dashboard/reports/cash-flow", section: "Financial Reports", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_TAX_SUMMARY", label: "Tax Summary", route: "/dashboard/reports/tax-summary", section: "Financial Reports", core: true, permKey: "VIEW_FINANCIAL_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CUSTOMER_STATEMENT", label: "Customer Statement", route: "/dashboard/customer-statement", section: "Financial Reports", core: true, permKey: "VIEW_FINANCIAL_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SUPPLIER_STATEMENT", label: "Supplier Statement", route: "/dashboard/supplier-statement", section: "Financial Reports", core: true, permKey: "VIEW_FINANCIAL_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  // ── Advanced Financial ──
  { id: "CORE_REPORTS_BUDGET_VS_ACTUAL", label: "Budget vs Actual", route: "/dashboard/reports/budget-vs-actual", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_COGS", label: "COGS Report", route: "/dashboard/reports/cogs", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_GROSS_MARGIN", label: "Gross Margin", route: "/dashboard/reports/gross-margin", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_EXPENSE_BREAKDOWN", label: "Expense Breakdown", route: "/dashboard/reports/expense-breakdown", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_BREAKEVEN", label: "Breakeven Analysis", route: "/dashboard/reports/breakeven", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_TAX_FORECAST", label: "Tax Forecast", route: "/dashboard/reports/tax-forecast", section: "Advanced Financial", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_AUDIT_EXCEPTION", label: "Audit & Exceptions", route: "/dashboard/reports/audit-exception", section: "Advanced Financial", core: true, permKey: "VIEW_AUDIT_LOG", business: "service", businessLabel: "Core (all businesses)" },
  // ── Inventory Intelligence ──
  { id: "CORE_REPORTS_STOCK", label: "Stock Report", route: "/dashboard/reports/stock", section: "Inventory Intelligence", core: true, permKey: "VIEW_STOCK_SUMMARY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_LEDGER", label: "Stock Ledger", route: "/dashboard/reports/stock-ledger", section: "Inventory Intelligence", core: true, permKey: "VIEW_STOCK_LEDGER", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_MOVEMENT", label: "Stock Movement", route: "/dashboard/reports/stock/movement", section: "Inventory Intelligence", core: true, permKey: "VIEW_INVENTORY_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_INVENTORY_STOCK_SUMMARY", label: "Stock Summary", route: "/dashboard/reports/inventory/stock-summary", section: "Inventory Intelligence", core: true, permKey: "VIEW_STOCK_SUMMARY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_INVENTORY_INWARD", label: "Inward Report", route: "/dashboard/reports/inventory/inward", section: "Inventory Intelligence", core: true, permKey: "VIEW_INWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_OUTWARD", label: "Outward Report", route: "/dashboard/reports/outward", section: "Inventory Intelligence", core: true, permKey: "VIEW_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_DEAD", label: "Dead Stock", route: "/dashboard/reports/stock/dead", section: "Inventory Intelligence", core: true, permKey: "VIEW_INVENTORY_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_TURNOVER", label: "Stock Turnover", route: "/dashboard/reports/stock/turnover", section: "Inventory Intelligence", core: true, permKey: "VIEW_INVENTORY_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_EXPIRY", label: "Expiry Tracking", route: "/dashboard/reports/stock/expiry", section: "Inventory Intelligence", core: true, permKey: "VIEW_INVENTORY_REPORTS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_VALUATION", label: "Stock Valuation", route: "/dashboard/reports/stock/valuation", section: "Inventory Intelligence", core: true, permKey: "VIEW_STOCK_LEDGER", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_WAREHOUSE", label: "Warehouse Stock", route: "/dashboard/reports/stock/warehouse", section: "Inventory Intelligence", core: true, permKey: "VIEW_LOCATION", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_STOCK_LOW", label: "Reorder Alerts", route: "/dashboard/reports/stock/low", section: "Inventory Intelligence", core: true, permKey: "VIEW_LOW_STOCK", business: "service", businessLabel: "Core (all businesses)" },
  // ── Sales Analytics ──
  { id: "CORE_REPORTS_SALES", label: "Sales Report", route: "/dashboard/reports/sales", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_CUSTOMER_PROFITABILITY", label: "Customer Profitability", route: "/dashboard/reports/customer-profitability", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_SALESMAN_PERFORMANCE", label: "Salesman Performance", route: "/dashboard/reports/salesman-performance", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_DISCOUNT_ANALYSIS", label: "Discount Analysis", route: "/dashboard/reports/discount-analysis", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_SALES_REGION", label: "Sales by Region", route: "/dashboard/reports/sales-region", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_PRODUCT_PROFITABILITY", label: "Product Profitability", route: "/dashboard/reports/product-profitability", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_RETURNS_ANALYSIS", label: "Returns Analysis", route: "/dashboard/reports/returns-analysis", section: "Sales Analytics", core: true, permKey: "VIEW_SALES_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  // ── Receivables & Payables ──
  { id: "CORE_REPORTS_AGEING", label: "Ageing Report", route: "/dashboard/reports/ageing", section: "Receivables & Payables", core: true, permKey: "VIEW_AGEING_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_PAYMENT_HISTORY", label: "Payment History", route: "/dashboard/reports/payment-history", section: "Receivables & Payables", core: true, permKey: "VIEW_AGEING_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_PAYMENT_FOLLOWUP", label: "Payment Follow-up", route: "/dashboard/payment-followup", section: "Receivables & Payables", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_BAD_DEBTS", label: "Bad Debts", route: "/dashboard/reports/bad-debts", section: "Receivables & Payables", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_CREDIT_ANALYSIS", label: "Credit Analysis", route: "/dashboard/reports/credit-analysis", section: "Receivables & Payables", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  // ── Operations Reports ──
  { id: "CORE_REPORTS_ORDER_FULFILLMENT", label: "Order Fulfillment", route: "/dashboard/reports/order-fulfillment", section: "Operations Reports", core: true, permKey: "VIEW_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_DELIVERY_PERFORMANCE", label: "Delivery Performance", route: "/dashboard/reports/delivery-performance", section: "Operations Reports", core: true, permKey: "VIEW_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_PO_TRACKING", label: "PO Tracking", route: "/dashboard/reports/po-tracking", section: "Operations Reports", core: true, permKey: "VIEW_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_SUPPLIER_PERFORMANCE", label: "Supplier Performance", route: "/dashboard/reports/supplier-performance", section: "Operations Reports", core: true, permKey: "VIEW_OUTWARD", business: "service", businessLabel: "Core (all businesses)" },
  // ── Strategic Reports ──
  { id: "CORE_REPORTS_FORECAST", label: "Sales Forecast", route: "/dashboard/reports/forecast", section: "Strategic Reports", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_REPORTS_SCENARIO", label: "Scenario Planning", route: "/dashboard/reports/scenario", section: "Strategic Reports", core: true, permKey: "VIEW_PROFIT_LOSS_REPORT", business: "service", businessLabel: "Core (all businesses)" },
  // ── AI & Automation ──
  { id: "CORE_AI", label: "AI Intelligence", route: "/dashboard/ai", section: "AI & Automation", core: true, permKey: "AI_ASSISTANT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_AI_ASSISTANT", label: "AI Assistant", route: "/dashboard/ai-assistant", section: "AI & Automation", core: true, permKey: "AI_ASSISTANT", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_OPERATOR", label: "Business Operator", route: "/dashboard/operator", section: "AI & Automation", core: true, permKey: "AI_BUSINESS_OPERATOR", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_AUTOMATION", label: "Business Automation", route: "/dashboard/automation", section: "AI & Automation", core: true, permKey: "AI_BUSINESS_OPERATOR", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_OWNER_DASHBOARD", label: "Owner Dashboard", route: "/dashboard/owner-dashboard", section: "AI & Automation", core: true, permKey: "VIEW_DASHBOARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BUSINESS_GUIDE", label: "Business Guide", route: "/dashboard/business-guide", section: "AI & Automation", core: true, permKey: "VIEW_DASHBOARD", business: "service", businessLabel: "Core (all businesses)" },
  // ── Admin ──
  { id: "CORE_COMPANY_PROFILE", label: "Company Profile", route: "/dashboard/company-profile", section: "Admin", core: true, permKey: "MANAGE_USERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ADMIN_CONTROL", label: "Admin Control Center", route: "/dashboard/admin-control", section: "Admin", core: true, permKey: "MANAGE_USERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BUSINESS_FEATURES", label: "Business Features", route: "/dashboard/business-features", section: "Admin", core: true, permKey: "MANAGE_USERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_NOTIFICATIONS_CONFIG", label: "Notification Settings", route: "/dashboard/notifications-config", section: "Admin", core: true, permKey: "MANAGE_USERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SHORTCUTS", label: "Keyboard Shortcuts", route: "/dashboard/shortcuts", section: "Admin", core: true, permKey: "VIEW_DASHBOARD", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_USERS", label: "Team", route: "/dashboard/users", section: "Admin", core: true, permKey: "MANAGE_USERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_USERS_LOGS", label: "System Logs", route: "/dashboard/users/logs", section: "Admin", core: true, permKey: "VIEW_LOGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_AUDIT_TRAIL", label: "Audit Trail", route: "/dashboard/audit-trail", section: "Admin", core: true, permKey: "VIEW_AUDIT_LOG", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_FIXED_ASSETS", label: "Fixed Assets", route: "/dashboard/fixed-assets", section: "Admin", core: true, permKey: "VIEW_FIXED_ASSETS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_APPROVALS", label: "Approvals", route: "/dashboard/approvals", section: "Admin", core: true, permKey: "MANAGE_APPROVALS", business: "service", businessLabel: "Core (all businesses)" },
  // ── Settings ──
  { id: "CORE_BRANCHES", label: "Branches", route: "/dashboard/branches", section: "Settings", core: true, permKey: "MULTI_BRANCH", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_CURRENCIES", label: "Currencies", route: "/dashboard/currencies", section: "Settings", core: true, permKey: "MULTI_CURRENCY", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_COST_CENTERS", label: "Cost Centers", route: "/dashboard/cost-centers", section: "Settings", core: true, permKey: "MANAGE_COST_CENTERS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_FINANCIAL_YEAR", label: "Financial Year", route: "/dashboard/financial-year", section: "Settings", core: true, permKey: "FINANCIAL_YEAR", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BUDGET", label: "Budget Planning", route: "/dashboard/budget", section: "Settings", core: true, permKey: "BUDGET_PLANNING", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BACKUP_RESTORE", label: "Backup & Restore", route: "/dashboard/backup-restore", section: "Settings", core: true, permKey: "BACKUP_RESTORE", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_ACCOUNT_SETTINGS", label: "Account Settings", route: "/dashboard/account-settings", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_BILLING", label: "My Billing", route: "/dashboard/billing", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SETTINGS_APPEARANCE", label: "Appearance", route: "/dashboard/settings/appearance", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SETTINGS_HOLIDAYS", label: "Public Holidays", route: "/dashboard/settings/holidays", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_SECURITY_ACCESS", label: "Security & Access", route: "/dashboard/security-access", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_INTEGRATIONS", label: "Integrations", route: "/dashboard/integrations", section: "Settings", core: true, permKey: "API_ACCESS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_AFFILIATE", label: "Affiliate Program", route: "/dashboard/affiliate", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  { id: "CORE_NOTIFICATIONS", label: "Notifications", route: "/dashboard/notifications", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  // Reachable only from the user dropdown before, which the mobile topbar does
  // not render — so on a phone there was no way in at all. It has a sidebar
  // entry now, and a registry row so Plans → Pages & Modules can assign it.
  { id: "CORE_FEEDBACK", label: "Feedback & Reviews", route: "/dashboard/feedback", section: "Settings", core: true, permKey: "VIEW_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },
  // The page, its API and the encrypted vault behind it already existed, but it
  // was never listed here — so it never appeared in /admin/permissions and could
  // not be assigned to a plan like every other page. Without it a tenant cannot
  // set their own SMTP, and their invoices go out from the FinovaOS address
  // instead of their own.
  { id: "CORE_EMAIL_SETTINGS", label: "Email Settings", route: "/dashboard/email-settings", section: "Settings", core: true, permKey: "EMAIL_SETTINGS", business: "service", businessLabel: "Core (all businesses)" },

  // ── Import Data ──
  // Migration off an old system is the first thing a new customer does and the
  // thing every sale turns on: a factory ten years into Oracle will not move
  // until it can see its own chart of accounts land intact. The pages existed
  // and the wizard worked, but none of them was registered here and none was in
  // the sidebar — the only way in was one link buried on the Integrations page,
  // so in practice they did not exist.
  //
  // Deliberately no permKey. Every other core page inherits the permission that
  // matched what /pricing sells, which would put migration behind a plan tier;
  // a customer cannot evaluate the product until their data is inside it, so
  // these ship on for Starter, Pro, Enterprise and Custom alike. An admin can
  // still switch any of them off per plan in /admin/permissions, which is the
  // whole point of them being here rather than hard-coded into the sidebar.
  { id: "CORE_IMPORT_HUB", label: "Import Data", route: "/dashboard/import", section: "Import Data", core: true, business: "service", businessLabel: "Core (all businesses)", description: "Migration home — every import step in the order it has to be done." },
  { id: "CORE_IMPORT_WIZARD", label: "Import Wizard", route: "/dashboard/import-wizard", section: "Import Data", core: true, business: "service", businessLabel: "Core (all businesses)", description: "Upload a CSV from Oracle, QuickBooks, Xero, Sage or Tally, preview how it was read, then commit." },
  { id: "CORE_IMPORT_ORACLE_GUIDE", label: "Migration Guide", route: "/dashboard/import/oracle-guide", section: "Import Data", core: true, business: "service", businessLabel: "Core (all businesses)", description: "The cutover plan, and the SQL to pull each file out of Oracle." },
];

// Core pages join the same list the sidebar, the admin grid and the route
// guard all read, so there is still exactly one registry.
DASHBOARD_FEATURE_DEFS.push(...CORE_DASHBOARD_FEATURES);

export const DASHBOARD_FEATURE_IDS = DASHBOARD_FEATURE_DEFS.map((feature) => feature.id);

export const AI_TOOL_IDS = [
  "AI_OVERVIEW", "AI_CHAT", "AI_INSIGHTS", "AI_ALERTS",
  "AI_FORECAST", "AI_TAX", "AI_REPORT", "AI_RATIOS", "AI_BUDGET",
  "AI_RECOMMENDATIONS", "AI_REMINDERS", "AI_INVOICE_GEN", "AI_SCAN", "AI_RECONCILIATION",
  "AI_MARKET", "AI_ADVISOR",
  "AI_INV_FORECAST", "AI_CASHFLOW_OPT", "AI_SUPPLIER_INTEL",
  "AI_CHURN", "AI_CUSTOMER_PROFIT", "AI_GL_SUGGEST", "AI_EXPENSE_CAT", "AI_DUPLICATE",
] as const;

export type AiToolId = (typeof AI_TOOL_IDS)[number];

export const AI_TOOL_META: Record<AiToolId, { icon: string; label: string; desc: string; tab: string }> = {
  AI_OVERVIEW:        { icon: "⚡",  label: "Business Health Score",  desc: "Real-time score 0–100 based on revenue, profit, cash, and receivables.",           tab: "overview" },
  AI_CHAT:            { icon: "💬",  label: "Ask AI Anything",         desc: "Chat with your financial data in plain English. Get instant answers.",             tab: "chat" },
  AI_INSIGHTS:        { icon: "✦",   label: "AI Insights",             desc: "Deep analytical insights into your financial performance.",                         tab: "insights" },
  AI_ALERTS:          { icon: "🔔",  label: "Smart Alerts",            desc: "Auto-detect overdue invoices, cash risks, expense spikes, revenue drops.",          tab: "alerts" },
  AI_FORECAST:        { icon: "📈",  label: "30/60/90-Day Forecast",   desc: "AI predicts your next 3 months of revenue, expenses, and cashflow.",               tab: "forecast" },
  AI_TAX:             { icon: "🧾",  label: "Tax Estimate",            desc: "Get AI-powered tax estimates based on your current financials.",                    tab: "tax" },
  AI_REPORT:          { icon: "📄",  label: "Monthly Report",          desc: "AI-generated monthly performance report with insights.",                            tab: "report" },
  AI_RATIOS:          { icon: "⚖️",  label: "Financial Ratios",        desc: "Key financial ratios computed and benchmarked automatically.",                      tab: "ratios" },
  AI_BUDGET:          { icon: "📊",  label: "Budget & Variance",       desc: "Track budget vs actual and get AI-powered variance analysis.",                      tab: "budget" },
  AI_RECOMMENDATIONS: { icon: "🎯",  label: "AI Recommendations",      desc: "Get prioritized action items to improve business performance.",                     tab: "recommendations" },
  AI_REMINDERS:       { icon: "📮",  label: "Invoice Reminders",       desc: "Auto-detect and send payment reminders for overdue invoices.",                     tab: "reminders" },
  AI_INVOICE_GEN:     { icon: "✍️",  label: "Quick Invoice",           desc: "Generate invoices from natural language descriptions.",                             tab: "invoice-gen" },
  AI_SCAN:            { icon: "📷",  label: "Scan Receipt",            desc: "Scan receipts and invoices to auto-create expense entries.",                        tab: "scan" },
  AI_RECONCILIATION:  { icon: "🔗",  label: "AI Reconciliation",       desc: "AI-powered bank reconciliation matching and verification.",                         tab: "reconciliation" },
  AI_MARKET:          { icon: "🌐",  label: "Market Intelligence",     desc: "Discover what products to add and what trends are hitting your industry.",          tab: "market" },
  AI_ADVISOR:         { icon: "🧭",  label: "Business Advisor",        desc: "Get a personalized growth plan, cross-sell ideas, and risk warnings.",              tab: "advisor" },
  AI_INV_FORECAST:    { icon: "📦",  label: "Stock Forecast",          desc: "Predict inventory needs and reorder points with AI.",                               tab: "inv-forecast" },
  AI_CASHFLOW_OPT:    { icon: "💵",  label: "Cash Optimizer",          desc: "Optimize cash flow with AI-driven payment scheduling.",                             tab: "cashflow-opt" },
  AI_SUPPLIER_INTEL:  { icon: "🤝",  label: "Supplier Intel",          desc: "Analyze supplier performance and negotiate better terms.",                          tab: "supplier-intel" },
  AI_CHURN:           { icon: "👥",  label: "Churn Prediction",        desc: "Identify customers at risk of churning before they leave.",                         tab: "churn" },
  AI_CUSTOMER_PROFIT: { icon: "👤",  label: "Customer Profitability",  desc: "Analyze profitability by customer segment and individual.",                         tab: "customer-profit" },
  AI_GL_SUGGEST:      { icon: "🏷️",  label: "GL Auto-Code",            desc: "Automatically suggest general ledger codes for transactions.",                      tab: "gl-suggest" },
  AI_EXPENSE_CAT:     { icon: "📂",  label: "Expense Categories",      desc: "AI-powered expense categorization for better tracking.",                            tab: "expense-cat" },
  AI_DUPLICATE:       { icon: "🔍",  label: "Duplicate Detection",     desc: "Find and flag duplicate transactions and invoices.",                                tab: "duplicate" },
};

/**
 * Starting point for Plans → Pages & Modules.
 *
 * Industry pages stay open to every plan — which pages a salon or a pharmacy
 * needs is a business-type question, not a pricing one. Core pages are seeded
 * from the plan ladder in PLAN_DEFAULT_PERMISSIONS via each def's `permKey`, so
 * an untouched install gates the dashboard exactly the way /pricing describes
 * it. Handing every core page to every plan here would have been the old leak
 * back again, one layer down.
 */
export function createDefaultDashboardFeatureFlags(): Record<DashboardFeaturePlanCode, string[]> {
  const forPlan = (planCode: "STARTER" | "PRO" | "ENTERPRISE"): string[] => {
    const granted = new Set<string>(PLAN_DEFAULT_PERMISSIONS[planCode] || []);
    return DASHBOARD_FEATURE_DEFS
      .filter((f) => !f.core || !f.permKey || granted.has(f.permKey))
      .map((f) => f.id);
  };
  return {
    STARTER: forPlan("STARTER"),
    PRO: forPlan("PRO"),
    ENTERPRISE: forPlan("ENTERPRISE"),
    // Custom packages are built module by module at checkout, so the grid
    // starts fully open and the purchased modules narrow it.
    CUSTOM: [...DASHBOARD_FEATURE_IDS],
  };
}

/**
 * Features that are not industry-specific — every business type gets them.
 * The AI tools live under `business: "trading"` for historical reasons, but a
 * pharmacy gets the same 24 AI tabs a trading company does.
 */
export const CROSS_BUSINESS_FEATURE_LABELS = new Set(["AI Intelligence", "Core (all businesses)"]);

/**
 * Every dashboard page a given business type can see, whether or not a plan
 * currently grants it. This is the list `/admin/permissions` renders so an
 * admin can assign each page to Starter / Pro / Enterprise.
 *
 * Mirrors the access check in `app/dashboard/layout.tsx` — a feature belongs to
 * a business type when its `businessTypes` includes it, falling back to the
 * broader `business` group when the def does not narrow it.
 */
export function dashboardFeaturesForBusinessType(businessType: string): DashboardFeatureDefinition[] {
  const target = String(businessType || "").trim();
  if (!target) return [];
  return DASHBOARD_FEATURE_DEFS.filter((feature) => {
    if (feature.core) return true;
    if (CROSS_BUSINESS_FEATURE_LABELS.has(feature.businessLabel)) return true;
    const allowed = feature.businessTypes?.length ? feature.businessTypes : [feature.business];
    return allowed.includes(target);
  });
}

/**
 * Pulls the saved plan-wide page grid out of one PLAN_CONFIG blob, or null when
 * that blob carries no page grid at all.
 *
 * The distinction matters: a config that never wrote `dashboardFeatureFlags` —
 * PKR_PLAN_CONFIG is exactly that, since the PKR tab of /admin/plans posts only
 * pricing and permissions — must not be read as "no pages configured", because
 * the callers then fall back to the wide-open defaults and the plan gate
 * disappears. An empty-in-every-plan grid is treated the same way: nothing was
 * ever assigned there, so it says nothing about page access.
 */
export function readSavedDashboardFeatureFlags(
  details?: string | null,
): Record<string, string[]> | null {
  if (!details) return null;
  try {
    const flags = JSON.parse(details)?.dashboardFeatureFlags;
    if (!flags || typeof flags !== "object") return null;
    const hasAny = Object.values(flags).some((list) => Array.isArray(list) && list.length > 0);
    return hasAny ? (flags as Record<string, string[]>) : null;
  } catch {
    return null;
  }
}

/**
 * Restores the pages a saved plan-wide grid predates.
 *
 * The grid inside PLAN_CONFIG is a whitelist, so a page it does not name is
 * indistinguishable from a page an admin unticked — except that the screen
 * which edited it is gone (its "Pages" tab became the per-business-type grid),
 * and the saved lists have not changed since April 2026. Everything added to
 * the registry since then — all 24 AI tools, costing sheets, the retail and
 * printing sub-pages, the 119 core pages — is missing from it, so reading it
 * as a plain whitelist switches off a third of the product for any company
 * whose business type has no entry in the live grid.
 *
 * The union of the four plan lists is what the config actually knows about.
 * Ids outside that vocabulary never had a switch, so they fall back to the
 * defaults for each plan; ids inside it keep whatever the admin assigned. This
 * generalises `healSavedFeatureList`, which did the same for the core pages
 * only.
 */
export function healSavedPlanFeatureFlags(
  saved: Record<string, string[]>,
): Record<string, string[]> {
  const known = new Set<string>();
  for (const list of Object.values(saved || {})) {
    if (Array.isArray(list)) for (const id of list) known.add(id);
  }
  // Nothing saved at all: the caller's own defaults are the right answer.
  if (known.size === 0) return saved;

  const unseen = DASHBOARD_FEATURE_IDS.filter((id) => !known.has(id));
  if (unseen.length === 0) return saved;

  const defaults = createDefaultDashboardFeatureFlags();
  const healed: Record<string, string[]> = {};
  for (const [plan, list] of Object.entries(saved)) {
    const upper = String(plan).toUpperCase();
    const planKey = (upper === "PRO" || upper === "ENTERPRISE" || upper === "CUSTOM" ? upper : "STARTER") as
      DashboardFeaturePlanCode;
    const byDefault = new Set(defaults[planKey] || []);
    healed[plan] = Array.from(
      new Set([...(Array.isArray(list) ? list : []), ...unseen.filter((id) => byDefault.has(id))]),
    );
  }
  return healed;
}

/**
 * The plan-wide page grid a company actually gets, healed and normalised.
 *
 * This is the list every business type falls back to when Pages & Modules holds
 * no override for it, so it is what the dashboard applies in that case — and
 * therefore what the admin grid must show for an unconfigured business type.
 * Both callers read it from here so the screen and the sidebar cannot drift.
 */
export function resolvePlanWideFeatureFlags(
  savedFlags: Record<string, string[]> = {},
): Record<DashboardFeaturePlanCode, string[]> {
  const defaults = createDefaultDashboardFeatureFlags();
  // healSavedPlanFeatureFlags restores every page the saved grid predates — it
  // is a whitelist, so a page added to the registry after the last save reads
  // as "not in your plan" and disappears from the product. healSavedFeatureList
  // then covers the core pages for each individual list.
  const saved = healSavedPlanFeatureFlags(savedFlags);
  const clean = (
    list: string[] | undefined,
    fallback: string[],
    plan: DashboardFeaturePlanCode,
  ) =>
    Array.isArray(list)
      ? healSavedFeatureList(list.filter((id) => DASHBOARD_FEATURE_IDS.includes(id)), plan)
      : fallback;
  const get = (k: string) => saved[k] || saved[k.toLowerCase()];
  return {
    STARTER:    clean(get("STARTER"),    defaults.STARTER,    "STARTER"),
    PRO:        clean(get("PRO"),        defaults.PRO,        "PRO"),
    ENTERPRISE: clean(get("ENTERPRISE"), defaults.ENTERPRISE, "ENTERPRISE"),
    CUSTOM:     clean(get("CUSTOM"),     defaults.CUSTOM,     "CUSTOM"),
  };
}

/**
 * Resolves the page list for one company: a per-business-type override set in
 * `/admin/permissions` wins, otherwise the plan-wide list from `/admin/plans`.
 *
 * Returning `null` means "no restriction configured" — callers treat that as
 * full access, which is what the sidebar already does for a null feature set.
 */
/**
 * Adds pages that reached the registry after this grid was last saved.
 *
 * The business-type grid is a whitelist, so a page added to the registry later
 * is simply absent from it and reads as "not in your plan" — it never appears
 * in the sidebar and its URL bounces back to /dashboard. The plan-wide path
 * has always been healed for this by `healSavedPlanFeatureFlags`; the
 * business-scoped path was not, so any company whose admin had ever saved a
 * per-business grid stopped receiving new pages entirely. `healSavedFeatureList`
 * did not cover it either: it returns early the moment it sees any CORE_ id,
 * which every post-2025 grid has.
 *
 * "Unseen" is judged across every plan of this business type, not just the one
 * being resolved. A page an admin deliberately unticked for Starter is still
 * listed under Pro, so it counts as seen and stays off for Starter — only a
 * page that appears in no plan at all is genuinely new and gets the default.
 */
function addUnseenRegistryFeatures(
  scoped: string[],
  byBusiness: Record<string, string[]> | undefined,
  planKey: DashboardFeaturePlanCode,
): string[] {
  const known = new Set<string>();
  for (const list of Object.values(byBusiness || {})) {
    if (Array.isArray(list)) for (const id of list) known.add(id);
  }
  if (known.size === 0) return scoped;

  const unseen = DASHBOARD_FEATURE_IDS.filter((id) => !known.has(id));
  if (unseen.length === 0) return scoped;

  const byDefault = new Set(createDefaultDashboardFeatureFlags()[planKey] || []);
  return Array.from(new Set([...scoped, ...unseen.filter((id) => byDefault.has(id))]));
}

export function resolveDashboardFeaturesForCompany(opts: {
  businessType: string;
  planCode: string;
  planFlags: Record<string, string[]>;
  businessFlags?: Record<string, Record<string, string[]>> | null;
  /**
   * The other audience's grid, consulted only when `businessFlags` says nothing
   * about this business type. A PKR company reads the PKR grid, but "no PKR
   * entry" used to mean no page gate at all — so a business type switched off
   * page by page in the world grid still showed every page to Pakistani
   * companies and to demo sandboxes, which are built as PK/PKR.
   */
  fallbackBusinessFlags?: Record<string, Record<string, string[]>> | null;
}): string[] | null {
  const plan = String(opts.planCode || "STARTER").toUpperCase();
  const planKey = (plan === "PRO" || plan === "ENTERPRISE" || plan === "CUSTOM" ? plan : "STARTER") as
    "STARTER" | "PRO" | "ENTERPRISE" | "CUSTOM";
  const byBusiness =
    opts.businessFlags?.[opts.businessType] ?? opts.fallbackBusinessFlags?.[opts.businessType];
  const scoped = byBusiness?.[plan] ?? byBusiness?.[plan.toLowerCase()];
  if (Array.isArray(scoped)) {
    // Constrain to pages the business type actually owns, so a stale saved id
    // cannot hand a pharmacy a trading-only page.
    const owned = new Set(dashboardFeaturesForBusinessType(opts.businessType).map((f) => f.id));
    const healed = addUnseenRegistryFeatures(scoped, byBusiness, planKey);
    return healSavedFeatureList(healed, planKey).filter((id) => owned.has(id));
  }
  const planList = opts.planFlags[plan] ?? opts.planFlags[plan.toLowerCase()] ?? null;
  return planList ? healSavedFeatureList(planList, planKey) : null;
}

const CORE_FEATURE_IDS = CORE_DASHBOARD_FEATURES.filter((f) => f.core).map((f) => f.id);

/**
 * Heals a page list that was saved before the core pages existed.
 *
 * The registry only ever held industry pages, so every Pages & Modules config
 * saved before that change lists nothing but industry ids. Once the 119 core
 * pages became the dashboard's plan gate, those saved lists blocked all of
 * them — CRM, invoicing, reports, settings — and the whole dashboard bounced
 * back to /dashboard.
 *
 * A config saved after the change cannot contain zero core ids unless an admin
 * deliberately unticked all 119, so "no core ids at all" is a reliable marker
 * for a stale list. When we see one, the plan's core defaults are merged in and
 * the admin's industry choices are left exactly as they were.
 */
export function healSavedFeatureList(
  saved: string[],
  planCode: "STARTER" | "PRO" | "ENTERPRISE" | "CUSTOM",
): string[] {
  if (saved.some((id) => id.startsWith("CORE_"))) return saved;
  const defaults = createDefaultDashboardFeatureFlags()[planCode] || [];
  // Membership, not the id prefix: three core pages (Warehouses, Warehouse
  // Transfers, Price Lists) kept their old WHOLESALE_/TRADING_ ids because those
  // ids are already saved in live configs, so a prefix test would skip them and
  // heal a stale list into one still missing them.
  const coreIds = new Set(CORE_FEATURE_IDS);
  const coreDefaults = defaults.filter((id) => coreIds.has(id));
  return Array.from(new Set([...saved, ...coreDefaults]));
}

/** True when a list predates the core pages and needs healing. */
export function isPreCoreFeatureList(saved: string[]): boolean {
  return CORE_FEATURE_IDS.length > 0 && !saved.some((id) => id.startsWith("CORE_"));
}

/**
 * The page definition that owns a route.
 *
 * Longest prefix wins, exactly as the ROUTE_GUARDS matcher in the dashboard
 * layout does. Taking the *first* prefix match instead let a parent swallow all
 * of its children — "/dashboard/reports" answered for its 40 sub-reports and
 * "/dashboard/costing" for /costing/formulas — so 248 sub-pages were gated on
 * their parent's id. The sidebar checks each child's own id, so a page an admin
 * had revoked in Pages & Modules lost its link but still opened by URL.
 */
export function findDashboardFeatureByRoute(pathname: string): DashboardFeatureDefinition | null {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  let best: DashboardFeatureDefinition | null = null;
  let bestLength = -1;
  for (const feature of DASHBOARD_FEATURE_DEFS) {
    const route = feature.route.replace(/\/+$/, "") || "/";
    if (normalized !== route && !normalized.startsWith(`${route}/`)) continue;
    if (route.length > bestLength) {
      best = feature;
      bestLength = route.length;
    }
  }
  return best;
}
