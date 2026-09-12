/**
 * What each country calls its first-level divisions, and what they are.
 *
 * The company profile asked for a "State / Province" and gave everyone a plain
 * text box — except Pakistan, which got the FBR province dropdown. On a global
 * ERP that reads as an unfinished form: a company in Dubai types "Dubai" into a
 * box labelled State, a Japanese company types a prefecture nobody validates,
 * and every one of them is stored with whatever capitalisation the operator
 * used that day. The same three problems the FBR list was written to solve —
 * see lib/pkProvinces.ts — just without a gateway to reject them.
 *
 * Two things travel together here, because a dropdown with the wrong heading is
 * its own kind of wrong: the list, and the word that country actually uses.
 * The UAE has emirates, Japan prefectures, Poland voivodeships, Egypt
 * governorates, Switzerland cantons. Showing "State / Province" above a list of
 * emirates is the sort of detail that tells a customer the software was not
 * built for them.
 *
 * ── Pakistan is not defined here ────────────────────────────────────────────
 * PK reads straight from PK_PROVINCES. That list is matched against FBR's own
 * on every filed invoice, so it has exactly one owner; a second copy here would
 * drift and the drift would only surface as a rejected return.
 *
 * ── Coverage is deliberately partial ────────────────────────────────────────
 * A country with no entry falls back to a free-text box, which is what every
 * country except Pakistan had before this file existed — so a gap costs nothing
 * and never blocks anyone. Adding a country is appending one entry.
 *
 * ── Before relying on these for a statutory filing ──────────────────────────
 * These are the common English names, not a certified ISO 3166-2 extract. They
 * are good enough to stop a customer typing a city into a province box. If a
 * tax authority in one of these countries starts matching this value the way
 * FBR does, that country's list needs checking against the authority's own —
 * the same warning that sits at the top of lib/pkProvinces.ts.
 */

import { normalizeCountryCode } from "./countries";
import { PK_PROVINCES } from "./pkProvinces";

export type SubdivisionTier = {
  /** The word this country uses. Becomes the field label. */
  label: string;
  items: readonly string[];
};

/** Shown when the country is unknown or has no list — the old generic heading. */
export const GENERIC_SUBDIVISION_LABEL = "State / Province";

const TIERS: Record<string, SubdivisionTier> = {
  // ── South Asia ────────────────────────────────────────────
  PK: { label: "Province", items: PK_PROVINCES },
  IN: {
    label: "State / UT",
    items: [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
      "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
      "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
      "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
      "Ladakh", "Lakshadweep", "Puducherry",
    ],
  },
  BD: {
    label: "Division",
    items: ["Barishal", "Chattogram", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"],
  },
  LK: {
    label: "Province",
    items: ["Central", "Eastern", "North Central", "Northern", "North Western", "Sabaragamuwa", "Southern", "Uva", "Western"],
  },
  NP: {
    label: "Province",
    items: ["Bagmati", "Gandaki", "Karnali", "Koshi", "Lumbini", "Madhesh", "Sudurpashchim"],
  },
  AF: {
    label: "Province",
    items: [
      "Badakhshan", "Badghis", "Baghlan", "Balkh", "Bamyan", "Daykundi", "Farah", "Faryab",
      "Ghazni", "Ghor", "Helmand", "Herat", "Jowzjan", "Kabul", "Kandahar", "Kapisa",
      "Khost", "Kunar", "Kunduz", "Laghman", "Logar", "Nangarhar", "Nimroz", "Nuristan",
      "Paktia", "Paktika", "Panjshir", "Parwan", "Samangan", "Sar-e Pol", "Takhar",
      "Uruzgan", "Wardak", "Zabul",
    ],
  },

  // ── East & Southeast Asia ─────────────────────────────────
  CN: {
    label: "Province / Region",
    items: [
      "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi", "Guizhou",
      "Hainan", "Hebei", "Heilongjiang", "Henan", "Hong Kong", "Hubei", "Hunan",
      "Inner Mongolia", "Jiangsu", "Jiangxi", "Jilin", "Liaoning", "Macau", "Ningxia",
      "Qinghai", "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan", "Tianjin",
      "Tibet", "Xinjiang", "Yunnan", "Zhejiang",
    ],
  },
  JP: {
    label: "Prefecture",
    items: [
      "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka", "Fukushima",
      "Gifu", "Gunma", "Hiroshima", "Hokkaido", "Hyogo", "Ibaraki", "Ishikawa", "Iwate",
      "Kagawa", "Kagoshima", "Kanagawa", "Kochi", "Kumamoto", "Kyoto", "Mie", "Miyagi",
      "Miyazaki", "Nagano", "Nagasaki", "Nara", "Niigata", "Oita", "Okayama", "Okinawa",
      "Osaka", "Saga", "Saitama", "Shiga", "Shimane", "Shizuoka", "Tochigi", "Tokushima",
      "Tokyo", "Tottori", "Toyama", "Wakayama", "Yamagata", "Yamaguchi", "Yamanashi",
    ],
  },
  KR: {
    label: "Province / City",
    items: [
      "Busan", "Chungcheongbuk-do", "Chungcheongnam-do", "Daegu", "Daejeon", "Gangwon",
      "Gwangju", "Gyeonggi-do", "Gyeongsangbuk-do", "Gyeongsangnam-do", "Incheon", "Jeju",
      "Jeollabuk-do", "Jeollanam-do", "Sejong", "Seoul", "Ulsan",
    ],
  },
  ID: {
    label: "Province",
    items: [
      "Aceh", "Bali", "Bangka Belitung Islands", "Banten", "Bengkulu", "Central Java",
      "Central Kalimantan", "Central Sulawesi", "East Java", "East Kalimantan",
      "East Nusa Tenggara", "Gorontalo", "Jakarta", "Jambi", "Lampung", "Maluku",
      "North Kalimantan", "North Maluku", "North Sulawesi", "North Sumatra", "Papua",
      "Riau", "Riau Islands", "Southeast Sulawesi", "South Kalimantan", "South Sulawesi",
      "South Sumatra", "West Java", "West Kalimantan", "West Nusa Tenggara", "West Papua",
      "West Sulawesi", "West Sumatra", "Yogyakarta",
    ],
  },
  MY: {
    label: "State",
    items: [
      "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca", "Negeri Sembilan",
      "Pahang", "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak", "Selangor",
      "Terengganu",
    ],
  },
  TH: {
    label: "Province",
    items: [
      "Amnat Charoen", "Ang Thong", "Bangkok", "Bueng Kan", "Buri Ram", "Chachoengsao",
      "Chai Nat", "Chaiyaphum", "Chanthaburi", "Chiang Mai", "Chiang Rai", "Chon Buri",
      "Chumphon", "Kalasin", "Kamphaeng Phet", "Kanchanaburi", "Khon Kaen", "Krabi",
      "Lampang", "Lamphun", "Loei", "Lop Buri", "Mae Hong Son", "Maha Sarakham",
      "Mukdahan", "Nakhon Nayok", "Nakhon Pathom", "Nakhon Phanom", "Nakhon Ratchasima",
      "Nakhon Sawan", "Nakhon Si Thammarat", "Nan", "Narathiwat", "Nong Bua Lam Phu",
      "Nong Khai", "Nonthaburi", "Pathum Thani", "Pattani", "Phangnga", "Phatthalung",
      "Phayao", "Phetchabun", "Phetchaburi", "Phichit", "Phitsanulok", "Phra Nakhon Si Ayutthaya",
      "Phrae", "Phuket", "Prachin Buri", "Prachuap Khiri Khan", "Ranong", "Ratchaburi",
      "Rayong", "Roi Et", "Sa Kaeo", "Sakon Nakhon", "Samut Prakan", "Samut Sakhon",
      "Samut Songkhram", "Saraburi", "Satun", "Si Sa Ket", "Sing Buri", "Songkhla",
      "Sukhothai", "Suphan Buri", "Surat Thani", "Surin", "Tak", "Trang", "Trat",
      "Ubon Ratchathani", "Udon Thani", "Uthai Thani", "Uttaradit", "Yala", "Yasothon",
    ],
  },

  // ── Gulf & Middle East ────────────────────────────────────
  AE: {
    label: "Emirate",
    items: ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"],
  },
  SA: {
    label: "Region",
    items: [
      "Al Bahah", "Al Jawf", "Al Madinah", "Al Qassim", "Asir", "Eastern Province",
      "Ha'il", "Jazan", "Makkah", "Najran", "Northern Borders", "Riyadh", "Tabuk",
    ],
  },
  QA: {
    label: "Municipality",
    items: ["Al Daayen", "Al Khor", "Al Rayyan", "Al Shahaniya", "Al Shamal", "Al Wakrah", "Doha", "Umm Salal"],
  },
  KW: {
    label: "Governorate",
    items: ["Al Ahmadi", "Al Asimah", "Al Farwaniyah", "Al Jahra", "Hawalli", "Mubarak Al-Kabeer"],
  },
  BH: {
    label: "Governorate",
    items: ["Capital", "Muharraq", "Northern", "Southern"],
  },
  OM: {
    label: "Governorate",
    items: [
      "Ad Dakhiliyah", "Ad Dhahirah", "Al Batinah North", "Al Batinah South", "Al Buraimi",
      "Al Wusta", "Ash Sharqiyah North", "Ash Sharqiyah South", "Dhofar", "Musandam", "Muscat",
    ],
  },
  JO: {
    label: "Governorate",
    items: [
      "Ajloun", "Amman", "Aqaba", "Balqa", "Irbid", "Jerash", "Karak", "Ma'an",
      "Madaba", "Mafraq", "Tafilah", "Zarqa",
    ],
  },
  LB: {
    label: "Governorate",
    items: ["Akkar", "Baalbek-Hermel", "Beirut", "Beqaa", "Mount Lebanon", "Nabatieh", "North", "South"],
  },
  IQ: {
    label: "Governorate",
    items: [
      "Al Anbar", "Babil", "Baghdad", "Basra", "Dhi Qar", "Diyala", "Duhok", "Erbil",
      "Karbala", "Kirkuk", "Maysan", "Muthanna", "Najaf", "Nineveh", "Qadisiyyah",
      "Salah ad Din", "Sulaymaniyah", "Wasit",
    ],
  },
  TR: {
    label: "Province",
    items: [
      "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Aksaray", "Amasya", "Ankara",
      "Antalya", "Ardahan", "Artvin", "Aydin", "Balikesir", "Bartin", "Batman", "Bayburt",
      "Bilecik", "Bingol", "Bitlis", "Bolu", "Burdur", "Bursa", "Canakkale", "Cankiri",
      "Corum", "Denizli", "Diyarbakir", "Duzce", "Edirne", "Elazig", "Erzincan", "Erzurum",
      "Eskisehir", "Gaziantep", "Giresun", "Gumushane", "Hakkari", "Hatay", "Igdir",
      "Isparta", "Istanbul", "Izmir", "Kahramanmaras", "Karabuk", "Karaman", "Kars",
      "Kastamonu", "Kayseri", "Kilis", "Kirikkale", "Kirklareli", "Kirsehir", "Kocaeli",
      "Konya", "Kutahya", "Malatya", "Manisa", "Mardin", "Mersin", "Mugla", "Mus",
      "Nevsehir", "Nigde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Sanliurfa",
      "Siirt", "Sinop", "Sirnak", "Sivas", "Tekirdag", "Tokat", "Trabzon", "Tunceli",
      "Usak", "Van", "Yalova", "Yozgat", "Zonguldak",
    ],
  },

  // ── Africa ────────────────────────────────────────────────
  EG: {
    label: "Governorate",
    items: [
      "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia",
      "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor",
      "Matrouh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia",
      "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez",
    ],
  },
  MA: {
    label: "Region",
    items: [
      "Beni Mellal-Khenifra", "Casablanca-Settat", "Draa-Tafilalet", "Fes-Meknes",
      "Guelmim-Oued Noun", "Laayoune-Sakia El Hamra", "Marrakesh-Safi", "Oriental",
      "Rabat-Sale-Kenitra", "Souss-Massa", "Tanger-Tetouan-Al Hoceima",
    ],
  },
  NG: {
    label: "State",
    items: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
      "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory",
      "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
      "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
      "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  ZA: {
    label: "Province",
    items: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga",
      "Northern Cape", "North West", "Western Cape",
    ],
  },
  GH: {
    label: "Region",
    items: [
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra",
      "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta",
      "Western", "Western North",
    ],
  },
  KE: {
    label: "County",
    items: [
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
      "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
      "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
      "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
      "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya",
      "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana",
      "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
    ],
  },
  ET: {
    label: "Region",
    items: [
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa",
      "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia",
      "South West Ethiopia", "Tigray",
    ],
  },
  TZ: {
    label: "Region",
    items: [
      "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma",
      "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza",
      "Njombe", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe",
      "Tabora", "Tanga",
    ],
  },

  // ── Americas ──────────────────────────────────────────────
  US: {
    label: "State",
    items: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
      "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
      "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
      "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
      "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
      "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
      "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin",
      "Wyoming", "Puerto Rico", "Guam", "U.S. Virgin Islands", "American Samoa",
      "Northern Mariana Islands",
    ],
  },
  CA: {
    label: "Province / Territory",
    items: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut",
      "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
    ],
  },
  MX: {
    label: "State",
    items: [
      "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
      "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo",
      "Jalisco", "Mexico City", "Mexico State", "Michoacan", "Morelos", "Nayarit",
      "Nuevo Leon", "Oaxaca", "Puebla", "Queretaro", "Quintana Roo", "San Luis Potosi",
      "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatan",
      "Zacatecas",
    ],
  },
  BR: {
    label: "State",
    items: [
      "Acre", "Alagoas", "Amapa", "Amazonas", "Bahia", "Ceara", "Distrito Federal",
      "Espirito Santo", "Goias", "Maranhao", "Mato Grosso", "Mato Grosso do Sul",
      "Minas Gerais", "Para", "Paraiba", "Parana", "Pernambuco", "Piaui",
      "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondonia", "Roraima",
      "Santa Catarina", "Sao Paulo", "Sergipe", "Tocantins",
    ],
  },
  AR: {
    label: "Province",
    items: [
      "Buenos Aires", "Buenos Aires City", "Catamarca", "Chaco", "Chubut", "Cordoba",
      "Corrientes", "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
      "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
      "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucuman",
    ],
  },
  CL: {
    label: "Region",
    items: [
      "Aisen", "Antofagasta", "Arica y Parinacota", "Atacama", "Biobio", "Coquimbo",
      "La Araucania", "Libertador General Bernardo O'Higgins", "Los Lagos", "Los Rios",
      "Magallanes", "Maule", "Nuble", "Santiago Metropolitan", "Tarapaca", "Valparaiso",
    ],
  },
  CO: {
    label: "Department",
    items: [
      "Amazonas", "Antioquia", "Arauca", "Atlantico", "Bogota", "Bolivar", "Boyaca",
      "Caldas", "Caqueta", "Casanare", "Cauca", "Cesar", "Choco", "Cordoba",
      "Cundinamarca", "Guainia", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta",
      "Narino", "Norte de Santander", "Putumayo", "Quindio", "Risaralda",
      "San Andres y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
      "Vaupes", "Vichada",
    ],
  },
  PE: {
    label: "Department",
    items: [
      "Amazonas", "Ancash", "Apurimac", "Arequipa", "Ayacucho", "Cajamarca", "Callao",
      "Cusco", "Huancavelica", "Huanuco", "Ica", "Junin", "La Libertad", "Lambayeque",
      "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno",
      "San Martin", "Tacna", "Tumbes", "Ucayali",
    ],
  },

  // ── Europe ────────────────────────────────────────────────
  GB: {
    label: "Country",
    items: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  IE: {
    label: "County",
    items: [
      "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
      "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo",
      "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford",
      "Westmeath", "Wexford", "Wicklow",
    ],
  },
  DE: {
    label: "State",
    items: [
      "Baden-Wurttemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg",
      "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia",
      "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein",
      "Thuringia",
    ],
  },
  FR: {
    label: "Region",
    items: [
      "Auvergne-Rhone-Alpes", "Bourgogne-Franche-Comte", "Brittany", "Centre-Val de Loire",
      "Corsica", "Grand Est", "Hauts-de-France", "Ile-de-France", "Normandy",
      "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Cote d'Azur",
      "Guadeloupe", "French Guiana", "Martinique", "Mayotte", "Reunion",
    ],
  },
  ES: {
    label: "Autonomous Community",
    items: [
      "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country",
      "Canary Islands", "Cantabria", "Castile and Leon", "Castilla-La Mancha", "Catalonia",
      "Ceuta", "Extremadura", "Galicia", "La Rioja", "Madrid", "Melilla", "Murcia",
      "Navarre", "Valencian Community",
    ],
  },
  IT: {
    label: "Region",
    items: [
      "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania",
      "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche",
      "Molise", "Piedmont", "Sardinia", "Sicily", "Trentino-South Tyrol", "Tuscany",
      "Umbria", "Veneto",
    ],
  },
  NL: {
    label: "Province",
    items: [
      "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg",
      "North Brabant", "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland",
    ],
  },
  BE: {
    label: "Province / Region",
    items: [
      "Antwerp", "Brussels-Capital Region", "East Flanders", "Flemish Brabant", "Hainaut",
      "Liege", "Limburg", "Luxembourg", "Namur", "Walloon Brabant", "West Flanders",
    ],
  },
  CH: {
    label: "Canton",
    items: [
      "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft",
      "Basel-Stadt", "Bern", "Fribourg", "Geneva", "Glarus", "Grisons", "Jura", "Lucerne",
      "Neuchatel", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn",
      "St. Gallen", "Thurgau", "Ticino", "Uri", "Valais", "Vaud", "Zug", "Zurich",
    ],
  },
  AT: {
    label: "State",
    items: [
      "Burgenland", "Carinthia", "Lower Austria", "Salzburg", "Styria", "Tyrol",
      "Upper Austria", "Vienna", "Vorarlberg",
    ],
  },
  SE: {
    label: "County",
    items: [
      "Blekinge", "Dalarna", "Gavleborg", "Gotland", "Halland", "Jamtland", "Jonkoping",
      "Kalmar", "Kronoberg", "Norrbotten", "Orebro", "Ostergotland", "Skane", "Sodermanland",
      "Stockholm", "Uppsala", "Varmland", "Vasterbotten", "Vasternorrland", "Vastmanland",
      "Vastra Gotaland",
    ],
  },
  NO: {
    label: "County",
    items: [
      "Agder", "Akershus", "Buskerud", "Finnmark", "Innlandet", "More og Romsdal",
      "Nordland", "Oslo", "Ostfold", "Rogaland", "Telemark", "Troms", "Trondelag",
      "Vestfold", "Vestland",
    ],
  },
  DK: {
    label: "Region",
    items: ["Capital Region", "Central Denmark", "North Denmark", "Region Zealand", "Southern Denmark"],
  },
  FI: {
    label: "Region",
    items: [
      "Aland Islands", "Central Finland", "Central Ostrobothnia", "Kainuu", "Kanta-Hame",
      "Kymenlaakso", "Lapland", "North Karelia", "North Ostrobothnia", "Northern Savonia",
      "Ostrobothnia", "Paijat-Hame", "Pirkanmaa", "Satakunta", "South Karelia",
      "South Ostrobothnia", "Southern Savonia", "Southwest Finland", "Uusimaa",
    ],
  },
  PL: {
    label: "Voivodeship",
    items: [
      "Greater Poland", "Kuyavian-Pomeranian", "Lesser Poland", "Lodz", "Lower Silesian",
      "Lublin", "Lubusz", "Masovian", "Opole", "Podlaskie", "Pomeranian", "Silesian",
      "Subcarpathian", "Swietokrzyskie", "Warmian-Masurian", "West Pomeranian",
    ],
  },
  PT: {
    label: "District",
    items: [
      "Aveiro", "Azores", "Beja", "Braga", "Braganca", "Castelo Branco", "Coimbra",
      "Evora", "Faro", "Guarda", "Leiria", "Lisbon", "Madeira", "Portalegre", "Porto",
      "Santarem", "Setubal", "Viana do Castelo", "Vila Real", "Viseu",
    ],
  },
  GR: {
    label: "Region",
    items: [
      "Attica", "Central Greece", "Central Macedonia", "Crete", "Eastern Macedonia and Thrace",
      "Epirus", "Ionian Islands", "Mount Athos", "North Aegean", "Peloponnese",
      "South Aegean", "Thessaly", "Western Greece", "Western Macedonia",
    ],
  },
  CZ: {
    label: "Region",
    items: [
      "Central Bohemian", "Hradec Kralove", "Karlovy Vary", "Liberec", "Moravian-Silesian",
      "Olomouc", "Pardubice", "Plzen", "Prague", "South Bohemian", "South Moravian",
      "Usti nad Labem", "Vysocina", "Zlin",
    ],
  },
  UA: {
    label: "Oblast",
    items: [
      "Cherkasy", "Chernihiv", "Chernivtsi", "Crimea", "Dnipropetrovsk", "Donetsk",
      "Ivano-Frankivsk", "Kharkiv", "Kherson", "Khmelnytskyi", "Kyiv", "Kyiv City",
      "Kirovohrad", "Luhansk", "Lviv", "Mykolaiv", "Odesa", "Poltava", "Rivne", "Sevastopol",
      "Sumy", "Ternopil", "Vinnytsia", "Volyn", "Zakarpattia", "Zaporizhzhia", "Zhytomyr",
    ],
  },

  // ── Oceania ───────────────────────────────────────────────
  AU: {
    label: "State / Territory",
    items: [
      "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
      "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
  },
  NZ: {
    label: "Region",
    items: [
      "Auckland", "Bay of Plenty", "Canterbury", "Chatham Islands", "Gisborne",
      "Hawke's Bay", "Manawatu-Whanganui", "Marlborough", "Nelson", "Northland", "Otago",
      "Southland", "Taranaki", "Tasman", "Waikato", "Wellington", "West Coast",
    ],
  },
};

/**
 * City-states, where a second address line below City is a box nobody can fill
 * correctly. Listed so the form can drop the field rather than show an empty
 * dropdown or, worse, a free-text box that invites a guess.
 *
 * Kept to places that genuinely have no second tier. A small country that does
 * have one — Andorra's parishes, Malta's regions — is simply absent from TIERS
 * above and falls back to a text box, which asks for nothing wrong.
 */
const NO_SUBDIVISION_COUNTRIES = new Set(["SG", "HK", "MO", "MC", "VA"]);

/** The tier for a country given either its name ("Pakistan") or code ("PK"). */
function tierFor(country: string | null | undefined): SubdivisionTier | null {
  const code = normalizeCountryCode(country);
  if (!code) return null;
  return TIERS[code] ?? null;
}

/** The list to show, or an empty array when this country has no list here. */
export function subdivisionsFor(country: string | null | undefined): readonly string[] {
  return tierFor(country)?.items ?? [];
}

/** What to print above the field — "Emirate", "Prefecture", "State / Province". */
export function subdivisionLabelFor(country: string | null | undefined): string {
  return tierFor(country)?.label ?? GENERIC_SUBDIVISION_LABEL;
}

/** True when a dropdown can be offered instead of a text box. */
export function hasSubdivisions(country: string | null | undefined): boolean {
  return subdivisionsFor(country).length > 0;
}

/**
 * True for a country that genuinely has no useful second tier, so the caller
 * can hide the field instead of asking for something that does not exist.
 */
export function skipsSubdivision(country: string | null | undefined): boolean {
  const code = normalizeCountryCode(country);
  return !!code && NO_SUBDIVISION_COUNTRIES.has(code);
}

/**
 * Canonical spelling for whatever was typed or imported, or null when it is not
 * on this country's list.
 *
 * Case and spacing only — no guessing. A city is deliberately not mapped to its
 * region for the same reason lib/pkProvinces.ts refuses to: quietly turning
 * "Lahore" into "Punjab" files an address nobody confirmed.
 */
export function normalizeSubdivision(
  country: string | null | undefined,
  raw: string | null | undefined,
): string | null {
  const key = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  for (const item of subdivisionsFor(country)) {
    if (item.toLowerCase() === key) return item;
  }
  return null;
}

/** Countries this file covers, for tests and the coverage check. */
export function coveredCountryCodes(): string[] {
  return Object.keys(TIERS).sort();
}
