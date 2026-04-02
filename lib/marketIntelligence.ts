/**
 * Finova Market Intelligence Engine
 * Complete business-type-specific knowledge base for 30+ industries.
 * Works 100% WITHOUT OpenAI — rule-based, data-driven, always available.
 */

import type { FinancialContext } from "@/lib/finovaAI";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BusinessTypeProfile {
  label: string;
  coreProducts: string[];
  suggestedAdditions: { name: string; reason: string; potentialRevenue: "high" | "medium" | "low" }[];
  marketTrends: string[];
  seasonalOpportunities: Record<string, string[]>; // "Jan" → opportunities
  revenueDiversification: string[];
  competitorEdge: string[];
  crossSellPairs: { trigger: string; suggest: string; reason: string }[];
  riskWarnings: string[];
  marketGaps: string[];
  growthStrategies: { title: string; steps: string[]; impact: string }[];
}

export interface MarketIntelligenceResult {
  businessType: string;
  businessLabel: string;
  currentProducts: string[];
  suggestedNewProducts: { name: string; reason: string; potentialRevenue: "high" | "medium" | "low" }[];
  trendsThisIndustry: string[];
  seasonalOpportunities: { month: string; opportunities: string[] }[];
  revenueDiversification: string[];
  competitorEdge: string[];
  score: number;
  summary: string;
  aiEnhanced?: boolean;
  aiSummary?: string;
}

export interface BusinessAdvisorResult {
  businessType: string;
  growthPlan: { title: string; priority: "urgent" | "high" | "medium" | "low"; steps: string[]; impact: string }[];
  marketGaps: string[];
  crossSellUpsell: { trigger: string; suggest: string; reason: string }[];
  riskWarnings: { title: string; severity: "critical" | "warning" | "info"; description: string; mitigation: string }[];
  quickWins: string[];
  score: { overall: number; label: string };
}

// ─── Knowledge Base ──────────────────────────────────────────────────────────

const BUSINESS_PROFILES: Record<string, BusinessTypeProfile> = {

  trading: {
    label: "Trading / General Merchandise",
    coreProducts: ["hardware", "tools", "electronics", "machinery", "chemicals", "textiles", "plastic", "steel", "paper", "packaging"],
    suggestedAdditions: [
      { name: "Annual Maintenance Contracts (AMC)", reason: "Recurring revenue stream on products you already sell — customers pay monthly instead of one-time", potentialRevenue: "high" },
      { name: "Private Label Packaging on Top SKUs", reason: "Branded packaging on your best-sellers builds loyalty and improves margins by 15-25%", potentialRevenue: "high" },
      { name: "Bulk/Wholesale Tier Pricing", reason: "Attract B2B buyers with volume discounts — typically increases order size by 3x", potentialRevenue: "high" },
      { name: "Same-Day Delivery Premium Service", reason: "Charge 10-15% premium for urgent orders — most traders don't offer this", potentialRevenue: "medium" },
      { name: "Online B2B Catalog with WhatsApp Orders", reason: "80% of SME traders still use phone calls — a digital catalog cuts order errors and increases reach", potentialRevenue: "medium" },
      { name: "Extended Warranty / Guarantee Packages", reason: "Add 5-10% to each product sale — customers value peace of mind on high-ticket items", potentialRevenue: "medium" },
      { name: "Installation & Setup Service", reason: "For equipment/machinery — earn service revenue from existing product sales", potentialRevenue: "medium" },
      { name: "Trade-In Program", reason: "Accept old equipment as partial payment — builds loyalty and source of refurbished inventory", potentialRevenue: "low" },
    ],
    marketTrends: [
      "B2B digital ordering via WhatsApp and web catalogs is replacing phone orders across Pakistan and UAE",
      "Customers demand 24-48 hour delivery — traders with logistics partnerships are winning market share",
      "Rising raw material costs are pushing margins down — diversification into services is critical",
      "Private label products earn 20-35% higher margins than reselling branded goods",
    ],
    seasonalOpportunities: {
      Jan: ["New year restocking campaigns for regular business customers", "Year-end clearance on slow stock — offer bundle deals"],
      Feb: ["Valentine promotions for any consumer-facing products", "Q1 industrial restocking season begins"],
      Mar: ["Pre-Ramadan stocking for food/FMCG traders", "Spring construction season — hardware demand rises"],
      Apr: ["Ramadan promotions and bulk gifting packages", "End of fiscal year purchasing push for corporate clients"],
      May: ["Eid ul Fitr gifting and packaging demand peaks", "Summer cooling equipment demand rises (AC, fans, refrigeration)"],
      Jun: ["Monsoon preparation — waterproofing, drainage, safety equipment", "Mid-year inventory review — push slow-moving stock with discounts"],
      Jul: ["Back to school season — stationery, equipment", "Monsoon construction slowdown — focus on other sectors"],
      Aug: ["Independence Day promotions", "Manufacturing sector restocking for Q4"],
      Sep: ["Q4 preparation — build up inventory for high-demand season", "Corporate procurement budgets refresh"],
      Oct: ["Pre-winter seasonal products — heating, insulation", "Festival season packaging and gifting demand"],
      Nov: ["Black Friday equivalent promotions for B2B buyers", "Year-end corporate gifting purchases"],
      Dec: ["Year-end inventory push — clear old stock", "Holiday gifting campaigns", "Plan next year's sourcing contracts"],
    },
    revenueDiversification: [
      "Add a service arm: installation, maintenance, or technical support for products you sell",
      "Launch a subscription model for consumable items (monthly auto-delivery for regular buyers)",
      "Offer product financing/installments for high-value equipment buyers",
      "Create a loyalty program: cashback points for repeat business customers",
      "Export a portion of inventory to regional markets (Afghanistan, Central Asia) for higher margins",
    ],
    competitorEdge: [
      "Offer 30-day credit terms to verified businesses — most small traders only accept upfront payment",
      "Provide material certificates, technical datasheets with every product order (builds trust)",
      "WhatsApp order placement channel open 7 days — competitors close weekends",
      "Real-time stock availability updates via website/WhatsApp broadcast",
      "Dedicated account manager for top 10 customers — builds loyalty that price alone can't break",
    ],
    crossSellPairs: [
      { trigger: "Customer buys machinery/equipment", suggest: "Annual maintenance contract + spare parts package", reason: "Equipment buyers always need ongoing support — capture this revenue before they find a competitor" },
      { trigger: "Customer buys packaging materials", suggest: "Custom printed packaging with their brand logo", reason: "Value-added service with 40-60% higher margin than plain packaging" },
      { trigger: "Customer buys steel/hardware", suggest: "Cutting and fabrication service", reason: "Many customers outsource cutting — doing it in-house is an easy upsell" },
      { trigger: "Customer buys chemicals", suggest: "Safety equipment: gloves, masks, goggles", reason: "Regulatory requirements make this a must-buy — bundle automatically" },
      { trigger: "Customer places large order", suggest: "Dedicated storage/warehousing at your facility", reason: "Customers with space constraints will pay for this — recurring monthly income" },
    ],
    riskWarnings: [
      "Single-supplier dependency — if your main supplier raises prices or stops supply, your entire business is at risk",
      "Currency risk — imported goods priced in USD/EUR while you sell in local currency",
      "Receivables piling up — B2B credit terms can become bad debt if not monitored weekly",
      "Inventory obsolescence — technology and market preferences change; old stock becomes deadweight",
    ],
    marketGaps: [
      "Very few traders offer a proper digital catalog with real-time stock and pricing",
      "After-sales service and spare parts are underserved — most traders only sell, not support",
      "Financing options for SME buyers who can't afford large one-time payments",
      "Transparent quality certifications — customers struggle to verify product authenticity",
    ],
    growthStrategies: [
      {
        title: "Launch B2B Digital Ordering System",
        steps: ["Create a WhatsApp Business catalog with your top 50 products", "Add pricing tiers for different order quantities", "Set up automatic order confirmation via Finova", "Train 2 staff on order management"],
        impact: "Reduce order processing time by 70%, increase reachable customers by 3-5x",
      },
      {
        title: "Add Service Revenue Stream",
        steps: ["Identify top 3 products that need installation or maintenance", "Hire or train 1 technician", "Package service contracts at 5-10% of product value annually", "Market to existing customers first"],
        impact: "Add 15-25% to annual revenue with nearly 100% gross margin on labor",
      },
    ],
  },

  retail: {
    label: "Retail Store",
    coreProducts: ["clothing", "shoes", "accessories", "groceries", "household", "electronics", "cosmetics", "stationery", "toys", "gifts"],
    suggestedAdditions: [
      { name: "Loyalty Points Program", reason: "Increases repeat purchase frequency by 20-40% — customers with points spend more per visit", potentialRevenue: "high" },
      { name: "Gift Wrapping & Customization Service", reason: "3-5x markup on minimal materials — high-margin seasonal revenue", potentialRevenue: "medium" },
      { name: "Click & Collect / Online Orders", reason: "E-commerce is growing 35% annually — customers who order online spend 2x more", potentialRevenue: "high" },
      { name: "Exclusive Membership Club", reason: "Monthly fee for early access, special discounts — guaranteed recurring income", potentialRevenue: "high" },
      { name: "Personal Shopping Service", reason: "Premium customers pay extra for curated selections — especially for gifts", potentialRevenue: "medium" },
      { name: "Alteration / Repair Service", reason: "For clothing/footwear retailers — high margin, builds customer relationship", potentialRevenue: "medium" },
      { name: "Corporate Gifting Packages", reason: "B2B orders for Eid, New Year, events — typically 50-200x individual purchase size", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Omnichannel retail (physical + online + WhatsApp) is now the standard expectation",
      "Personalization — customers want recommendations based on past purchases",
      "Sustainability is influencing purchase decisions, especially for younger customers",
      "Buy now, pay later (BNPL) is driving sales among price-sensitive shoppers",
    ],
    seasonalOpportunities: {
      Jan: ["Winter clearance sale — clear seasonal stock at 30-50% off", "New year resolutions drive fitness, wellness, stationery purchases"],
      Feb: ["Valentine's Day — gift sets, packaging, personalized items are peak sellers", "Winter fashion final push before spring collections"],
      Mar: ["Spring collection launch", "Pre-Ramadan shopping — modest fashion, home goods surge"],
      Apr: ["Ramadan peak — iftar products, home décor, clothing surge", "End-of-season promotions"],
      May: ["Eid ul Fitr — biggest shopping event of the year in Muslim markets", "Children's Day promotions"],
      Jun: ["Summer fashion and outdoor products", "School year-end celebrations"],
      Jul: ["Monsoon clothing and rain gear", "Mid-year sale — clear slow inventory"],
      Aug: ["Independence Day promotions and themed products", "Back-to-school supplies"],
      Sep: ["New season arrivals — build excitement with launch events", "Corporate gifting season begins"],
      Oct: ["Autumn collection and festive décor", "Early holiday gifting — corporate buyers start ordering"],
      Nov: ["Black Friday / Singles Day — biggest discount event — build inventory now", "Wedding season gifting in South Asia"],
      Dec: ["Christmas/New Year gifting", "Year-end clearance", "Hot chocolate season — complementary products"],
    },
    revenueDiversification: [
      "Launch an online store (website + Instagram shopping) — captures customers who can't visit physically",
      "Add a subscription box service for your category (e.g., monthly beauty box, monthly fashion accessory)",
      "Offer store-branded gift cards — float income before the customer spends",
      "Rent your store space for pop-up events on off-peak days/hours",
      "Create a referral program — existing customers bring new customers for a discount",
    ],
    competitorEdge: [
      "In-store experience events: styling sessions, workshops, product demos — creates shareable moments",
      "Same-day delivery within 5km radius — rare in retail but increasingly expected",
      "WhatsApp-based personal shopper: 'Tell me your budget, I'll pick the perfect gift'",
      "Easy no-questions return policy builds trust and actually increases sales",
      "Stock influencer or local micro-creator favorites prominently — social proof drives impulse buys",
    ],
    crossSellPairs: [
      { trigger: "Customer buys dress/outfit", suggest: "Matching accessories, shoes, and alteration service", reason: "Complete outfit sells at 2-3x value of just the dress" },
      { trigger: "Customer buys gift for someone", suggest: "Premium gift wrapping and personalized card", reason: "10-15% premium willingly paid for presentation" },
      { trigger: "Customer buys skincare", suggest: "Complementary products: toner, moisturizer, SPF as a routine set", reason: "Routine sets sell 3-4 items instead of 1" },
      { trigger: "Customer buys electronics", suggest: "Case, screen protector, extended warranty, charging accessories", reason: "Accessory margin is 50-80%, often higher than the main product" },
    ],
    riskWarnings: [
      "Fast fashion turnover — unsold seasonal stock has near-zero residual value after the season",
      "Rising real estate costs — renegotiate lease annually and explore smaller or shared spaces",
      "Online competitors offering the same products at lower prices — you must differentiate on experience",
      "Shoplifting and internal theft — invest in basic inventory control systems",
    ],
    marketGaps: [
      "Very few retailers offer personalized product recommendations based on customer history",
      "Post-purchase relationship management is weak — most retailers don't follow up after the sale",
      "Alterations and repair services are scarce in most markets",
      "Curated gift services for corporate clients are almost always outsourced when you could do it in-house",
    ],
    growthStrategies: [
      {
        title: "Launch Loyalty + Repeat Purchase System",
        steps: ["Set up Finova's customer tracking for purchase history", "Create 3-tier loyalty: Bronze (10% off), Silver (15%), Gold (20%)", "Send monthly WhatsApp messages to inactive customers", "Promote loyalty card at checkout every transaction"],
        impact: "Increase repeat purchase rate by 25-40%, raise average basket value by 15%",
      },
    ],
  },

  restaurant: {
    label: "Restaurant / Food Service",
    coreProducts: ["dine-in meals", "takeaway", "beverages", "desserts", "breakfast", "lunch", "dinner", "snacks"],
    suggestedAdditions: [
      { name: "Catering for Events & Corporates", reason: "1 corporate event can equal 3 days of regular restaurant revenue — huge multiplier", potentialRevenue: "high" },
      { name: "Meal Prep Subscription Boxes", reason: "Weekly recurring orders from health-conscious customers — predictable revenue", potentialRevenue: "high" },
      { name: "Cooking Classes & Chef Experiences", reason: "Use kitchen on off-peak hours (mornings/afternoons) — 100% margin on existing space", potentialRevenue: "medium" },
      { name: "Branded Merchandise (sauces, spice mixes, branded items)", reason: "Your signature sauces/recipes sold as products extend brand beyond the restaurant", potentialRevenue: "medium" },
      { name: "Ghost Kitchen / Delivery-Only Brand", reason: "Launch a second brand on delivery apps using the same kitchen — doubles revenue from same space", potentialRevenue: "high" },
      { name: "Family Meal Packages / Party Trays", reason: "Bulk meal packages for home gatherings — average order size is 5-10x regular order", potentialRevenue: "high" },
      { name: "Corporate Lunch Contracts", reason: "Daily office lunch delivery at negotiated rates — guaranteed daily revenue with no walk-in uncertainty", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Food delivery apps (Foodpanda, Uber Eats, Careem) now account for 30-40% of restaurant revenue in urban areas",
      "Ghost kitchens are growing 20% annually — low overhead, high reach with same kitchen",
      "Health-conscious menus (low-carb, gluten-free, high-protein) are the fastest growing food segment",
      "Contactless ordering via QR code menus is reducing wait times and improving table turnover",
    ],
    seasonalOpportunities: {
      Jan: ["New Year diet menus — healthy eating resolutions are peak in January", "Corporate welcome-back lunches"],
      Feb: ["Valentine's Day prix-fixe dinner packages at 2-3x normal revenue per table", "Corporate Valentine gifting with dessert boxes"],
      Mar: ["Ramadan pre-booking for iftar packages — the biggest month for most Pakistani restaurants", "Corporate sehri/iftar deals"],
      Apr: ["Peak Ramadan — iftar buffets, sehri packages, Ramadan kareem boxes", "Family gatherings increase 5x"],
      May: ["Eid ul Fitr feasting — family packages, catering for home parties", "Mother's Day brunch specials"],
      Jun: ["Summer cool-down menu — cold beverages, ice cream, light meals", "Wedding catering season begins"],
      Jul: ["Monsoon comfort food — hot soups, chai, heavy meals", "Indoor dining picks up as outdoor events pause"],
      Aug: ["Independence Day themed menu and decor — national pride drives footfall", "Back-to-school family dinners"],
      Sep: ["Wedding season peak in South Asia — catering calendar fills fast", "Food festivals and pop-up events"],
      Oct: ["Autumn harvest menu — seasonal ingredients drive novelty", "Pre-holiday corporate dinners begin"],
      Nov: ["Year-end party bookings — office parties are high value", "Winter comfort food menu launch"],
      Dec: ["Christmas/New Year private dining events — highest value bookings of the year", "Gift voucher sales for family gifting"],
    },
    revenueDiversification: [
      "Launch on 2-3 delivery apps simultaneously — each platform reaches different customer segments",
      "Sell signature recipe kits with pre-portioned ingredients for customers to cook at home",
      "Add a private dining room experience for special occasions at premium pricing",
      "Create a restaurant loyalty app or WhatsApp group for regulars with exclusive deals",
      "Partner with local hotels/offices for regular catering contracts",
    ],
    competitorEdge: [
      "Publish food cost ratios and calorie counts on menu — transparency builds trust with health-conscious customers",
      "Chef's table experience (6-8 guests, fixed menu, kitchen tour) at 3x regular price",
      "Offer group booking coordinator service — one call handles everything for event planners",
      "Surprise-and-delight: free dessert for regulars, birthday recognition, anniversary remembrance",
      "Live cooking stations for events — theater experience commands 30-50% premium",
    ],
    crossSellPairs: [
      { trigger: "Table orders main course", suggest: "Starter combo + dessert package at 20% discount vs ordering separately", reason: "Pre-packaged meal deals increase check size by 35% on average" },
      { trigger: "Customer orders for delivery", suggest: "Add-on sides and beverages at checkout", reason: "Digital ordering removes awkwardness of upselling — conversion rate is 25-40%" },
      { trigger: "Customer inquires about birthday/event", suggest: "Full catering package with decoration coordination", reason: "Events booked through you prevent them from going to a competitor" },
      { trigger: "Regular customer", suggest: "Monthly meal subscription plan (X meals at discount)", reason: "Subscriptions lock in revenue and reduce customer acquisition cost" },
    ],
    riskWarnings: [
      "Food cost percentage above 35% is unsustainable — review menu pricing and portion sizes quarterly",
      "Staff turnover is the #1 operational risk for restaurants — invest in culture and training",
      "Single-location risk — one bad review, flood, or renovation nearby can destroy monthly revenue",
      "Raw material price volatility — seasonal ingredients can swing food cost by 20-30%",
    ],
    marketGaps: [
      "Very few restaurants offer proper corporate catering contracts with invoicing and payment terms",
      "Healthy and dietary-specific menus are underserved in most markets",
      "Contactless table ordering is rare but dramatically improves efficiency and margins",
      "Loyalty programs in restaurants are uncommon despite being proven to increase visit frequency by 30%",
    ],
    growthStrategies: [
      {
        title: "Launch Ghost Kitchen Brand",
        steps: ["Design a delivery-only menu using your existing kitchen equipment", "Register a separate brand name on Foodpanda/Uber Eats", "Start with 5-8 items that travel well", "Market to nearby offices and residential areas"],
        impact: "Increase revenue by 30-50% with near-zero additional fixed cost",
      },
      {
        title: "Lock in Corporate Catering Contracts",
        steps: ["List 10 offices within 3km radius", "Visit with sample food and pricing sheet", "Offer first week free for trial", "Use Finova invoicing for professional billing"],
        impact: "1 corporate client = guaranteed daily orders worth 2-5x walk-in revenue",
      },
    ],
  },

  hotel: {
    label: "Hotel / Hospitality",
    coreProducts: ["room bookings", "breakfast", "room service", "conference rooms", "parking", "laundry", "housekeeping"],
    suggestedAdditions: [
      { name: "Event & Wedding Package", reason: "Wedding bookings command 10-30x room revenue per event — most hotels under-invest in this", potentialRevenue: "high" },
      { name: "Day Use Room Packages", reason: "Sell rooms to non-overnight guests (meetings, rest between flights) — fills rooms during checkout gaps", potentialRevenue: "medium" },
      { name: "Spa / Wellness Services", reason: "Guests already at the hotel are the easiest customers to upsell — high margin on wellness", potentialRevenue: "high" },
      { name: "Corporate Rate Agreements", reason: "Signed contracts with corporations guarantee room-nights — reduces dependency on walk-ins", potentialRevenue: "high" },
      { name: "Airport Transfer Service", reason: "Own vehicle or partner with driver — every arriving guest is a potential customer", potentialRevenue: "medium" },
      { name: "Co-working / Business Lounge", reason: "Remote work trend — sell daily/monthly lounge access to non-guests", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Online booking via Booking.com, Airbnb alternatives is now 60-70% of hotel reservations",
      "Bleisure travel (business + leisure combined) is growing rapidly among corporate travelers",
      "Guests expect digital check-in, WhatsApp communication, and cashless payments",
      "Wellness and experience-based travel commands 2-3x room rates over standard accommodation",
    ],
    seasonalOpportunities: {
      Jan: ["Corporate conference season — position meeting rooms with full package deals", "New year couples getaway packages"],
      Feb: ["Valentine's Day honeymoon packages", "Corporate training season"],
      Mar: ["Spring tourism peak — early bird packages with breakfast included", "Ramadan corporate Iftar events at hotel"],
      Apr: ["Ramadan staycation packages for families wanting hotel experience", "Wedding season approaches"],
      May: ["Eid holiday travel surge — book up early", "Wedding reception season peak"],
      Jun: ["Summer family packages — children stay free promotions", "Tourism from cooler countries"],
      Jul: ["Monsoon escape packages for domestic tourism", "Wedding season continues"],
      Aug: ["Independence Day tourism promotions", "Summer closing deals"],
      Sep: ["Business travel Q3/Q4 surge", "Conference and exhibition season"],
      Oct: ["Autumn travel peak globally", "Pre-winter getaways"],
      Nov: ["Year-end corporate parties and retreats", "Black Friday room deals for advance bookings"],
      Dec: ["Christmas and New Year packages — highest rates of the year", "Winter honeymoon packages"],
    },
    revenueDiversification: [
      "List on 3-4 OTA platforms (Booking.com, Expedia, Airbnb) to maximize online reach",
      "Sell hotel experiences (dinner, spa, tour packages) to local residents, not just guests",
      "Rent meeting rooms by the hour for local businesses — recurring daytime revenue",
      "Launch a hotel loyalty program for frequent business travelers",
      "Partner with tour operators for package deals that include your rooms",
    ],
    competitorEdge: [
      "WhatsApp concierge: available 24/7 for guest requests — rare and valued by business travelers",
      "Personalized room setup (birthday decorations, preferred pillow type) remembered from past stays",
      "Local experience curation: arrange city tours, restaurant bookings, transportation — guests pay for convenience",
      "Transparent pricing with no hidden fees — guests hate surprise charges at checkout",
    ],
    crossSellPairs: [
      { trigger: "Guest checks in", suggest: "Breakfast package, spa appointment, late checkout upgrade", reason: "Check-in is peak upsell moment — guest is already committed to stay" },
      { trigger: "Corporate booking", suggest: "Conference room, catering package, extended stay rate", reason: "Corporate clients have larger budgets and value convenience over price" },
      { trigger: "Couple/honeymoon booking", suggest: "Flower decoration, couples spa, dinner reservation at hotel restaurant", reason: "Emotional spending — these customers have highest willingness to pay" },
    ],
    riskWarnings: [
      "OTA commission fees (15-25%) significantly erode margins — build direct booking capability",
      "Review management is critical — one viral bad review can impact bookings for months",
      "High fixed costs (staff, maintenance, utilities) during low-occupancy seasons are dangerous",
      "Building maintenance and renovation delays can force room closures — reserve fund is essential",
    ],
    marketGaps: [
      "Direct booking with price-match guarantee beats OTA rates for guests willing to book direct",
      "Business traveler amenities (fast WiFi, printing, meeting rooms) are often inadequate",
      "Local authentic experience packages are growing demand — most hotels offer generic tourism",
      "Long-stay rates (weekly, monthly) for remote workers are rarely offered",
    ],
    growthStrategies: [
      {
        title: "Build Corporate Rate Program",
        steps: ["Identify 20 medium-large companies within 10km", "Offer guaranteed rate card with volume discounts", "Include breakfast, airport transfer, meeting room", "Bill monthly via Finova for professional relationship"],
        impact: "Guaranteed 40-60% room occupancy from corporate base alone",
      },
    ],
  },

  school: {
    label: "School / Educational Institution",
    coreProducts: ["tuition fees", "admission fees", "exam fees", "uniform", "books", "stationery", "transport"],
    suggestedAdditions: [
      { name: "After-School Activity Programs", reason: "Sports, arts, coding, robotics — parents pay extra for enrichment outside curriculum", potentialRevenue: "high" },
      { name: "Summer Camps / Workshops", reason: "Generate revenue during school break — otherwise school earns nothing in June-July", potentialRevenue: "high" },
      { name: "Online Learning Platform", reason: "Hybrid learning post-COVID is expected — digital courses extend reach beyond local area", potentialRevenue: "high" },
      { name: "School Transport Service", reason: "Safety-conscious parents pay premium for school-managed transport", potentialRevenue: "medium" },
      { name: "Alumni Network & Career Services", reason: "Alumni donations and events are a growing school revenue stream worldwide", potentialRevenue: "medium" },
      { name: "Corporate Training / Facility Rental", reason: "Rent auditorium, labs, sports grounds on weekends when school is closed", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Parents are increasingly choosing schools with strong STEM and coding curricula",
      "Mental health and wellbeing programs are becoming a selection factor for premium schools",
      "Schools with digital learning management systems (LMS) are perceived as higher quality",
      "International curriculum (Cambridge, IB) commands 3-5x higher fee structure",
    ],
    seasonalOpportunities: {
      Mar: ["Admissions season — marketing push for new academic year", "Open house events for prospective families"],
      Apr: ["Final exams — tutoring and preparation programs", "Summer program early bird registrations"],
      May: ["Graduation ceremonies — photography, gifts, events revenue", "Summer camp registrations peak"],
      Jun: ["Summer camps begin — daily operations revenue", "Teacher training programs"],
      Jul: ["New academic year preparation", "Uniform and book sales peak"],
      Aug: ["Back to school — highest footfall month", "New student orientation events"],
      Sep: ["School year underway — extra-curricular enrollment", "Parent-teacher meeting events"],
      Nov: ["Mid-year academic events — science fairs, competitions", "Early admissions for next year"],
      Dec: ["Annual day / prize-giving ceremony — ticket sales, sponsorships", "Year-end reports"],
    },
    revenueDiversification: [
      "Launch an online tutoring platform for students who want extra help — beyond your school's students",
      "Offer professional development courses for teachers from other schools",
      "Create a school merchandise line (branded clothing, stationery, accessories)",
      "Sell advertising space in school publications and events to local businesses",
      "Partner with EdTech companies for revenue-sharing on digital tools used by your students",
    ],
    competitorEdge: [
      "Transparent monthly progress reports via app — parents choose schools where they feel informed",
      "Small class sizes with personalized attention — quality over quantity positioning",
      "Industry partnership programs: companies sponsor events and provide career exposure to students",
      "Strong alumni success stories prominently marketed — aspiration drives enrollment decisions",
    ],
    crossSellPairs: [
      { trigger: "Student enrolls", suggest: "Transport service, after-school activities, uniform package", reason: "Bundling at enrollment is easiest — parents are already in purchase mode" },
      { trigger: "Exam season", suggest: "Tutoring sessions, preparation workshops, past paper books", reason: "Academic anxiety peaks at exam time — parents spend freely to help children" },
      { trigger: "Graduation", suggest: "Photography package, graduation merchandise, alumni membership", reason: "Emotional milestones have high willingness to pay for memorabilia" },
    ],
    riskWarnings: [
      "Fee collection is the #1 cash flow risk — late-paying parents can create severe cash crunches",
      "Teacher retention — losing key teachers mid-year disrupts entire classes and parent trust",
      "Regulatory compliance — curriculum approval, safety certifications, fire safety are non-negotiable",
      "Reputation risk — one viral incident (bullying, accident) can impact enrollment for years",
    ],
    marketGaps: [
      "Very few schools offer structured after-school career preparation for older students",
      "Mental health support services are severely underserved in most school systems",
      "Parent engagement apps are rare but dramatically improve satisfaction and retention",
      "Scholarships and need-based assistance — unlocks premium image and broader community support",
    ],
    growthStrategies: [
      {
        title: "Launch Summer Enrichment Program",
        steps: ["Design 4-6 week themed camps (coding, sports, arts, science)", "Hire camp counselors from existing staff at overtime rates", "Market to existing students first, then neighborhood via social media", "Include snacks, activities, and end-of-camp showcase"],
        impact: "Convert dead summer months into 15-25% of annual revenue",
      },
    ],
  },

  pharmacy: {
    label: "Pharmacy / Medical Store",
    coreProducts: ["prescription medicines", "OTC medications", "vitamins", "supplements", "baby care", "first aid", "cosmetics"],
    suggestedAdditions: [
      { name: "Health Screening Services", reason: "BP, blood sugar, BMI checks — free or nominal fee builds traffic and trust", potentialRevenue: "medium" },
      { name: "Home Delivery of Medicines", reason: "Chronic patients (diabetes, hypertension) need monthly refills — home delivery locks them in", potentialRevenue: "high" },
      { name: "Subscription Refill Program", reason: "Auto-refill for regular medications — predictable monthly revenue, near-zero marketing cost", potentialRevenue: "high" },
      { name: "Medical Equipment Rental", reason: "Wheelchairs, crutches, BP machines — rental income from items already stocked", potentialRevenue: "medium" },
      { name: "Vaccination Services", reason: "Flu vaccines, travel vaccines — high margin, brings in healthy customers", potentialRevenue: "medium" },
      { name: "Insurance Billing Services", reason: "Partner with health insurance companies — opens corporate client segment", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Online pharmacy ordering with home delivery is growing 40% annually in urban areas",
      "Chronic disease management (diabetes, hypertension) is becoming a pharmacy specialty",
      "Generics and biosimilars are capturing prescription share from branded drugs",
      "Wellness products (nutraceuticals, organic supplements) are the fastest growing category",
    ],
    seasonalOpportunities: {
      Jan: ["Cold and flu season — stock up on cough, cold, and flu medicines", "Detox and weight loss supplement demand post-holidays"],
      Mar: ["Pre-summer vitamin D, allergy season begins", "Ramadan health products (energy drinks, supplements)"],
      Jun: ["Summer heat — ORS, cooling products, sunscreen peak", "Travel medicine kits for Hajj/Umrah pilgrims"],
      Sep: ["Flu vaccination season begins", "Back-to-school children's health products"],
      Oct: ["Winter preparation — cough syrups, warm care products", "Diabetes awareness month — blood sugar monitoring promotion"],
      Dec: ["Year-end health check-up products", "Gift hampers of health products"],
    },
    revenueDiversification: [
      "Partner with a diagnostic lab for test referrals — earn referral commission on every test",
      "Sell herbal and natural medicine product lines which have higher margins than conventional drugs",
      "Create a corporate wellness package for nearby offices — monthly medicine supply contract",
      "Launch loyalty card where repeat customers earn points redeemable for health products",
      "Offer medication counseling sessions — pharmacist consultation as a paid service",
    ],
    competitorEdge: [
      "24-hour delivery for urgent medicines — most pharmacies close at 10pm",
      "Medicine reminder system via WhatsApp for chronic patients — builds loyalty through care",
      "Pharmacist available on WhatsApp for quick drug queries — digital trust builder",
      "Guaranteed authentic medicines with supplier certificates — critical in markets with counterfeit risk",
    ],
    crossSellPairs: [
      { trigger: "Customer buys diabetes medication", suggest: "Glucometer, testing strips, diabetic-friendly foods, vitamins", reason: "Diabetic patients need comprehensive management — one-stop-shop loyalty" },
      { trigger: "Customer buys antibiotics", suggest: "Probiotics and yogurt for gut restoration", reason: "Medically appropriate and genuinely helpful — builds trust" },
      { trigger: "Customer buys baby products", suggest: "Mother's vitamins, baby monitor, growth supplements", reason: "New parents have high spending and high anxiety — solve both" },
      { trigger: "Customer buys first aid kit", suggest: "Digital thermometer, pulse oximeter, BP monitor", reason: "Bundle with home health monitoring — higher value, higher margin" },
    ],
    riskWarnings: [
      "Expired medicine stock is a legal liability and major financial write-off — implement FEFO strictly",
      "Cold chain medicines (insulin, vaccines) require proper storage — equipment failure is catastrophic",
      "Regulatory compliance — prescription verification, controlled substance records are non-negotiable",
      "Counterfeit medicine risk — buy only from licensed distributors with verifiable supply chain",
    ],
    marketGaps: [
      "Chronic patient management programs are rare — most pharmacies just dispense, not advise",
      "Home delivery is available but unreliable — consistent, timely delivery is a major differentiator",
      "Corporate health supply contracts with offices are largely untapped by independent pharmacies",
      "Mental health medication management is growing rapidly with almost no specialist pharmacies serving it",
    ],
    growthStrategies: [
      {
        title: "Launch Chronic Patient Home Delivery Program",
        steps: ["Identify your top 50 chronic medication customers (diabetes, hypertension, thyroid)", "Call each to offer free monthly home delivery with auto-refill", "Set up WhatsApp group for medication reminders", "Use Finova to track recurring invoices"],
        impact: "Lock in predictable monthly revenue from highest-value customers — reduces churn to near zero",
      },
    ],
  },

  manufacturing: {
    label: "Manufacturing",
    coreProducts: ["finished goods", "raw materials", "components", "packaging", "bulk orders", "custom production"],
    suggestedAdditions: [
      { name: "Custom/OEM Manufacturing", reason: "Other businesses pay premium for custom production to their specs — high margin per unit", potentialRevenue: "high" },
      { name: "After-Sales Spare Parts Sales", reason: "Ongoing parts revenue from products already sold — high margin, predictable", potentialRevenue: "high" },
      { name: "Waste Material Resale", reason: "Manufacturing waste (offcuts, scraps) can be sold to recyclers or smaller manufacturers", potentialRevenue: "low" },
      { name: "Production Capacity Rental", reason: "Rent unused machine time to smaller manufacturers who can't afford their own equipment", potentialRevenue: "medium" },
      { name: "Quality Testing Services", reason: "If you have testing equipment, offer certification services to other manufacturers", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Automation and robotics are reducing per-unit labor costs — early adopters gain permanent cost advantage",
      "Just-in-time supply chain is shifting to just-in-case (buffer stock) post-COVID disruptions",
      "Export opportunities to Gulf countries for Pakistani manufacturers have grown significantly",
      "Green manufacturing and sustainability certifications are becoming requirements for export buyers",
    ],
    seasonalOpportunities: {
      Mar: ["Pre-Ramadan production rush for FMCG manufacturers", "Export season for seasonal goods"],
      Jun: ["Mid-year machine maintenance before Q3 production ramp-up", "Summer industrial slowdown — train staff"],
      Sep: ["Q4 production ramp-up — highest output months for most manufacturers", "Year-end order fulfillment rush"],
      Dec: ["Annual maintenance shutdown planning", "New year equipment procurement budgets"],
    },
    revenueDiversification: [
      "Export a portion of production — Gulf, Africa, Central Asia often pay better than local market",
      "Add value-added services: design, customization, packaging for customers who outsource these",
      "Create a product brand for retail distribution, not just B2B supply",
      "License your manufacturing process or technology to non-competing manufacturers",
      "Offer toll manufacturing: process customer's raw materials using your machines for a fee",
    ],
    competitorEdge: [
      "ISO certification — even informal compliance raises buyer confidence and opens export doors",
      "Guaranteed lead time with penalties for delays — rare in manufacturing, valued by buyers",
      "Dedicated production line for top customers — ensures quality consistency they can't get elsewhere",
      "Transparent production cost reporting — allows buyers to trust your pricing is fair",
    ],
    crossSellPairs: [
      { trigger: "Customer orders bulk production", suggest: "Custom packaging design and printing service", reason: "Packaging is always needed — keeping it in-house increases revenue and simplifies supply chain" },
      { trigger: "Customer buys manufactured goods", suggest: "Extended warranty and spare parts contract", reason: "Ongoing relationship turns one-time buyers into recurring customers" },
    ],
    riskWarnings: [
      "Raw material price spikes can destroy margins if supply contracts aren't hedged",
      "Single customer concentration — if top customer leaves, production lines go idle",
      "Machine downtime risk — maintenance schedule prevents catastrophic production failures",
      "Export compliance and customs documentation errors can delay shipments and create penalties",
    ],
    marketGaps: [
      "Most manufacturers don't offer small-batch or prototype runs — huge unmet demand from startups",
      "Transparent production tracking (status updates to buyers) is almost nonexistent",
      "Manufacturers who offer design collaboration with buyers can command 20-40% premium",
      "Eco-friendly/organic production certification is demanded by export buyers but rarely available locally",
    ],
    growthStrategies: [
      {
        title: "Enter Export Market",
        steps: ["Identify 3 export markets where your product is in demand", "Get necessary certifications (quality, Halal, REACH)", "List on Alibaba or regional B2B platforms", "Engage a freight forwarder familiar with your target market"],
        impact: "Export pricing is typically 30-80% higher than local market for same product",
      },
    ],
  },

  construction: {
    label: "Construction",
    coreProducts: ["building construction", "civil works", "renovation", "interior work", "road work", "plumbing", "electrical"],
    suggestedAdditions: [
      { name: "Interior Design Consultation", reason: "Add design service to construction contracts — increases total project value by 20-40%", potentialRevenue: "high" },
      { name: "Property Maintenance Contracts", reason: "Post-construction maintenance with buildings you've built — predictable recurring income", potentialRevenue: "high" },
      { name: "Prefab & Modular Construction", reason: "Faster build times command premium pricing and attract cost-conscious clients", potentialRevenue: "high" },
      { name: "Green Building Certification Consulting", reason: "LEED, green building demand is growing in commercial sector — niche with high margins", potentialRevenue: "medium" },
      { name: "Equipment Rental to Other Contractors", reason: "Your cranes, mixers, scaffolding can earn when you're between projects", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Real estate development in Tier-2 Pakistani cities is creating massive construction demand",
      "Smart home integration (automation, security) is now expected in premium projects",
      "Energy-efficient and solar-ready construction commands premium prices and faster sales",
      "Government infrastructure projects (CPEC, motorways) are creating sustained civil work demand",
    ],
    seasonalOpportunities: {
      Mar: ["Construction season peaks — foundation work before monsoon", "Pre-Ramadan project rush"],
      Apr: ["Eid break creates project delays — plan around it", "Outdoor work peaks"],
      Aug: ["Post-monsoon repair and renovation surge", "New project commencement post-Eid"],
      Oct: ["Best weather for construction — maximize output", "Year-end project completion rush"],
      Nov: ["Commercial property year-end completion deadlines", "Planning next year's projects"],
      Dec: ["Winter slowdown in northern regions — focus on interior work", "Contract signing season for next year"],
    },
    revenueDiversification: [
      "Develop your own small residential project to sell (build-to-sell model increases margins dramatically)",
      "Offer construction management services for clients who want to owner-supply materials",
      "Launch a renovation package for older homes — fastest growing construction segment",
      "Partner with property developers for preferred contractor status on multiple projects",
      "Create a real estate investment club among high-net-worth clients — earn on project management",
    ],
    competitorEdge: [
      "Fixed-price contracts with guaranteed completion date — clients are willing to pay premium for certainty",
      "3D visualization and walkthrough before construction begins — eliminates change orders and disputes",
      "Daily photo progress reports on WhatsApp — clients elsewhere love real-time visibility",
      "Dedicated project manager for each client — accountability that most contractors avoid",
    ],
    crossSellPairs: [
      { trigger: "Client commissions new build", suggest: "Interior design package, landscaping, smart home system", reason: "Client is already in spending mode — complement the main contract naturally" },
      { trigger: "Project completes", suggest: "Annual maintenance contract for plumbing, electrical, painting", reason: "You know the building better than anyone — clients prefer you for maintenance" },
    ],
    riskWarnings: [
      "Material cost escalation mid-project is the #1 financial risk in construction — include escalation clauses in all contracts",
      "Cash flow gaps between project milestones can force you to take loans at high interest",
      "Labor shortage during peak season drives up wages and delays — maintain a reliable sub-contractor pool",
      "Regulatory and permit delays are common — always build 20-30% buffer into project timelines",
    ],
    marketGaps: [
      "Turnkey projects (construction + interior + landscaping) in one contract are rare but highly demanded",
      "Transparent real-time project progress reporting is almost nonexistent in the industry",
      "Post-construction warranty and maintenance service is underserved — clients have nowhere to turn",
      "Affordable quality housing construction for middle-income segment is massively undersupplied",
    ],
    growthStrategies: [
      {
        title: "Launch Maintenance Contract Business",
        steps: ["List all buildings your company has constructed", "Contact owners to offer annual maintenance package", "Include: plumbing check, electrical inspection, painting touch-ups", "Price at 2-3% of original construction value annually"],
        impact: "Converts one-time clients to recurring revenue — 100% lower acquisition cost than new clients",
      },
    ],
  },

  hospital: {
    label: "Hospital / Clinic",
    coreProducts: ["OPD consultation", "IPD admission", "surgery", "lab tests", "radiology", "pharmacy", "physiotherapy"],
    suggestedAdditions: [
      { name: "Corporate Health Packages", reason: "Annual health check packages for companies' employees — guaranteed bulk contracts", potentialRevenue: "high" },
      { name: "Telemedicine / Online Consultations", reason: "Reach patients beyond your geography — doctors earn without physical presence", potentialRevenue: "high" },
      { name: "Home Healthcare Services", reason: "Post-discharge nursing, IV therapy, wound care at home — premium service with growing demand", potentialRevenue: "high" },
      { name: "Health Insurance Panel Enrollment", reason: "Becoming a panel hospital for major insurers brings guaranteed patient volume", potentialRevenue: "high" },
      { name: "Preventive Health Membership Plans", reason: "Monthly membership with included consultations — recurring revenue + patient loyalty", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Telemedicine has grown 300% since COVID and continues to grow as a complement to in-person care",
      "Corporate health plans are expanding — companies are required by law in many countries to provide health coverage",
      "Preventive care demand is growing — health-conscious populations want checkups not just treatment",
      "Medical tourism from neighboring regions for specialized treatment is a growing segment",
    ],
    seasonalOpportunities: {
      Jan: ["New Year health resolutions — checkup packages promotions", "Weight management programs"],
      Jun: ["Pre-Hajj/Umrah health screening — mandatory for many pilgrims", "Summer heat-related illnesses increase"],
      Sep: ["Flu season preparation — vaccination drives", "Back to school health checks"],
      Nov: ["Diabetes awareness month — blood sugar screening campaigns", "Winter health packages"],
      Dec: ["Year-end health checkup before insurance resets", "Corporate wellness season"],
    },
    revenueDiversification: [
      "Launch a diagnostic center open to the public, not just admitted patients",
      "Partner with schools for annual student health check programs",
      "Create a blood bank or tissue bank for additional revenue and community service",
      "Offer specialist visiting doctor clinics for smaller cities via telemedicine",
      "Medical education programs — training junior doctors or nurses generates fee income",
    ],
    competitorEdge: [
      "Zero waiting time OPD booking via app — most hospitals still use manual queuing",
      "Follow-up reminders via WhatsApp for medication compliance — improves outcomes and patient loyalty",
      "Single-bill system — no separate billing for every department confuses patients",
      "English and Urdu reports — bilingual communication removes barriers for educated patients",
    ],
    crossSellPairs: [
      { trigger: "Patient visits for OPD", suggest: "Preventive health checkup package (blood tests, ECG, chest X-ray)", reason: "Preventive packages catch conditions early — patients value proactive care" },
      { trigger: "Patient discharged after surgery", suggest: "Home nursing care, physiotherapy, follow-up packages", reason: "Post-discharge care gap is a massive unmet need" },
    ],
    riskWarnings: [
      "Medical liability risks — malpractice claims can be financially devastating without proper insurance",
      "Equipment maintenance failure during surgeries is a catastrophic risk — service contracts are essential",
      "Regulatory compliance — accreditation, licensing, drug storage must be perfect",
      "Healthcare worker burnout leads to errors and high turnover — the hidden operational risk",
    ],
    marketGaps: [
      "Mental health services are severely underserved relative to demand in most markets",
      "Elderly care and geriatric medicine is growing rapidly with aging populations",
      "Nutritional and lifestyle medicine is in demand but few hospitals offer it properly",
      "Transparent pricing — patients want to know costs upfront which most hospitals don't provide",
    ],
    growthStrategies: [
      {
        title: "Launch Corporate Health Program",
        steps: ["List 20 companies with 50+ employees in your area", "Offer annual health screening package at corporate rates", "Include free onsite first consultation", "Use Finova for corporate invoicing and tracking"],
        impact: "1 corporate contract = 50-500 guaranteed patients annually with no marketing cost",
      },
    ],
  },

  "real-estate": {
    label: "Real Estate",
    coreProducts: ["property sales", "property rental", "property management", "leasing", "commercial properties", "land"],
    suggestedAdditions: [
      { name: "Property Management Services", reason: "Landlords pay monthly fees to manage tenants — recurring income without selling anything", potentialRevenue: "high" },
      { name: "Interior Design & Renovation Referrals", reason: "Earn referral fees on every renovation you refer — buyers always need this", potentialRevenue: "medium" },
      { name: "Mortgage/Financing Facilitation", reason: "Partner with banks — earn referral commission for every mortgage you refer", potentialRevenue: "high" },
      { name: "Commercial Property Consulting", reason: "Help businesses find the right commercial space — advisory fee without owning inventory", potentialRevenue: "medium" },
      { name: "Property Investment Consultancy", reason: "Guide investors on where to buy — expert advisory at monthly retainer fees", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Virtual property tours and 3D walkthroughs are now expected by serious buyers before visiting",
      "Commercial real estate is shifting — flexible co-working spaces replacing traditional offices",
      "Real estate investment trusts (REITs) are creating new investor segments beyond traditional buyers",
      "Short-term rental (Airbnb model) is generating 2-4x higher returns than traditional rental in tourist areas",
    ],
    seasonalOpportunities: {
      Mar: ["Spring buying season begins — highest footfall months", "Pre-Ramadan deal closings"],
      Sep: ["Post-summer buying season — families settle before new school year", "Q4 investment property purchases"],
      Dec: ["Year-end tax advantage purchases by investors", "January launches pre-booking in December"],
    },
    revenueDiversification: [
      "Launch a rental management division — manage properties for landlords at 8-12% monthly fee",
      "Partner with developers for exclusive sales agency — earn commission without owning the project",
      "Create a real estate investment club — pool investor funds for joint property purchases",
      "Offer moving coordination services — partner with movers, utilities, and Internet providers for referral fees",
      "Launch a property staging service — furnished demo units sell 30% faster and at higher prices",
    ],
    competitorEdge: [
      "Guaranteed sale timeline — few agents commit to a timeline, making you stand out",
      "Weekly progress reports to sellers — most agents go silent for weeks between viewings",
      "Post-sale support: utility transfers, move-in coordination — most agents disappear after commission",
      "Data-driven pricing: show comparable sales analysis so sellers price correctly first time",
    ],
    crossSellPairs: [
      { trigger: "Client buys property", suggest: "Property insurance, interior design service, mortgage arrangement", reason: "New property owners need all of these — be the one-stop coordinator" },
      { trigger: "Client sells property", suggest: "Property staging, professional photography, investment consultation for proceeds", reason: "Help with presentation and what to do with the money — builds long-term relationship" },
    ],
    riskWarnings: [
      "Market liquidity risk — property can take months to sell during downturns, tying up cash",
      "Regulatory changes (zoning, tax, foreign ownership laws) can drastically affect property values",
      "Client concentration — if your top developer stops projects, your pipeline collapses",
      "Reputation damage from one bad deal can affect referrals for years in trust-based businesses",
    ],
    marketGaps: [
      "Property management for overseas Pakistanis with local properties is severely underserved",
      "Transparent rental market data — most tenants and landlords negotiate blindly without market comparables",
      "Short-term holiday rental management is nascent but growing rapidly in tourist cities",
      "Commercial lease negotiation consulting for SMEs is almost nonexistent",
    ],
    growthStrategies: [
      {
        title: "Launch Property Management Division",
        steps: ["Identify 20 landlords in your existing network", "Offer 6-month free property management trial", "Handle tenant screening, rent collection, maintenance", "Use Finova for rental invoicing and owner statements"],
        impact: "50 managed properties at 10% fee = guaranteed monthly income without selling anything",
      },
    ],
  },

  transport: {
    label: "Transport / Logistics",
    coreProducts: ["freight transport", "cargo delivery", "vehicle hire", "courier services", "goods movement"],
    suggestedAdditions: [
      { name: "Last-Mile Delivery Contracts", reason: "E-commerce growth means massive demand for last-mile delivery — partner with online stores", potentialRevenue: "high" },
      { name: "Cold Chain / Refrigerated Transport", reason: "Food, pharma, and medical goods require cold transport — premium pricing with very few competitors", potentialRevenue: "high" },
      { name: "Cargo Tracking System", reason: "Real-time tracking offered to customers differentiates you and justifies premium pricing", potentialRevenue: "medium" },
      { name: "Warehousing & Storage", reason: "Many transport clients need short-term storage — add a warehouse and earn rent", potentialRevenue: "high" },
      { name: "Cross-Border / International Freight", reason: "Cross-border trade between Pakistan-UAE-Afghanistan is high volume with good margins", potentialRevenue: "high" },
    ],
    marketTrends: [
      "E-commerce is driving 40% annual growth in last-mile delivery demand in urban Pakistan",
      "GPS tracking and real-time delivery status is now the minimum expectation from corporate clients",
      "Electric vehicles for last-mile delivery are being subsidized and are reducing fuel costs by 60-70%",
      "Aggregator platforms (Truck It In, LoadMatch) are connecting shippers with carriers at scale",
    ],
    seasonalOpportunities: {
      Mar: ["Ramadan stock movement peak — food and FMCG logistics surge", "Pre-summer agricultural transport"],
      May: ["Eid logistics — highest demand week for last-mile in the year", "Agricultural harvest season in some regions"],
      Sep: ["Q4 restocking — retailers and manufacturers ship heavily", "Corporate procurement season"],
      Nov: ["Year-end inventory movement", "Import season before price rises"],
    },
    revenueDiversification: [
      "Rent vehicles during off-peak times to other logistics companies",
      "Offer driver training and certification as a service to other fleet operators",
      "Launch a same-day city delivery service for e-commerce sellers",
      "Add freight forwarding for international shipments (import/export clearance)",
      "Create a transport marketplace where you connect spare vehicle capacity with shippers",
    ],
    competitorEdge: [
      "Guaranteed delivery time with compensation for delays — rare commitment that wins contracts",
      "Dedicated account manager for B2B clients — relationship that price alone cannot replace",
      "Real-time GPS tracking shared with client via WhatsApp — transparency builds trust",
      "Clean, maintained vehicles with driver uniforms — professionalism wins premium clients",
    ],
    crossSellPairs: [
      { trigger: "Client hires freight transport", suggest: "Warehousing and distribution management", reason: "End-to-end supply chain service is worth more than transport alone" },
      { trigger: "Client ships goods regularly", suggest: "Dedicated vehicle contract at monthly rate with priority loading", reason: "Contracts provide predictability — clients pay premium for guaranteed availability" },
    ],
    riskWarnings: [
      "Fuel price volatility is the #1 cost risk — fuel surcharge clauses in all contracts are essential",
      "Vehicle breakdowns cost both direct repair costs and client penalties — maintenance schedule is critical",
      "Driver behavior issues (accidents, theft) can create legal liability and insurance claims",
      "Single-client concentration — if your biggest shipping client switches, fleet goes idle",
    ],
    marketGaps: [
      "Pharmaceutical and food cold-chain transport is massively underserved and commands premium rates",
      "Transparent freight pricing — most transport companies don't publish rates, losing digital-first clients",
      "Female-friendly urban courier service is an entirely untapped segment in many markets",
      "Return logistics (reverse supply chain for e-commerce) is growing but poorly served",
    ],
    growthStrategies: [
      {
        title: "Win E-Commerce Last-Mile Contracts",
        steps: ["Identify 10 active e-commerce sellers in your city via Instagram/Daraz", "Offer free 50-delivery trial with tracking proof", "Show cost vs current courier comparison", "Scale with dedicated dedicated vehicles per seller"],
        impact: "E-commerce volume is growing 40% annually — early position locks in market share",
      },
    ],
  },

  gym: {
    label: "Gym / Fitness Center",
    coreProducts: ["monthly membership", "personal training", "group classes", "supplements", "gym wear"],
    suggestedAdditions: [
      { name: "Online Coaching / Virtual Training", reason: "Same trainer, 5x more clients — no space constraint, reach customers nationwide", potentialRevenue: "high" },
      { name: "Corporate Fitness Packages", reason: "Companies pay for employee wellness — one corporate contract = 20-100 memberships", potentialRevenue: "high" },
      { name: "Nutrition Coaching & Meal Plans", reason: "Fitness clients need both exercise AND diet — add a nutritionist to your team", potentialRevenue: "medium" },
      { name: "Fitness Events & Competitions", reason: "Bodybuilding shows, fitness challenges — ticket revenue + membership spikes", potentialRevenue: "medium" },
      { name: "Gym Merchandise (branded gear)", reason: "Members wearing your brand is free marketing — small investment, ongoing revenue", potentialRevenue: "low" },
    ],
    marketTrends: [
      "Hybrid gym membership (physical + online) is becoming the standard expectation post-COVID",
      "Group fitness classes (CrossFit, Zumba, yoga) are growing faster than traditional gym memberships",
      "Wearable technology integration (fitness trackers) is influencing gym equipment choices",
      "Women-only gym sections or dedicated female hours are showing much higher enrollment rates",
    ],
    seasonalOpportunities: {
      Jan: ["New Year's resolution peak — largest membership month of the year", "Weight loss program promotions"],
      Jun: ["Pre-summer body transformation packages", "Summer shred challenge programs"],
      Sep: ["Post-summer refresh season", "Winter bulk programs for serious athletes"],
      Nov: ["Pre-winter indoor fitness push — people stop running outside", "Year-end challenge competitions"],
    },
    revenueDiversification: [
      "Launch a gym app with workout plans, nutrition tracking, and progress photos",
      "Add a supplement store within the gym — members already trust you for recommendations",
      "Offer physiotherapy or sports injury rehabilitation in partnership with a physio",
      "Rent gym space for yoga, dance, or martial arts classes in off-peak hours",
      "Create an online fitness challenge community with subscription fee",
    ],
    competitorEdge: [
      "30-day money-back guarantee on memberships — removes signup barrier, builds trust",
      "Free initial fitness assessment with every new member — personalized attention from day 1",
      "24-hour access for premium members — rare and highly valued by working professionals",
      "Member progress tracking and monthly check-in with trainer — retention through accountability",
    ],
    crossSellPairs: [
      { trigger: "Member joins gym", suggest: "Personal training package + nutrition plan for first month", reason: "New members are most motivated and most willing to invest in results" },
      { trigger: "Member hits 3-month mark", suggest: "Upgrade to premium tier with additional services", reason: "Members who stay 3 months are highly likely to renew — upsell before they plateau" },
    ],
    riskWarnings: [
      "Member retention is the biggest risk — average gym loses 30-40% of members annually",
      "Equipment breakdowns are visible failures that damage member trust immediately",
      "January-February surge then March crash is universal — plan cash flow accordingly",
      "Personal trainer poaching — trainers who build client relationships can take clients when they leave",
    ],
    marketGaps: [
      "Female-only gym facilities are scarce in most markets despite proven demand",
      "Senior citizen fitness programs are almost nonexistent but the segment is growing",
      "Rehabilitation and sports medicine partnership with gyms is virtually nonexistent",
      "Affordable group classes alternative to expensive personal training fills a major price gap",
    ],
    growthStrategies: [
      {
        title: "Launch Corporate Wellness Program",
        steps: ["Identify 10 offices with 30+ employees within 2km", "Offer discounted group membership at 30% off individual rate", "Provide monthly fitness session at their office (free)", "Bill corporate monthly via Finova"],
        impact: "1 corporate deal = 20-100 memberships — 10x more efficient than individual sales",
      },
    ],
  },

  ecommerce: {
    label: "E-Commerce / Online Store",
    coreProducts: ["online products", "dropshipping", "digital goods", "fashion", "electronics", "home goods"],
    suggestedAdditions: [
      { name: "Private Label Products", reason: "Branded products earn 40-100% higher margin than reselling — your brand becomes an asset", potentialRevenue: "high" },
      { name: "Subscription Box Service", reason: "Monthly curated boxes create predictable recurring revenue — churn is lower than one-time buyers", potentialRevenue: "high" },
      { name: "Affiliate/Influencer Program", reason: "Let influencers sell for you at commission — zero upfront marketing cost, performance-based", potentialRevenue: "high" },
      { name: "Live Shopping / Instagram Live Sales", reason: "Live selling converts 10x better than static product listings — growing 50% annually", potentialRevenue: "medium" },
      { name: "Product Bundling", reason: "Bundles increase average order value by 25-40% with only minor packaging cost increase", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Social commerce (Instagram Shopping, TikTok Shop) is now driving more sales than traditional e-commerce",
      "Video product demonstrations dramatically increase conversion rates vs photos alone",
      "Same-day and next-day delivery is becoming the expectation even from smaller stores",
      "Customer reviews and user-generated content drive 85% of purchase decisions online",
    ],
    seasonalOpportunities: {
      Jan: ["New Year new purchases — fitness, organization, self-improvement products peak", "Winter sale clearance"],
      Feb: ["Valentine's Day — gifting is the highest conversion period for e-commerce", "Couple and romance-themed products"],
      Mar: ["Ramadan shopping surge — modest fashion, home décor, gifts", "Spring launch"],
      May: ["Eid ul Fitr — massive gifting and fashion spending", "Mother's Day"],
      Jun: ["Mid-year sale events", "Summer products peak"],
      Nov: ["Black Friday / Singles Day — biggest e-commerce events globally", "Build inventory 3 months in advance"],
      Dec: ["Christmas and New Year gifting", "Year-end clearance"],
    },
    revenueDiversification: [
      "Launch on multiple platforms simultaneously: website, Daraz, Amazon, Instagram, Facebook Marketplace",
      "Add a B2B wholesale channel for resellers to buy your products in bulk",
      "Create a membership with free shipping and early access — reduces shipping cost pressure from competitors",
      "Offer product customization (name engraving, custom prints) at premium price",
      "Sell internationally using Pakistan Post international or courier partnerships for neighboring countries",
    ],
    competitorEdge: [
      "Transparent return policy with free return pickup — the #1 conversion barrier is fear of return hassle",
      "Personal thank-you notes and packaging that creates an 'unboxing experience' — drives social media sharing",
      "Post-purchase WhatsApp follow-up: delivery confirmation, review request, next product recommendation",
      "Exclusive products not available anywhere else — scarcity and uniqueness drives impulse purchases",
    ],
    crossSellPairs: [
      { trigger: "Customer buys product", suggest: "Complementary accessory, protective case, maintenance product at checkout", reason: "Cross-sell at checkout adds 15-30% to average order value with zero acquisition cost" },
      { trigger: "Customer has purchased 3+ times", suggest: "VIP membership, exclusive early access, bundle deal", reason: "Loyal customers spend 5x more than new customers — reward and retain them" },
    ],
    riskWarnings: [
      "Platform dependency — if Daraz/Instagram changes algorithm or fees, your business is affected overnight",
      "Cash flow timing — you receive payment before you ship, but returns can create negative balances",
      "Logistics partner failures during peak season lose customers permanently",
      "Product authenticity complaints and counterfeit reports can shut down accounts on major platforms",
    ],
    marketGaps: [
      "Pakistani e-commerce customers have low trust in unknown brands — build social proof aggressively",
      "Cash on delivery still dominates (70%+ of orders) — optimize COD conversion and reduce returns",
      "Urdu language product descriptions are underused but dramatically improve conversion for non-English buyers",
      "Product video content in local language is rare but converts 3-5x better than English-only stores",
    ],
    growthStrategies: [
      {
        title: "Launch Private Label Brand",
        steps: ["Identify your top 3 best-selling products from competitors' data", "Source direct from manufacturer with your branding", "Create compelling brand story and packaging", "Launch exclusively on your store and Instagram"],
        impact: "Private label products earn 50-100% higher margins than reselling — your brand is an asset that compounds",
      },
    ],
  },

  salon: {
    label: "Salon / Beauty",
    coreProducts: ["haircut", "hair coloring", "facial", "manicure", "pedicure", "threading", "bridal makeup"],
    suggestedAdditions: [
      { name: "Bridal Full-Package Contracts", reason: "Bridal packages are 20-50x the value of a regular visit — own the wedding season", potentialRevenue: "high" },
      { name: "Retail Beauty Products", reason: "Sell what you use professionally — clients trust your recommendations, margin is 40-60%", potentialRevenue: "medium" },
      { name: "Membership / Loyalty Program", reason: "Monthly membership for regular services — predictable recurring income, reduced customer churn", potentialRevenue: "high" },
      { name: "Home Service / Mobile Salon", reason: "Visit clients at home for premium — especially popular for elderly and post-surgery clients", potentialRevenue: "medium" },
      { name: "Beauty Training Academy", reason: "Teach courses in makeup, hair, aesthetics — training income is 100% margin on existing expertise", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Online booking apps have become the norm — salons without online booking lose significant walk-ins",
      "Male grooming is the fastest growing salon segment — barbering and skin care for men is underserved",
      "Organic and chemical-free treatments command 30-50% premium and attract health-conscious clients",
      "Instagram and TikTok beauty content drives discovery — before/after photos are your most effective marketing",
    ],
    seasonalOpportunities: {
      Feb: ["Valentine's Day beauty packages", "Pre-wedding season prep for brides"],
      Apr: ["Eid beauty packages — highest demand days of the year", "Bridal booking season begins"],
      May: ["Eid ul Fitr — walk-in surge, extend hours", "Summer beauty packages"],
      Jun: ["Wedding season peak — fully book bridal services in advance", "Prom and graduation season"],
      Oct: ["Wedding season second peak", "Pre-winter hair care treatments"],
      Dec: ["Party season beauty demand", "New Year transformation packages"],
    },
    revenueDiversification: [
      "Launch a beauty subscription: monthly facial, threading, or nail package at discounted rate",
      "Create a bridal referral network with wedding photographers, venues, caterers",
      "Offer corporate makeup sessions for conferences and photo shoots",
      "Sell your own branded skincare line developed with a cosmetics manufacturer",
      "Partner with Instagram influencers for product placement and commission sharing",
    ],
    competitorEdge: [
      "Online booking with instant confirmation — most salons still require phone calls",
      "Reminder messages 24 hours before appointment — reduces no-shows and shows care",
      "Before and after photos with client consent — social proof that drives new bookings",
      "Strict hygiene certification and display — increasingly important differentiator",
    ],
    crossSellPairs: [
      { trigger: "Client books haircut", suggest: "Deep conditioning treatment, scalp massage, hair mask add-on", reason: "Hair care add-ons have 80%+ margin and take only 15 extra minutes" },
      { trigger: "Bridal client books makeup", suggest: "Full bridal package: mehndi, facial prep, family makeup, trial session", reason: "Bridal clients have highest willingness to pay and need comprehensive service" },
    ],
    riskWarnings: [
      "Stylist dependency — if your top stylist leaves, they take their client base with them",
      "No-show rate above 15% kills profitability — implement a booking deposit policy",
      "Chemical product risks — allergic reactions are a liability without proper patch testing protocols",
      "Hygiene incidents can go viral on social media and permanently damage reputation",
    ],
    marketGaps: [
      "Male grooming salons are severely underserved relative to demand in South Asia",
      "Organic and halal beauty treatments are demanded but rarely offered",
      "Senior citizen discounted beauty days — underserved and loyal customer segment",
      "Online beauty consultations and product recommendations before in-person visits",
    ],
    growthStrategies: [
      {
        title: "Launch Bridal Package Dominance Strategy",
        steps: ["Create 5 bridal packages at different price points", "Partner with 3 wedding venues and 2 photographers for referrals", "Showcase 10 best bridal transformations on Instagram", "Book bridal consultations 6 months ahead"],
        impact: "1 full bridal package = 20-30 regular haircut visits in revenue — transform your peak season",
      },
    ],
  },

  agriculture: {
    label: "Agriculture / Farming",
    coreProducts: ["crops", "vegetables", "fruits", "livestock", "poultry", "dairy", "seeds", "fertilizer"],
    suggestedAdditions: [
      { name: "Direct-to-Consumer Organic Box", reason: "Cut out middlemen — deliver weekly fresh boxes directly to households at 40-60% premium", potentialRevenue: "high" },
      { name: "Agri-Processing (value-added products)", reason: "Process raw produce into: juices, dried fruits, pickles, preserves — 3-5x markup", potentialRevenue: "high" },
      { name: "Farm-to-Restaurant Supply Contracts", reason: "Restaurants pay premium for consistent local fresh supply with guaranteed quality", potentialRevenue: "high" },
      { name: "Agri-Tourism / Farm Visits", reason: "Schools, urban families pay to visit farms — income with no additional production cost", potentialRevenue: "medium" },
      { name: "Seed & Fertilizer Supply to Neighbors", reason: "If you buy in bulk, resell surplus to neighboring farmers — trading margin on same procurement", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Organic and pesticide-free produce commands 30-100% premium in urban markets",
      "Direct-to-consumer farm subscriptions are growing in tier-1 cities",
      "Precision agriculture (sensors, drones, smart irrigation) is reducing waste by 30-40%",
      "Export markets for Pakistani mangoes, rice, and citrus are expanding significantly",
    ],
    seasonalOpportunities: {
      Mar: ["Spring crop planting season — seed and fertilizer demand peaks", "Wheat harvest begins in Punjab"],
      May: ["Mango season begins — export and domestic premium sales", "Summer vegetables peak"],
      Jul: ["Monsoon crops — rice, maize, cotton", "Irrigation management critical"],
      Nov: ["Winter crop planting — wheat, vegetables", "Post-monsoon harvest and storage"],
    },
    revenueDiversification: [
      "Add value-added processing: dried fruits, preserved foods, cold-pressed juice",
      "Lease unused land to other farmers or agri-entrepreneurs at monthly rental",
      "Establish a farm store selling directly to consumers at retail prices",
      "Apply for organic certification — opens export and premium domestic market",
      "Partner with a logistics company for direct delivery to urban consumers",
    ],
    competitorEdge: [
      "Traceability — show customers exactly which farm, which field their food came from",
      "WhatsApp subscription service: 'Weekly fresh box delivered to your door'",
      "Organic certification displayed prominently — rare and valued by urban consumers",
      "Contract farming agreements: pre-sell harvest at fixed price to reduce uncertainty",
    ],
    crossSellPairs: [
      { trigger: "Farm produces dairy", suggest: "Cheese, yogurt, butter made on-farm for premium pricing", reason: "Processed dairy earns 3-5x more per liter than raw milk" },
      { trigger: "Farm grows wheat", suggest: "On-farm flour milling — sell atta directly to consumers at 50% markup over wheat price", reason: "Value addition near the farm dramatically improves margins" },
    ],
    riskWarnings: [
      "Weather dependency — drought, floods, or unseasonable cold can destroy an entire season",
      "Price volatility — commodity prices can drop 30-50% during glut seasons",
      "Storage losses — post-harvest losses average 30-40% in Pakistan due to inadequate cold storage",
      "Input cost (fertilizer, pesticides, fuel) spikes reduce margins unpredictably",
    ],
    marketGaps: [
      "Cold storage and preservation for farm produce is critically underserved in most areas",
      "Direct consumer channels that bypass multiple middlemen are growing but still nascent",
      "Organic certification is rare — most farmers qualify but haven't pursued certification",
      "Agricultural insurance uptake is very low despite subsidized government programs",
    ],
    growthStrategies: [
      {
        title: "Launch Farm Box Subscription",
        steps: ["Package 5kg weekly fresh vegetable box", "Price at retail + delivery fee (20-30% below supermarket)", "Market in WhatsApp groups of housing societies within 20km", "Use Finova for recurring weekly invoicing"],
        impact: "50 weekly subscribers = guaranteed predictable revenue with premium pricing over wholesale",
      },
    ],
  },

  it: {
    label: "IT / Technology Services",
    coreProducts: ["software development", "IT support", "web design", "networking", "cloud services", "cyber security"],
    suggestedAdditions: [
      { name: "Managed IT Services (MSP) Contracts", reason: "Monthly retainer for all-you-can-support IT — clients love predictable IT costs", potentialRevenue: "high" },
      { name: "SaaS Product Development", reason: "Build your own product once, sell repeatedly — 10x the revenue of services with same team", potentialRevenue: "high" },
      { name: "Cybersecurity Audit Service", reason: "Every company needs this but few offer it — high margin, growing demand post-data breaches", potentialRevenue: "high" },
      { name: "IT Training & Certification Programs", reason: "Train employees of your clients — deepens relationship and adds training revenue", potentialRevenue: "medium" },
      { name: "Cloud Migration Consulting", reason: "Thousands of SMEs are moving to cloud — be the trusted guide with ongoing management contract", potentialRevenue: "high" },
    ],
    marketTrends: [
      "Every business needs IT support — SME IT services market is growing 25% annually in Pakistan",
      "Cybersecurity threats have created massive demand for security audits and training",
      "Cloud adoption is accelerating — AWS, Google Cloud, Azure migration projects are increasing",
      "Artificial Intelligence integration into business software is the next major service category",
    ],
    seasonalOpportunities: {
      Jan: ["New year IT budget allocation — companies plan annual IT investments", "New year website and system upgrade projects"],
      Apr: ["Financial year-end for many companies — budget spend on IT projects", "Ramadan usually slows projects — plan staff accordingly"],
      Sep: ["Q4 corporate IT project rush — budgets must be spent before year-end", "School year IT setup season"],
      Nov: ["Year-end system upgrades before January", "Holiday shopping surge — e-commerce clients need performance work"],
    },
    revenueDiversification: [
      "Launch a subscription IT support package for SMEs — predictable monthly income",
      "Develop and sell a niche SaaS product (accounting plugin, HR tool, inventory app) for a specific industry",
      "Offer digital marketing services (SEO, paid ads, social media) as a cross-sell to web clients",
      "Create a YouTube channel or blog that generates leads — content marketing compound interest",
      "Partner with hardware vendors for referral income on hardware sales to your clients",
    ],
    competitorEdge: [
      "4-hour response time guarantee for critical IT issues — most IT companies respond in days",
      "Plain English documentation — clients are tired of jargon-filled reports they can't understand",
      "Quarterly business review with each client — shows value delivered, uncovers new needs proactively",
      "Fixed-price project quotes with no scope creep surprises — builds trust that earns referrals",
    ],
    crossSellPairs: [
      { trigger: "Client has website developed", suggest: "Monthly maintenance, SEO, hosting, and security monitoring package", reason: "Every website needs ongoing care — capture this recurring revenue immediately after project delivery" },
      { trigger: "Client uses IT support", suggest: "Cybersecurity audit and employee security training", reason: "IT support clients are the easiest to upsell on security — they already trust you" },
    ],
    riskWarnings: [
      "Single-client concentration — if your largest client moves IT in-house, you lose significant revenue",
      "Technology obsolescence — skills that are valuable today (Flash, on-premise software) can become worthless",
      "Key person risk — if the lead developer leaves, project delivery is at risk",
      "Scope creep on fixed-price contracts can make projects unprofitable — change order processes are essential",
    ],
    marketGaps: [
      "IT support for micro-businesses (under 10 employees) is almost nonexistent but the segment is huge",
      "Affordable cybersecurity for SMEs is severely underserved — they are the most targeted",
      "Industry-specific software for sectors like agriculture, construction, and healthcare is lacking",
      "IT support with Urdu language service is almost nonexistent — massive underserved segment",
    ],
    growthStrategies: [
      {
        title: "Launch Managed IT Services (MSP)",
        steps: ["Convert 5 one-time clients to monthly retainer contracts", "Define service tiers: Basic (email/device support), Pro (+server monitoring), Enterprise (+cybersecurity)", "Price at 3-8% of company IT asset value monthly", "Use Finova for automated monthly invoicing"],
        impact: "10 MSP clients at PKR 25,000/month = PKR 250,000 guaranteed monthly with minimal incremental cost",
      },
    ],
  },

  wholesale: {
    label: "Wholesale / Distribution",
    coreProducts: ["bulk goods", "FMCG", "food items", "beverages", "household products", "industrial supplies"],
    suggestedAdditions: [
      { name: "Private Label Products", reason: "Distribute your own brand — earn full margin instead of distributor margin", potentialRevenue: "high" },
      { name: "Direct Retail Delivery Service", reason: "Cut out sub-distributors — deliver to retailers yourself for higher margin", potentialRevenue: "high" },
      { name: "Category Management for Retailers", reason: "Help retailers optimize their shelf space and ordering — become a strategic partner, not just a supplier", potentialRevenue: "medium" },
      { name: "Digital Ordering Platform", reason: "Let retailers order 24/7 via app — reduces order processing cost and increases order frequency", potentialRevenue: "medium" },
    ],
    marketTrends: [
      "Digital order management is replacing manual order taking — distributors with apps grow 30% faster",
      "Modern trade (supermarkets, chains) is growing but traditional kiryana stores still dominate in Pakistan",
      "Cold chain logistics demand is growing 40% annually for dairy, pharma, and frozen foods",
      "Brand consolidation means fewer but stronger brands — distributors must offer multiple categories",
    ],
    seasonalOpportunities: {
      Mar: ["Ramadan stock loading — FMCG demand surges 3-5x", "Pre-Eid rush begins"],
      May: ["Eid ul Fitr peak shipments", "Summer beverage stocking"],
      Sep: ["Q4 inventory build — retailer restocking season", "Year-end promotions"],
      Nov: ["Year-end clearance push", "Promotional season for brands"],
    },
    revenueDiversification: [
      "Add cold storage as a service for brands that need refrigerated distribution",
      "Offer market research reports on retail penetration to your brand principals",
      "Launch a cash-and-carry concept for small retailers who want to self-collect",
      "Add financial services: small working capital loans to retailers via a financing partner",
      "Export to neighboring markets as a regional distributor for international brands",
    ],
    competitorEdge: [
      "Same-day delivery to retailers who order before 10am — most wholesalers deliver in 2-3 days",
      "Digital payment options and instant invoicing — reduces cash handling risk for retailers",
      "Credit terms tailored to retailer seasonality — builds loyalty that price alone doesn't buy",
      "Retail display and merchandising support — go beyond supply to help retailers sell more",
    ],
    crossSellPairs: [
      { trigger: "Retailer orders FMCG", suggest: "Display stand, promotional materials, and bundled offer pricing", reason: "Helping retailers sell more means they order more from you — virtuous cycle" },
      { trigger: "Retailer buys beverages", suggest: "Snacks and confectionery complementary to beverage category", reason: "Category adjacency — if they run out of one, they prefer getting both from same supplier" },
    ],
    riskWarnings: [
      "Receivables from retailers is the #1 risk — small retailers frequently default or pay late",
      "Brand concentration — if your primary brand switches distributor, your business is at risk",
      "Commodity price volatility affects margins when you have fixed-price commitments to retailers",
      "Counterfeit product infiltration of your supply chain destroys brand relationships and creates liability",
    ],
    marketGaps: [
      "Digital ordering for traditional trade (kiryana stores) is almost nonexistent — huge opportunity",
      "Returns management and damaged goods process is almost always informal and poorly documented",
      "Market intelligence reporting to brand principals is a value-added service almost no distributor offers",
      "Cold chain distribution for dairy and pharma is severely underserved in tier-2 cities",
    ],
    growthStrategies: [
      {
        title: "Launch Retailer Digital Ordering",
        steps: ["Build a simple WhatsApp or web ordering system", "Train 20 top retailers to order digitally", "Offer 1% discount for digital orders (saves you order-taking cost)", "Use Finova for automated order and invoice processing"],
        impact: "Reduces order processing cost by 60%, increases order frequency by 30%",
      },
    ],
  },

};

// Default profile for unknown business types
const DEFAULT_PROFILE: BusinessTypeProfile = {
  label: "Business",
  coreProducts: ["core service", "main product"],
  suggestedAdditions: [
    { name: "Loyalty/Retention Program", reason: "Repeat customers cost 5x less to keep than acquiring new ones — protect what you have", potentialRevenue: "high" },
    { name: "Referral Program", reason: "Your existing customers know people like them — turn them into your sales team", potentialRevenue: "medium" },
    { name: "Digital Presence Expansion", reason: "Businesses with strong online presence grow 2x faster — website, social media, Google listing", potentialRevenue: "medium" },
    { name: "Premium Service Tier", reason: "10-20% of customers will pay 2x for a better experience — price anchor your offerings", potentialRevenue: "high" },
  ],
  marketTrends: [
    "Digital transformation is affecting every industry — businesses without digital tools are falling behind",
    "Customer experience has become the primary competitive differentiator over price",
    "Subscription and recurring revenue models are commanding higher valuations and more stability",
    "Data-driven decision making separates high-growth businesses from those that stagnate",
  ],
  seasonalOpportunities: {
    Mar: ["Pre-Ramadan preparation and promotions"], Apr: ["Ramadan and Eid campaigns — peak consumer spending"],
    May: ["Post-Eid activities"], Jun: ["Mid-year review and planning"],
    Sep: ["Q4 ramp-up and corporate buying season"], Nov: ["Year-end promotions"],
    Dec: ["Holiday gifting and year-end clearance"],
    Jan: ["New year campaigns"], Feb: ["Valentine's Day promotions"],
    Jul: ["Mid-year review"], Aug: ["Independence Day campaigns"], Oct: ["Pre-winter campaigns"],
  },
  revenueDiversification: [
    "Add a recurring revenue stream (subscription, membership, retainer)",
    "Create a premium tier of your existing service or product",
    "Launch an affiliate or referral program to grow without advertising spend",
    "Explore adjacent products or services your existing customers need",
    "Add a digital/online channel to complement your physical business",
  ],
  competitorEdge: [
    "Faster response time than competitors — be the first to reply to inquiries",
    "Transparent pricing with no hidden fees — builds immediate trust",
    "Post-sale follow-up and customer success — most competitors disappear after the sale",
    "Invest in staff training — knowledgeable staff create confident customers who buy more",
  ],
  crossSellPairs: [
    { trigger: "Customer makes first purchase", suggest: "Complementary product or extended service", reason: "First-time buyers are most open to learning about your full range" },
    { trigger: "Customer is repeat buyer", suggest: "Loyalty reward, volume discount, or premium upgrade", reason: "Reward loyalty before a competitor does" },
  ],
  riskWarnings: [
    "Customer concentration — if top 3 customers leave, can the business survive?",
    "Single revenue stream — any disruption to your main product/service is existential",
    "No digital backup — if your physical location or main channel is disrupted, you have no alternative",
    "Cash flow timing mismatch — expenses before revenue can create crises even in profitable businesses",
  ],
  marketGaps: [
    "Most businesses don't follow up consistently after the sale — huge opportunity for differentiation",
    "Customer education about your products/services is underinvested — informed customers buy more",
    "Local community presence and reputation is underutilized as a competitive advantage",
    "Bundling complementary products/services into packages increases value and simplifies purchase decisions",
  ],
  growthStrategies: [
    {
      title: "Build Customer Retention System",
      steps: ["Use Finova to identify customers who haven't bought in 60+ days", "Create a win-back offer for lapsed customers", "Set up monthly check-in with top 20 customers", "Implement a post-purchase follow-up sequence"],
      impact: "Increasing retention by just 5% increases profits by 25-95% (Harvard Business Review)",
    },
  ],
};

// ─── Core Functions ──────────────────────────────────────────────────────────

function normalizeBusinessType(raw: string): string {
  if (!raw) return "trading";
  return raw.toLowerCase().replace(/[\s_]/g, "-");
}

function getProfile(businessType: string): BusinessTypeProfile {
  const normalized = normalizeBusinessType(businessType);
  return BUSINESS_PROFILES[normalized] || BUSINESS_PROFILES[businessType] || DEFAULT_PROFILE;
}

function getCurrentAndNextMonths(count = 3): string[] {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(MONTHS[(now.getMonth() + i) % 12]);
  }
  return result;
}

function fuzzyMatchItems(currentItems: string[], referenceList: string[]): string[] {
  const currentLower = currentItems.map(i => i.toLowerCase());
  return referenceList.filter(ref => {
    const refLower = ref.toLowerCase().split(/[\s,/]+/)[0];
    return !currentLower.some(curr => curr.includes(refLower) || refLower.includes(curr));
  });
}

function calculateDiversificationScore(
  ctx: FinancialContext,
  profile: BusinessTypeProfile
): number {
  let score = 50;
  const currentItems = ctx.topProducts.map(p => p.name);

  // Product coverage
  const covered = profile.coreProducts.filter(cp => currentItems.some(ci => ci.toLowerCase().includes(cp.split(" ")[0].toLowerCase())));
  score += Math.min(25, Math.round((covered.length / Math.max(profile.coreProducts.length, 1)) * 25));

  // Revenue distribution
  if (ctx.topProducts.length > 0) {
    const totalRev = ctx.topProducts.reduce((s, p) => s + p.revenue, 0);
    const topRev = ctx.topProducts[0]?.revenue || 0;
    const concentration = totalRev > 0 ? topRev / totalRev : 1;
    score += concentration < 0.4 ? 15 : concentration < 0.6 ? 8 : 0;
  }

  // Customer diversification
  if (ctx.topCustomers.length >= 5) score += 10;
  else if (ctx.topCustomers.length >= 3) score += 5;

  return Math.min(100, Math.max(10, Math.round(score)));
}

// ─── Exported Builder Functions ──────────────────────────────────────────────

export function buildMarketIntelligence(ctx: FinancialContext): MarketIntelligenceResult {
  const profile = getProfile(ctx.company.businessType);
  const currentProducts = ctx.topProducts.map(p => p.name);
  const upcomingMonths = getCurrentAndNextMonths(3);

  const missingCore = fuzzyMatchItems(currentProducts, profile.coreProducts);
  const suggestedNew = profile.suggestedAdditions.filter(s => {
    const nameWords = s.name.toLowerCase().split(/[\s,/]+/);
    return !currentProducts.some(cp => nameWords.some(w => cp.toLowerCase().includes(w)));
  });

  const score = calculateDiversificationScore(ctx, profile);

  const summary = currentProducts.length > 0
    ? `${ctx.company.name} currently sells ${currentProducts.slice(0, 3).join(", ")}${currentProducts.length > 3 ? ` and ${currentProducts.length - 3} more` : ""} in the ${profile.label} space. There are ${suggestedNew.length} high-potential additions that similar businesses use to grow revenue by 20-40%.`
    : `${ctx.company.name} is a ${profile.label} business. Based on industry patterns, there are ${suggestedNew.length} products and services that top businesses in this space are using to diversify revenue and strengthen margins.`;

  return {
    businessType: ctx.company.businessType,
    businessLabel: profile.label,
    currentProducts,
    suggestedNewProducts: suggestedNew.slice(0, 8),
    trendsThisIndustry: profile.marketTrends,
    seasonalOpportunities: upcomingMonths.map(month => ({
      month,
      opportunities: profile.seasonalOpportunities[month] || ["Plan inventory and staffing for the upcoming period"],
    })),
    revenueDiversification: profile.revenueDiversification,
    competitorEdge: profile.competitorEdge,
    score,
    summary,
  };
}

export function buildBusinessAdvisor(ctx: FinancialContext): BusinessAdvisorResult {
  const profile = getProfile(ctx.company.businessType);
  const currentProducts = ctx.topProducts.map(p => p.name);

  // Build growth plan from financial signals + industry strategies
  const growthPlan: BusinessAdvisorResult["growthPlan"] = [];

  // Financial-signal driven items first
  if (ctx.receivables.overdue > 0) {
    growthPlan.push({
      title: "Recover Overdue Payments Now",
      priority: "urgent",
      steps: [
        `Contact all ${ctx.receivables.overdueCount} customers with overdue invoices today`,
        "Offer 2% early payment discount to incentivize immediate settlement",
        "Set up automated payment reminders via WhatsApp using Finova",
        "For invoices over 60 days, escalate to formal demand notice",
      ],
      impact: `Recover ${ctx.company.currency} ${Math.round(ctx.receivables.overdue).toLocaleString()} that is currently stuck — this is cash your business has earned but not collected`,
    });
  }

  if (ctx.profit.thisMonth < 0) {
    growthPlan.push({
      title: "Stop the Monthly Loss — Immediate Cost Review",
      priority: "urgent",
      steps: [
        "Identify your top 3 expense categories and find 10% reduction in each",
        "Pause all non-essential spending for the next 30 days",
        "Review your 5 lowest-margin products and consider price increases",
        "Renegotiate supplier payment terms to reduce monthly cash drain",
      ],
      impact: "Stopping a monthly loss is the highest priority action — every month of delay compounds the problem",
    });
  }

  if (ctx.inventory.lowStockItems > 0) {
    growthPlan.push({
      title: "Fix Stockout Risk Before It Costs Sales",
      priority: "high",
      steps: [
        `Place reorder for ${ctx.inventory.lowStockItems} low-stock items: ${ctx.inventory.lowStockNames.slice(0, 3).join(", ")}`,
        "Set minimum stock alerts in Finova for all items",
        "Create a reorder schedule based on lead time from each supplier",
        "Consider consignment stock arrangement with key suppliers for fast-moving items",
      ],
      impact: "Stockouts can cost 2-5x the value of the lost sale in lost customer loyalty",
    });
  }

  if (ctx.expenses.change > 15) {
    growthPlan.push({
      title: "Investigate Expense Spike",
      priority: "high",
      steps: [
        `Review all expense vouchers from this month — expenses are up ${ctx.expenses.change}% vs last month`,
        "Category-by-category comparison to find the specific cost driver",
        "Separate one-time costs from recurring — only recurring ones need fixing",
        "Set monthly expense budget targets by category in Finova",
      ],
      impact: "Uncontrolled expenses are the silent profit killer — understanding what's driving them is the first step",
    });
  }

  // Add industry-specific growth strategies
  profile.growthStrategies.forEach(strategy => {
    if (growthPlan.length < 5) {
      growthPlan.push({ ...strategy, priority: "medium" });
    }
  });

  // Revenue diversification as final item
  if (growthPlan.length < 5 && profile.revenueDiversification.length > 0) {
    growthPlan.push({
      title: "Diversify Revenue Streams",
      priority: "medium",
      steps: profile.revenueDiversification.slice(0, 4),
      impact: "Single-revenue-stream businesses are fragile — diversification builds resilience and compounds growth",
    });
  }

  // Risk warnings: combine financial signals + industry-specific
  const riskWarnings: BusinessAdvisorResult["riskWarnings"] = [];

  if (ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3 && ctx.revenue.thisMonth > 0) {
    riskWarnings.push({
      title: "High Overdue Receivables Risk",
      severity: "critical",
      description: `${Math.round((ctx.receivables.overdue / ctx.revenue.thisMonth) * 100)}% of monthly revenue is stuck in overdue invoices`,
      mitigation: "Implement strict credit terms and weekly receivables follow-up — use Finova Ageing Report",
    });
  }

  profile.riskWarnings.slice(0, 3).forEach(warning => {
    riskWarnings.push({
      title: warning.split("—")[0].trim(),
      severity: "warning",
      description: warning,
      mitigation: "Monitor this risk regularly and build mitigation into your operations",
    });
  });

  // Cross-sell suggestions based on current products
  const crossSellUpsell = profile.crossSellPairs
    .filter(pair => {
      const triggerWords = pair.trigger.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      return currentProducts.some(cp => triggerWords.some(w => cp.toLowerCase().includes(w)));
    })
    .concat(profile.crossSellPairs.slice(0, 2))
    .filter((item, index, arr) => arr.findIndex(i => i.trigger === item.trigger) === index)
    .slice(0, 5);

  // Quick wins based on current state
  const quickWins: string[] = [];
  if (ctx.receivables.overdue > 0) quickWins.push(`Call overdue customers today — collect ${ctx.company.currency} ${Math.round(ctx.receivables.overdue / 1000)}K that's already yours`);
  if (ctx.inventory.lowStockItems > 0) quickWins.push(`Place reorder for ${ctx.inventory.lowStockNames[0] || "low stock items"} before stockout happens`);
  if (ctx.topCustomers.length > 0) quickWins.push(`Call ${ctx.topCustomers[0].name} — your top customer — to ask about upcoming needs`);
  if (quickWins.length < 3) quickWins.push("Set up WhatsApp Business catalog to enable digital ordering from customers");
  if (quickWins.length < 3) quickWins.push("Review pricing on your top 3 selling products — a 5% price increase often has zero sales impact");

  const overallScore = Math.max(30, Math.min(95, 70
    - (ctx.profit.thisMonth < 0 ? 20 : 0)
    - (ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3 ? 15 : 0)
    - (ctx.expenses.change > 20 ? 10 : 0)
    + (ctx.topCustomers.length >= 5 ? 10 : 0)
    + (ctx.topProducts.length >= 5 ? 5 : 0)
  ));

  return {
    businessType: ctx.company.businessType,
    growthPlan: growthPlan.slice(0, 5),
    marketGaps: profile.marketGaps,
    crossSellUpsell: crossSellUpsell.slice(0, 4),
    riskWarnings: riskWarnings.slice(0, 5),
    quickWins: quickWins.slice(0, 3),
    score: {
      overall: overallScore,
      label: overallScore >= 75 ? "Growth Ready" : overallScore >= 55 ? "Needs Attention" : "Action Required",
    },
  };
}

// ─── Local Reply Text Generators (for finovaAI.ts fallback) ─────────────────

export function getMarketIntelligenceLocalReply(ctx: FinancialContext): string {
  const result = buildMarketIntelligence(ctx);
  const lines: string[] = [
    `Market Intelligence — ${result.businessLabel}`,
    ``,
    result.summary,
    ``,
    `Top opportunities to add:`,
    ...result.suggestedNewProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} — ${p.reason}`),
    ``,
    `Industry trends you should know:`,
    ...result.trendsThisIndustry.slice(0, 3).map(t => `• ${t}`),
    ``,
    `This month's seasonal opportunity:`,
    ...((result.seasonalOpportunities[0]?.opportunities || []).slice(0, 2).map(o => `• ${o}`)),
    ``,
    `Revenue diversification ideas:`,
    ...result.revenueDiversification.slice(0, 3).map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.join("\n");
}

export function getBusinessAdvisorLocalReply(ctx: FinancialContext): string {
  const result = buildBusinessAdvisor(ctx);
  const lines: string[] = [
    `Business Advisor — ${result.score.label} (${result.score.overall}/100)`,
    ``,
    `Immediate action (do this week):`,
    ...result.quickWins.map((w, i) => `${i + 1}. ${w}`),
    ``,
    `Growth plan priorities:`,
    ...result.growthPlan.slice(0, 3).map(g => `• [${g.priority.toUpperCase()}] ${g.title}: ${g.impact}`),
    ``,
    `Market gaps to explore:`,
    ...result.marketGaps.slice(0, 3).map((g, i) => `${i + 1}. ${g}`),
    ``,
    `Cross-sell opportunities:`,
    ...result.crossSellUpsell.slice(0, 2).map(cs => `• ${cs.trigger} → ${cs.suggest}`),
  ];
  return lines.join("\n");
}
