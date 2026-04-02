/**
 * Finova Local Chat AI Engine
 * Rule-based NLP engine — no external API needed.
 * Covers 60+ intents in English & Urdu.
 */

// Supported language codes
export type ChatLanguage = "en" | "ur_roman" | "ur_script" | "hi" | "ar" | "es" | "fr" | "zh" | "de" | "pt" | "ru" | "bn" | "tr";

export interface ChatEngineResult {
  reply: string;
  confidence: number;  // 0–1
  intentId: string;
  shouldEscalate: boolean;
  language: ChatLanguage;
}

interface Intent {
  id: string;
  enKeywords: string[];
  urKeywords: string[];
  enResponses: string[];
  urResponses: string[];       // Roman Urdu (Latin script)
  urScriptResponses?: string[]; // Urdu script (اردو)
  confidence: number;
}

// ─── Detect language ──────────────────────────────────────────────────────────
function detectLanguage(text: string): ChatLanguage {
  // Arabic script block (Urdu, Arabic, Persian all share U+0600–U+06FF)
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  if (arabicChars && arabicChars.length > 1) {
    // Urdu-specific characters: ے ی ں گ ک ٹ ڈ
    const urduSpecific = /[\u06BE\u06CC\u06BA\u06AF\u06A9\u0679\u0688]/;
    if (urduSpecific.test(text)) return "ur_script";
    return "ar";
  }
  // Devanagari (Hindi)
  if (/[\u0900-\u097F]{2,}/.test(text)) return "hi";
  // Bengali
  if (/[\u0980-\u09FF]{2,}/.test(text)) return "bn";
  // Chinese (CJK Unified Ideographs)
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]{2,}/.test(text)) return "zh";
  // Cyrillic (Russian)
  if (/[\u0400-\u04FF]{3,}/.test(text)) return "ru";

  // Roman Urdu detection (must come before Spanish/French to avoid conflicts)
  const urduRoman = /\b(kya|hai|hain|nahi|kaise|mujhe|aap|ky|kr|ho|or|se|me|ka|ki|ke|ap|yeh|woh|bhi|koi|kuch|shukriya|salam|theek|bilkul|zaroor|sahi|pata|batao|chahiye|milta|hoga|karo|karen|jana|aao|nahi|bata|kab|kahan|kyun|phir|lekin|magar|agar|jab|tab|yahan)\b/i;
  if (urduRoman.test(text)) return "ur_roman";

  // Spanish
  if (/\b(hola|gracias|c[oó]mo|qu[eé]|por favor|buenos|factura|reporte|ayuda|sistema|empresa|inventario)\b/i.test(text)) return "es";
  // French
  if (/\b(bonjour|merci|comment|qu'est|s'il vous|facture|rapport|aide|syst[eè]me|entreprise)\b/i.test(text)) return "fr";
  // German
  if (/\b(hallo|danke|wie|bitte|rechnung|bericht|hilfe|system|unternehmen)\b/i.test(text)) return "de";
  // Turkish
  if (/\b(merhaba|te[sş]ekk[uü]r|nas[iı]l|l[uü]tfen|fatura|rapor|yard[iı]m|sistem|[sş]irket)\b/i.test(text)) return "tr";
  // Portuguese
  if (/\b(ol[aá]|obrigado|como|por favor|fatura|relat[oó]rio|ajuda|sistema|empresa)\b/i.test(text)) return "pt";
  // Hindi (Roman transliteration fallback)
  if (/\b(namaste|dhanyawad|kaise|aapka|mujhe|bahut|achha)\b/i.test(text)) return "hi";

  return "en";
}

// ─── Normalize ────────────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Score intent ─────────────────────────────────────────────────────────────
// Uses word-boundary matching to avoid "hi" matching inside "this", etc.
function matchesKeyword(query: string, kw: string): boolean {
  const nkw = normalize(kw);
  const nq  = normalize(query);
  // Multi-word phrase: substring match is fine (specific enough)
  if (nkw.includes(" ")) return nq.includes(nkw);
  // Single word: must be whole word (surrounded by non-word chars or string boundary)
  const re = new RegExp(`(?<![\\w\\u0600-\\u06FF])${nkw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?![\\w\\u0600-\\u06FF])`);
  return re.test(nq);
}

function scoreIntent(query: string, intent: Intent): number {
  let score = 0;
  const allKeywords = [...intent.enKeywords, ...intent.urKeywords];
  for (const kw of allKeywords) {
    if (matchesKeyword(query, kw)) {
      // longer keyword match = higher score
      score += kw.split(" ").length > 1 ? 2 : 1;
    }
  }
  return score;
}

// ─── Pick random response ─────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE — 60+ intents
// ═══════════════════════════════════════════════════════════════════════════════
const INTENTS: Intent[] = [

  // ── System Overview ──────────────────────────────────────────────────────────
  {
    id: "system_overview",
    enKeywords: ["about this system", "about finova", "what is finova", "tell me about", "what does finova", "overview", "what is this", "explain finova", "introduce", "features of finova", "what can finova", "system overview", "about the platform", "about the software"],
    urKeywords: ["is system ke bare", "finova kya hai", "system kya hai", "bata do", "overview", "features batao", "kya hai ye", "is software ke bare", "platform kya hai"],
    enResponses: [
      "🚀 **Finova** is a complete cloud-based business management platform designed for SMEs.\n\nHere's what it covers:\n\n• 📄 **Accounting** — invoices, vouchers, journal entries, ledger\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Financial Reports** — P&L, Balance Sheet, Cash Flow, Trial Balance, Tax Summary\n• 📦 **Inventory** — items, stock rates, GRN, stock tracking\n• 🛒 **Sales & Purchase** — invoices, quotations, POs, delivery challans\n• 👥 **HR & Payroll** — employees, attendance, leaves, salary\n• 🤝 **CRM** — contacts, interactions, sales pipeline\n• 🔧 **Admin** — users, permissions, roles, audit log, backup\n\nAll in one platform — accessible from any browser, anywhere. What area would you like to know more about?",
    ],
    urResponses: [
      "🚀 **Finova** aik mukammal cloud-based business management platform hai — chhoti aur medium businesses ke liye!\n\nYe sab kuch cover karta hai:\n\n• 📄 **Accounting** — invoices, vouchers, journal entries, ledger\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Financial Reports** — P&L, Balance Sheet, Cash Flow, Trial Balance, Tax\n• 📦 **Inventory** — items, stock, GRN, tracking\n• 🛒 **Sales & Purchase** — invoice, quotation, PO, delivery challan\n• 👥 **HR & Payroll** — employees, attendance, leave, salary\n• 🤝 **CRM** — contacts, pipeline, interactions\n• 🔧 **Admin** — users, permissions, backup\n\nSab kuch ek hi platform mein! Kisi specific module ke baare mein janna chahte ho?",
    ],
    urScriptResponses: [
      "🚀 **فنووا** ایک مکمل کلاؤڈ بیسڈ بزنس مینجمنٹ پلیٹ فارم ہے — چھوٹی اور درمیانی کاروباروں کے لیے!\n\nیہ سب کچھ کور کرتا ہے:\n\n• 📄 **اکاؤنٹنگ** — انوائسز، واؤچرز، جرنل اندراجات، لیجر\n• 🏦 **بینکنگ** — بینک ریکنسلیشن، پیمنٹ رسیدیں\n• 📊 **مالیاتی رپورٹس** — P&L، بیلنس شیٹ، کیش فلو، ٹرائل بیلنس، ٹیکس\n• 📦 **انوینٹری** — آئٹمز، اسٹاک، GRN، ٹریکنگ\n• 🛒 **سیلز اور پرچیز** — انوائس، کوٹیشن، PO، ڈیلیوری چالان\n• 👥 **HR اور پے رول** — ملازمین، حاضری، چھٹی، تنخواہ\n• 🤝 **CRM** — کانٹیکٹس، پائپ لائن، تعاملات\n• 🔧 **ایڈمن** — یوزرز، اجازتیں، بیک اپ\n\nسب کچھ ایک ہی پلیٹ فارم میں! کسی مخصوص ماڈیول کے بارے میں جاننا چاہتے ہیں؟",
    ],
    confidence: 0.92,
  },

  // ── Greeting ────────────────────────────────────────────────────────────────
  {
    id: "greeting",
    enKeywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "greetings", "hi there", "hey there"],
    urKeywords: ["salam", "assalamualaikum", "adaab", "helo", "haloo"],
    enResponses: [
      "Hello! 👋 Welcome to Finova Support. I'm your AI assistant — I can help with invoicing, reports, banking, inventory, HR, and more. What can I help you with today?",
      "Hi there! 😊 I'm Finova's AI support assistant. Ask me anything about the platform — from setting up invoices to reading your financial reports!",
    ],
    urResponses: [
      "Assalamu Alaikum! 👋 Finova Support mein khush amdeed. Main aapka AI assistant hun — invoicing, reports, banking, inventory, aur bohat kuch mein madad kar sakta hun. Kya chahiye aapko?",
      "Salam! 😊 Main Finova ka AI assistant hun. Koi bhi sawaal poochein — invoices se le kar financial reports tak, sab kuch bataunga.",
    ],
    urScriptResponses: [
      "السلام علیکم! 👋 فنووا سپورٹ میں خوش آمدید۔ میں آپ کا AI اسسٹنٹ ہوں — انوائسنگ، رپورٹس، بینکنگ، انوینٹری، اور بہت کچھ میں مدد کر سکتا ہوں۔ کیا چاہیے آپ کو؟",
      "سلام! 😊 میں فنووا کا AI اسسٹنٹ ہوں۔ کوئی بھی سوال پوچھیں — انوائسز سے لے کر مالیاتی رپورٹس تک، سب کچھ بتاؤں گا۔",
    ],
    confidence: 0.95,
  },

  // ── Farewell ─────────────────────────────────────────────────────────────────
  {
    id: "farewell",
    enKeywords: ["bye", "goodbye", "thanks", "thank you", "see you", "take care", "done", "that's all"],
    urKeywords: ["shukriya", "shukria", "alvida", "theek hai", "bas", "khuda hafiz", "allah hafiz", "ok bye"],
    enResponses: [
      "You're welcome! 😊 Have a great day. Feel free to chat again anytime you need help with Finova!",
      "Goodbye! 👋 Don't hesitate to reach out if you have more questions. Happy to help anytime!",
    ],
    urResponses: [
      "Shukriya! 😊 Khoob raho. Jab bhi Finova ke baare mein kuch poochna ho, hum yahan hain!",
      "Allah Hafiz! 👋 Koi bhi mushkil ho to dobara poochein. Khush raho!",
    ],
    urScriptResponses: [
      "شکریہ! 😊 خوش رہیں۔ جب بھی فنووا کے بارے میں کچھ پوچھنا ہو، ہم یہاں ہیں!",
      "اللہ حافظ! 👋 کوئی بھی مشکل ہو تو دوبارہ پوچھیں۔ خوش رہیں!",
    ],
    confidence: 0.95,
  },

  // ── General Help ─────────────────────────────────────────────────────────────
  {
    id: "help_general",
    enKeywords: ["help", "what can you do", "how can you help", "features", "capabilities", "what do you support", "assist", "support"],
    urKeywords: ["madad", "help chahiye", "kya kar sakte ho", "kya karta hai", "kya kuch kar sakta hai", "madad karo", "help karo"],
    enResponses: [
      "I can help you with:\n• 📄 **Invoicing** — sales invoices, purchase invoices, quotations\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Reports** — P&L, balance sheet, cash flow, tax, ageing\n• 📦 **Inventory** — items, stock rates, GRN\n• 👥 **HR & Payroll** — employees, salaries, attendance\n• 🔧 **Setup** — plans, users, permissions, backup\n\nJust ask your question and I'll guide you!",
    ],
    urResponses: [
      "Main in cheezon mein madad kar sakta hun:\n• 📄 **Invoicing** — sales/purchase invoice, quotation\n• 🏦 **Banking** — bank reconciliation, payment receipt\n• 📊 **Reports** — P&L, balance sheet, cash flow, tax\n• 📦 **Inventory** — items, stock, GRN\n• 👥 **HR & Payroll** — employees, salaries, attendance\n• 🔧 **Setup** — plans, users, permissions\n\nKoi bhi sawaal poochein!",
    ],
    urScriptResponses: [
      "میں ان چیزوں میں مدد کر سکتا ہوں:\n• 📄 **انوائسنگ** — سیلز/پرچیز انوائس، کوٹیشن\n• 🏦 **بینکنگ** — بینک ریکنسلیشن، پیمنٹ رسید\n• 📊 **رپورٹس** — P&L، بیلنس شیٹ، کیش فلو، ٹیکس\n• 📦 **انوینٹری** — آئٹمز، اسٹاک، GRN\n• 👥 **HR & پے رول** — ملازمین، تنخواہیں، حاضری\n• 🔧 **سیٹ اپ** — پلانز، یوزرز، اجازتیں\n\nکوئی بھی سوال پوچھیں!",
    ],
    confidence: 0.85,
  },

  // ── Pricing General ───────────────────────────────────────────────────────────
  {
    id: "pricing_general",
    enKeywords: ["price", "cost", "how much", "pricing", "tariff", "charges", "fees", "rate", "amount", "affordable"],
    urKeywords: ["kitna", "qeemat", "rate", "pricing", "charges", "fees", "mehnga", "sasta", "dam"],
    enResponses: [
      "Finova offers 4 plans:\n\n🌱 **Starter** — Ideal for small businesses. Core accounting + invoicing.\n🚀 **Professional** — Full suite including HR, CRM, advanced reports.\n💎 **Enterprise** — All modules + priority support + unlimited users.\n⚡ **Custom** — Pick only the modules you need.\n\nPricing is shown on the Plans page. An intro offer may be available for the first 3 months!",
      "We have plans starting from Starter (basic accounting) all the way to Enterprise (full business suite). Go to the Plans page to see current pricing and compare. An intro discount may apply for new signups!",
    ],
    urResponses: [
      "Finova ke 4 plans hain:\n\n🌱 **Starter** — Chhoti business ke liye. Core accounting + invoicing.\n🚀 **Professional** — HR, CRM, advanced reports sab kuch.\n💎 **Enterprise** — Sab modules + priority support.\n⚡ **Custom** — Sirf jo modules chahiye wo lo.\n\nPlans page pe pricing dekhein. Pehle 3 mahine intro offer bhi ho sakta hai!",
    ],
    urScriptResponses: [
      "فنووا کے 4 پلانز ہیں:\n\n🌱 **اسٹارٹر** — چھوٹی کاروبار کے لیے۔ بنیادی اکاؤنٹنگ + انوائسنگ۔\n🚀 **پروفیشنل** — HR، CRM، ایڈوانسڈ رپورٹس سب کچھ۔\n💎 **انٹرپرائز** — تمام ماڈیولز + ترجیحی سپورٹ۔\n⚡ **کسٹم** — صرف جو ماڈیولز چاہیں وہ لیں۔\n\nقیمتیں پلانز صفحے پر دیکھیں۔ پہلے 3 ماہ کا آفر بھی ہو سکتا ہے!",
    ],
    confidence: 0.9,
  },

  // ── Plan: Starter ─────────────────────────────────────────────────────────────
  {
    id: "plan_starter",
    enKeywords: ["starter plan", "starter", "basic plan", "small business", "beginner", "entry level", "start"],
    urKeywords: ["starter", "basic", "chhota plan", "shuruaat", "shuru"],
    enResponses: [
      "🌱 **Starter Plan** includes:\n• Dashboard & core reporting\n• Sales & purchase invoicing\n• Quotations, delivery challans\n• Bank reconciliation & payment receipts\n• Expense vouchers & CPV/CRV\n• Inventory management\n• Basic financial reports (ledger, trial balance)\n• User & permission management\n\nPerfect for small to medium businesses getting started with digital accounting!",
    ],
    urResponses: [
      "🌱 **Starter Plan** mein shamil hai:\n• Dashboard & basic reports\n• Sales & purchase invoice\n• Quotation, delivery challan\n• Bank reconciliation & payment receipts\n• Expense vouchers, CPV/CRV\n• Inventory management\n• Basic financial reports\n• Users & permissions\n\nChhoti aur medium business ke liye perfect!",
    ],
    urScriptResponses: [
      "🌱 **اسٹارٹر پلان** میں شامل ہے:\n• ڈیش بورڈ اور بنیادی رپورٹس\n• سیلز اور پرچیز انوائس\n• کوٹیشن، ڈیلیوری چالان\n• بینک ریکنسلیشن اور پیمنٹ رسیدیں\n• ایکسپنس واؤچرز، CPV/CRV\n• انوینٹری مینجمنٹ\n• بنیادی مالیاتی رپورٹس\n• یوزرز اور اجازتیں\n\nچھوٹی اور درمیانی کاروبار کے لیے بہترین!",
    ],
    confidence: 0.9,
  },

  // ── Plan: Pro ────────────────────────────────────────────────────────────────
  {
    id: "plan_pro",
    enKeywords: ["pro plan", "professional plan", "pro", "professional", "business plan", "medium business"],
    urKeywords: ["pro plan", "professional", "bada plan"],
    enResponses: [
      "🚀 **Professional Plan** includes everything in Starter plus:\n• HR & Payroll (employees, salaries, attendance, leaves)\n• CRM (contacts, interactions, opportunities)\n• Advanced financial reports (P&L, balance sheet, cash flow)\n• Profit & Loss report\n• Inventory reports\n• Audit log\n• System logs\n\nIdeal for growing businesses that need HR and CRM alongside accounting!",
    ],
    urResponses: [
      "🚀 **Professional Plan** mein Starter ke sab features + ye bhi:\n• HR & Payroll (employees, salary, attendance, leave)\n• CRM (contacts, interactions, deals)\n• Advanced reports (P&L, balance sheet, cash flow)\n• Inventory reports\n• Audit log\n\nBarhti hui business ke liye best!",
    ],
    urScriptResponses: [
      "🚀 **پروفیشنل پلان** میں اسٹارٹر کے تمام فیچرز + یہ بھی:\n• HR اور پے رول (ملازمین، تنخواہ، حاضری، چھٹی)\n• CRM (کانٹیکٹس، تعاملات، ڈیلز)\n• ایڈوانسڈ رپورٹس (P&L، بیلنس شیٹ، کیش فلو)\n• انوینٹری رپورٹس\n• آڈٹ لاگ\n\nبڑھتی ہوئی کاروبار کے لیے بہترین!",
    ],
    confidence: 0.9,
  },

  // ── Plan: Enterprise ──────────────────────────────────────────────────────────
  {
    id: "plan_enterprise",
    enKeywords: ["enterprise plan", "enterprise", "corporate", "large business", "big company", "unlimited"],
    urKeywords: ["enterprise", "bari company", "corporate", "bara business"],
    enResponses: [
      "💎 **Enterprise Plan** includes ALL modules:\n• Everything in Professional\n• Full HR & Payroll including payroll processing\n• Priority customer support\n• Unlimited users\n• All compliance & tax reports\n• Dedicated account manager\n\nDesigned for large organizations with complex accounting needs.",
    ],
    urResponses: [
      "💎 **Enterprise Plan** mein sab kuch shamil hai:\n• Professional ke tamam features\n• Full HR & Payroll\n• Priority support\n• Unlimited users\n• Tamam compliance & tax reports\n• Dedicated account manager\n\nBari organizations ke liye!",
    ],
    urScriptResponses: [
      "💎 **انٹرپرائز پلان** میں سب کچھ شامل ہے:\n• پروفیشنل کے تمام فیچرز\n• مکمل HR اور پے رول\n• ترجیحی سپورٹ\n• لامحدود یوزرز\n• تمام کمپلائنس اور ٹیکس رپورٹس\n• ڈیڈیکیٹڈ اکاؤنٹ مینیجر\n\nبڑی تنظیموں کے لیے!",
    ],
    confidence: 0.9,
  },

  // ── Plan: Custom ──────────────────────────────────────────────────────────────
  {
    id: "plan_custom",
    enKeywords: ["custom plan", "custom", "customize", "pick modules", "choose modules", "selective"],
    urKeywords: ["custom plan", "apni marzi", "jo chahiye", "select karna", "module chunna"],
    enResponses: [
      "⚡ **Custom Plan** lets you pick exactly the modules you need!\n\nOur admin configures which modules are enabled for your Custom plan. You only pay for what you use. Contact our support team or your account manager to set up a Custom plan tailored to your business.",
    ],
    urResponses: [
      "⚡ **Custom Plan** mein aap sirf wo modules le sakte hain jo chahiye!\n\nAdmin aapke liye specific modules enable karta hai. Sirf wahi pay karo jo use karo. Support team ya account manager se contact karein Custom plan ke liye.",
    ],
    urScriptResponses: [
      "⚡ **کسٹم پلان** میں آپ صرف وہ ماڈیولز لے سکتے ہیں جو چاہیں!\n\nایڈمن آپ کے لیے مخصوص ماڈیولز فعال کرتا ہے۔ صرف وہی ادا کریں جو استعمال کریں۔ کسٹم پلان کے لیے سپورٹ ٹیم یا اکاؤنٹ مینیجر سے رابطہ کریں۔",
    ],
    confidence: 0.9,
  },

  // ── Plan Comparison ───────────────────────────────────────────────────────────
  {
    id: "plan_comparison",
    enKeywords: ["compare plans", "which plan", "plan difference", "starter vs pro", "pro vs enterprise", "best plan", "recommend plan", "which is better", "which should i choose"],
    urKeywords: ["kaunsa plan", "plan ka farq", "konsa lun", "best plan kaunsa", "recommend karo", "compare karo"],
    enResponses: [
      "Here's a quick comparison:\n\n| Feature | Starter | Pro | Enterprise |\n|---|---|---|---|\n| Accounting | ✅ | ✅ | ✅ |\n| Invoicing | ✅ | ✅ | ✅ |\n| Banking | ✅ | ✅ | ✅ |\n| HR & Payroll | ❌ | ✅ | ✅ |\n| CRM | ❌ | ✅ | ✅ |\n| All Reports | Partial | ✅ | ✅ |\n| Priority Support | ❌ | ❌ | ✅ |\n\n**Choose Starter** if you need basic accounting. **Pro** if you need HR+CRM. **Enterprise** for everything + priority support.",
    ],
    urResponses: [
      "Yeh compare karo:\n\n• **Starter** → Basic accounting, invoicing, banking — chhoti business ke liye\n• **Pro** → Starter + HR, CRM, advanced reports — barhti business ke liye\n• **Enterprise** → Sab kuch + priority support — bari company ke liye\n\nKitne employees hain aur kya kya features chahiye batao, main recommend kar sakta hun!",
    ],
    urScriptResponses: [
      "یہ موازنہ کریں:\n\n• **اسٹارٹر** → بنیادی اکاؤنٹنگ، انوائسنگ، بینکنگ — چھوٹی کاروبار کے لیے\n• **پرو** → اسٹارٹر + HR، CRM، ایڈوانسڈ رپورٹس — بڑھتی کاروبار کے لیے\n• **انٹرپرائز** → سب کچھ + ترجیحی سپورٹ — بڑی کمپنی کے لیے\n\nکتنے ملازمین ہیں اور کیا کیا فیچرز چاہیے بتائیں، میں سفارش کر سکتا ہوں!",
    ],
    confidence: 0.88,
  },

  // ── Signup / Onboarding ──────────────────────────────────────────────────────
  {
    id: "signup",
    enKeywords: ["signup", "sign up", "register", "create account", "new account", "get started", "join", "trial"],
    urKeywords: ["account banana", "register", "signup", "shuru karna", "join", "kaise use karun"],
    enResponses: [
      "Getting started with Finova is easy! 🎉\n\n1. Go to the **Sign Up** page\n2. Enter your name, email & password\n3. Verify your email (OTP sent)\n4. **Choose a plan** (Starter/Pro/Enterprise/Custom)\n5. Review features on the Features page\n6. **Proceed to Payment** and activate your plan\n7. You're in! Access your full dashboard 🚀\n\nNeed help with any specific step?",
    ],
    urResponses: [
      "Finova shuru karna bohat aasaan hai! 🎉\n\n1. **Sign Up** page pe jao\n2. Naam, email aur password dalo\n3. Email verify karo (OTP aayega)\n4. **Plan choose karo** (Starter/Pro/Enterprise/Custom)\n5. Features dekho\n6. **Payment karo** aur plan activate karo\n7. Dashboard ready! 🚀\n\nKisi step mein mushkil ho to batao!",
    ],
    urScriptResponses: [
      "فنووا شروع کرنا بہت آسان ہے! 🎉\n\n1. **سائن اپ** صفحے پر جائیں\n2. نام، ای میل اور پاس ورڈ داخل کریں\n3. ای میل تصدیق کریں (OTP آئے گا)\n4. **پلان منتخب کریں** (اسٹارٹر/پرو/انٹرپرائز/کسٹم)\n5. فیچرز دیکھیں\n6. **ادائیگی کریں** اور پلان فعال کریں\n7. ڈیش بورڈ تیار! 🚀\n\nکسی قدم میں مشکل ہو تو بتائیں!",
    ],
    confidence: 0.9,
  },

  // ── Sales Invoice ─────────────────────────────────────────────────────────────
  {
    id: "invoice_sales",
    enKeywords: ["sales invoice", "invoice", "bill", "create invoice", "make invoice", "billing", "sell"],
    urKeywords: ["sales invoice", "invoice banana", "bill banana", "bikri", "farokht"],
    enResponses: [
      "📄 To create a **Sales Invoice**:\n\n1. Go to **Dashboard → Sales Invoice**\n2. Click **+ New Invoice**\n3. Select customer, add items with quantity & rate\n4. Set tax if applicable\n5. Save or **Print/Export** as PDF\n\nYou can also track payment status and send invoices directly from the platform. Need help with a specific field?",
    ],
    urResponses: [
      "📄 **Sales Invoice** banane ke liye:\n\n1. **Dashboard → Sales Invoice** pe jao\n2. **+ New Invoice** click karo\n3. Customer select karo, items add karo (qty & rate)\n4. Tax lagao agar zaroori ho\n5. Save karo ya **PDF export** karo\n\nPayment status bhi track ho sakta hai. Koi specific cheez poochni ho?",
    ],
    urScriptResponses: [
      "📄 **سیلز انوائس** بنانے کے لیے:\n\n1. **ڈیش بورڈ ← سیلز انوائس** پر جائیں\n2. **+ نئی انوائس** کلک کریں\n3. کسٹمر منتخب کریں، آئٹمز شامل کریں (مقدار اور ریٹ)\n4. ٹیکس لگائیں اگر ضروری ہو\n5. محفوظ کریں یا **PDF برآمد** کریں\n\nادائیگی کی صورتحال بھی ٹریک ہو سکتی ہے۔ کوئی مخصوص بات پوچھنی ہے؟",
    ],
    confidence: 0.92,
  },

  // ── Purchase Invoice ──────────────────────────────────────────────────────────
  {
    id: "invoice_purchase",
    enKeywords: ["purchase invoice", "purchase bill", "supplier invoice", "vendor invoice", "buy", "purchase"],
    urKeywords: ["purchase invoice", "khareed invoice", "supplier ka bill", "vendor"],
    enResponses: [
      "📄 To create a **Purchase Invoice**:\n\n1. Go to **Dashboard → Purchase Invoice**\n2. Click **+ New Purchase Invoice**\n3. Select supplier, add items purchased\n4. Set payment terms & due date\n5. Save — it updates your accounts payable automatically\n\nPurchase invoices also update your inventory if linked to items.",
    ],
    urResponses: [
      "📄 **Purchase Invoice** banane ke liye:\n\n1. **Dashboard → Purchase Invoice** pe jao\n2. **+ New Purchase Invoice** click karo\n3. Supplier select karo, items add karo\n4. Payment terms aur due date set karo\n5. Save — accounts payable automatically update ho jata hai\n\nInventory bhi update hoti hai agar items linked hain.",
    ],
    urScriptResponses: [
      "📄 **پرچیز انوائس** بنانے کے لیے:\n\n1. **ڈیش بورڈ ← پرچیز انوائس** پر جائیں\n2. **+ نئی پرچیز انوائس** کلک کریں\n3. سپلائر منتخب کریں، آئٹمز شامل کریں\n4. ادائیگی کی شرائط اور آخری تاریخ مقرر کریں\n5. محفوظ کریں — اکاؤنٹس دینداری خودبخود اپ ڈیٹ ہو جاتی ہے\n\nانوینٹری بھی اپ ڈیٹ ہوتی ہے اگر آئٹمز منسلک ہیں۔",
    ],
    confidence: 0.9,
  },

  // ── Quotation ─────────────────────────────────────────────────────────────────
  {
    id: "quotation",
    enKeywords: ["quotation", "quote", "estimate", "proposal", "proforma"],
    urKeywords: ["quotation", "estimate", "quote", "offer"],
    enResponses: [
      "📋 **Quotations** in Finova:\n\n1. Go to **Dashboard → Quotation**\n2. Create quotation with customer details, items, prices\n3. Set validity date\n4. Export as PDF and send to customer\n5. Convert to **Sales Invoice** with one click when approved!\n\nThis saves time — no need to re-enter data.",
    ],
    urResponses: [
      "📋 **Quotation** banane ke liye:\n\n1. **Dashboard → Quotation** pe jao\n2. Customer, items, prices add karo\n3. Validity date set karo\n4. PDF export karo aur customer ko bhejo\n5. Approve hone pe **Sales Invoice** mein convert karo — ek click mein!\n\nData dobara type nahi karna padta.",
    ],
    urScriptResponses: [
      "📋 **کوٹیشن** بنانے کے لیے:\n\n1. **ڈیش بورڈ ← کوٹیشن** پر جائیں\n2. کسٹمر، آئٹمز، قیمتیں شامل کریں\n3. میعاد کی تاریخ مقرر کریں\n4. PDF برآمد کریں اور کسٹمر کو بھیجیں\n5. منظوری پر **سیلز انوائس** میں تبدیل کریں — ایک کلک میں!\n\nدوبارہ ڈیٹا داخل کرنے کی ضرورت نہیں۔",
    ],
    confidence: 0.9,
  },

  // ── Purchase Order ────────────────────────────────────────────────────────────
  {
    id: "purchase_order",
    enKeywords: ["purchase order", "PO", "order to supplier", "procurement"],
    urKeywords: ["purchase order", "PO", "order banana", "supplier ko order"],
    enResponses: [
      "📦 **Purchase Order (PO)**:\n\n1. Go to **Dashboard → Purchase Order**\n2. Select supplier and add items to order\n3. Set expected delivery date\n4. Save and send PO to supplier\n5. When goods arrive, create **GRN** (Goods Receipt Note) against this PO\n\nPOs help you track what was ordered vs what was received.",
    ],
    urResponses: [
      "📦 **Purchase Order (PO)** banane ke liye:\n\n1. **Dashboard → Purchase Order** pe jao\n2. Supplier aur items select karo\n3. Expected delivery date set karo\n4. Save karo aur supplier ko bhejo\n5. Maal aanay pe **GRN** banao is PO ke against\n\nPO se track hota hai kya order tha aur kya mila.",
    ],
    urScriptResponses: [
      "📦 **پرچیز آرڈر (PO)** بنانے کے لیے:\n\n1. **ڈیش بورڈ ← پرچیز آرڈر** پر جائیں\n2. سپلائر اور آئٹمز منتخب کریں\n3. متوقع ڈیلیوری تاریخ مقرر کریں\n4. محفوظ کریں اور سپلائر کو بھیجیں\n5. مال آنے پر اس PO کے خلاف **GRN** بنائیں\n\nPO سے پتہ چلتا ہے کیا آرڈر تھا اور کیا ملا۔",
    ],
    confidence: 0.9,
  },

  // ── Delivery Challan ──────────────────────────────────────────────────────────
  {
    id: "delivery_challan",
    enKeywords: ["delivery challan", "DC", "dispatch", "delivery note", "outward"],
    urKeywords: ["delivery challan", "DC", "maal bhejna", "dispatch"],
    enResponses: [
      "🚚 **Delivery Challan** is used when you dispatch goods to a customer before raising an invoice.\n\n1. Go to **Dashboard → Delivery Challan**\n2. Select customer and items being dispatched\n3. Save and print — driver carries this as proof of delivery\n4. Later, convert to **Sales Invoice**\n\nUseful for businesses that deliver first and bill later.",
    ],
    urResponses: [
      "🚚 **Delivery Challan** tab banate hain jab maal invoice se pehle bheja jata hai.\n\n1. **Dashboard → Delivery Challan** pe jao\n2. Customer aur items select karo\n3. Save aur print — driver le jata hai\n4. Baad mein **Sales Invoice** mein convert karo\n\nJo pehle maal bhejte hain, baad mein invoice karte hain unke liye.",
    ],
    urScriptResponses: [
      "🚚 **ڈیلیوری چالان** تب بناتے ہیں جب مال انوائس سے پہلے بھیجا جاتا ہے۔\n\n1. **ڈیش بورڈ ← ڈیلیوری چالان** پر جائیں\n2. کسٹمر اور آئٹمز منتخب کریں\n3. محفوظ کریں اور پرنٹ کریں — ڈرائیور لے جاتا ہے\n4. بعد میں **سیلز انوائس** میں تبدیل کریں\n\nجو پہلے مال بھیجتے ہیں، بعد میں انوائس کرتے ہیں ان کے لیے۔",
    ],
    confidence: 0.9,
  },

  // ── GRN ───────────────────────────────────────────────────────────────────────
  {
    id: "grn",
    enKeywords: ["GRN", "goods received note", "receiving goods", "goods receipt", "receive stock", "inward"],
    urKeywords: ["GRN", "goods received note", "maal receive", "stock receive"],
    enResponses: [
      "📥 **GRN (Goods Receipt Note)** records goods received from a supplier:\n\n1. Go to **Dashboard → GRN**\n2. Link to a Purchase Order (optional)\n3. Enter items received and quantities\n4. Save — inventory is updated automatically\n5. Match with purchase invoice for 3-way matching\n\nGRN ensures your inventory is always accurate.",
    ],
    urResponses: [
      "📥 **GRN (Goods Receipt Note)** maal aane ka record hai:\n\n1. **Dashboard → GRN** pe jao\n2. Purchase Order se link karo (optional)\n3. Items aur quantity enter karo\n4. Save — inventory automatic update hoti hai\n5. Purchase invoice se match karo\n\nGRN se inventory accurate rehti hai.",
    ],
    urScriptResponses: [
      "📥 **GRN (گڈز ریسیپٹ نوٹ)** مال آنے کا ریکارڈ ہے:\n\n1. **ڈیش بورڈ ← GRN** پر جائیں\n2. پرچیز آرڈر سے لنک کریں (اختیاری)\n3. آئٹمز اور مقدار داخل کریں\n4. محفوظ کریں — انوینٹری خودبخود اپ ڈیٹ ہوتی ہے\n5. پرچیز انوائس سے ملائیں\n\nGRN سے انوینٹری درست رہتی ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Sale Return ───────────────────────────────────────────────────────────────
  {
    id: "sale_return",
    enKeywords: ["sale return", "return invoice", "customer return", "goods returned", "refund"],
    urKeywords: ["sale return", "wapas", "customer ne wapas kiya", "return"],
    enResponses: [
      "↩️ **Sale Return** handles goods returned by customers:\n\n1. Go to **Dashboard → Sale Return**\n2. Select the original sales invoice\n3. Enter items being returned\n4. Save — it creates a credit note and updates inventory\n\nThe customer's account balance is adjusted automatically.",
    ],
    urResponses: [
      "↩️ **Sale Return** customer ke wapas kiye maal ka record:\n\n1. **Dashboard → Sale Return** pe jao\n2. Original sales invoice select karo\n3. Return items enter karo\n4. Save — credit note banta hai aur inventory update hoti hai\n\nCustomer ka account balance automatic adjust ho jata hai.",
    ],
    urScriptResponses: [
      "↩️ **سیل ریٹرن** کسٹمر کے واپس کیے مال کا ریکارڈ:\n\n1. **ڈیش بورڈ ← سیل ریٹرن** پر جائیں\n2. اصل سیلز انوائس منتخب کریں\n3. واپسی آئٹمز داخل کریں\n4. محفوظ کریں — کریڈٹ نوٹ بنتا ہے اور انوینٹری اپ ڈیٹ ہوتی ہے\n\nکسٹمر کا اکاؤنٹ بیلنس خودبخود درست ہو جاتا ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Payment Receipt ───────────────────────────────────────────────────────────
  {
    id: "payment_receipt",
    enKeywords: ["payment receipt", "receive payment", "customer payment", "collection", "money received"],
    urKeywords: ["payment receipt", "payment mili", "paise aaye", "collection", "payment receive"],
    enResponses: [
      "💰 **Payment Receipt** records money received from customers:\n\n1. Go to **Dashboard → Payment Receipts**\n2. Select customer and the invoice being paid\n3. Enter amount received, payment mode (cash/bank/cheque)\n4. Save — invoice is marked as paid automatically\n\nYou can apply one payment to multiple invoices!",
    ],
    urResponses: [
      "💰 **Payment Receipt** customer se paise milne ka record:\n\n1. **Dashboard → Payment Receipts** pe jao\n2. Customer aur invoice select karo\n3. Amount aur payment mode enter karo (cash/bank/cheque)\n4. Save — invoice paid mark ho jata hai\n\nEk payment se multiple invoices bhi settle ho sakti hain!",
    ],
    urScriptResponses: [
      "💰 **پیمنٹ رسید** کسٹمر سے پیسے ملنے کا ریکارڈ:\n\n1. **ڈیش بورڈ ← پیمنٹ رسیدیں** پر جائیں\n2. کسٹمر اور انوائس منتخب کریں\n3. رقم اور ادائیگی کا طریقہ داخل کریں (نقد/بینک/چیک)\n4. محفوظ کریں — انوائس ادا شدہ نشان ہو جاتی ہے\n\nایک ادائیگی سے متعدد انوائسز بھی نمٹ سکتی ہیں!",
    ],
    confidence: 0.9,
  },

  // ── Expense Voucher ───────────────────────────────────────────────────────────
  {
    id: "expense_voucher",
    enKeywords: ["expense voucher", "expense", "business expense", "cost entry", "overhead"],
    urKeywords: ["expense voucher", "kharcha", "expense", "cost"],
    enResponses: [
      "🧾 **Expense Voucher** records business expenses:\n\n1. Go to **Dashboard → Expense Vouchers**\n2. Select expense category (rent, utilities, travel, etc.)\n3. Enter amount, date, description\n4. Attach receipt/photo if needed\n5. Submit for approval or save directly\n\nExpenses flow into your P&L report automatically.",
    ],
    urResponses: [
      "🧾 **Expense Voucher** business ke kharche record karne ke liye:\n\n1. **Dashboard → Expense Vouchers** pe jao\n2. Category select karo (kiraya, utilities, safar, etc.)\n3. Amount, date, description enter karo\n4. Receipt attach karo agar ho\n5. Approve ke liye submit ya directly save karo\n\nExpenses P&L report mein automatic aa jate hain.",
    ],
    urScriptResponses: [
      "🧾 **ایکسپنس واؤچر** کاروباری اخراجات ریکارڈ کرنے کے لیے:\n\n1. **ڈیش بورڈ ← ایکسپنس واؤچرز** پر جائیں\n2. زمرہ منتخب کریں (کرایہ، یوٹیلیٹیز، سفر، وغیرہ)\n3. رقم، تاریخ، تفصیل داخل کریں\n4. رسید منسلک کریں اگر ہو\n5. منظوری کے لیے جمع کریں یا براہ راست محفوظ کریں\n\nاخراجات P&L رپورٹ میں خودبخود آ جاتے ہیں۔",
    ],
    confidence: 0.9,
  },

  // ── CPV / CRV ─────────────────────────────────────────────────────────────────
  {
    id: "cpv_crv",
    enKeywords: ["CPV", "CRV", "cash payment voucher", "cash receipt voucher", "cash payment", "cash receipt"],
    urKeywords: ["CPV", "CRV", "cash payment", "cash receipt", "naqd"],
    enResponses: [
      "💵 **CPV & CRV** are cash transaction vouchers:\n\n• **CPV (Cash Payment Voucher)** — Record cash paid out (payments to suppliers, expenses)\n• **CRV (Cash Receipt Voucher)** — Record cash received (from customers, other sources)\n\nBoth are found in **Dashboard → CPV** / **Dashboard → CRV**. They update your cash book and ledger automatically.",
    ],
    urResponses: [
      "💵 **CPV & CRV** cash transactions ke vouchers hain:\n\n• **CPV (Cash Payment Voucher)** — Cash diya (supplier ko, kharcha)\n• **CRV (Cash Receipt Voucher)** — Cash mila (customer se, dusri jagah se)\n\nDonon **Dashboard → CPV** / **Dashboard → CRV** mein milte hain. Cash book aur ledger automatic update hote hain.",
    ],
    urScriptResponses: [
      "💵 **CPV اور CRV** نقد لین دین کے واؤچرز ہیں:\n\n• **CPV (کیش پیمنٹ واؤچر)** — نقد ادا کیا (سپلائر کو، خرچ)\n• **CRV (کیش رسید واؤچر)** — نقد ملا (کسٹمر سے، دوسری جگہ سے)\n\nدونوں **ڈیش بورڈ ← CPV** / **ڈیش بورڈ ← CRV** میں ملتے ہیں۔ کیش بک اور لیجر خودبخود اپ ڈیٹ ہوتے ہیں۔",
    ],
    confidence: 0.92,
  },

  // ── Journal Voucher ───────────────────────────────────────────────────────────
  {
    id: "journal_voucher",
    enKeywords: ["journal voucher", "JV", "journal entry", "general journal", "double entry"],
    urKeywords: ["journal voucher", "JV", "journal entry", "journal"],
    enResponses: [
      "📒 **Journal Voucher (JV)** is for manual accounting entries:\n\n1. Go to **Dashboard → Journal Voucher**\n2. Select debit account(s) and credit account(s)\n3. Enter amounts — debits must equal credits\n4. Add narration/description\n5. Save — entries appear in ledger and trial balance\n\nUsed for adjustments, accruals, depreciation entries, etc.",
    ],
    urResponses: [
      "📒 **Journal Voucher (JV)** manual accounting entries ke liye:\n\n1. **Dashboard → Journal Voucher** pe jao\n2. Debit aur credit accounts select karo\n3. Amounts enter karo — debit = credit hona chahiye\n4. Narration likho\n5. Save — ledger aur trial balance mein aata hai\n\nAdjustments, accruals, depreciation ke liye use hota hai.",
    ],
    urScriptResponses: [
      "📒 **جرنل واؤچر (JV)** دستی اکاؤنٹنگ اندراجات کے لیے:\n\n1. **ڈیش بورڈ ← جرنل واؤچر** پر جائیں\n2. ڈیبٹ اور کریڈٹ اکاؤنٹس منتخب کریں\n3. رقمیں داخل کریں — ڈیبٹ = کریڈٹ ہونا چاہیے\n4. بیان لکھیں\n5. محفوظ کریں — لیجر اور ٹرائل بیلنس میں آتا ہے\n\nایڈجسٹمنٹس، جمع خرچ، گھساؤ کے لیے استعمال ہوتا ہے۔",
    ],
    confidence: 0.92,
  },

  // ── Bank Reconciliation ───────────────────────────────────────────────────────
  {
    id: "bank_reconciliation",
    enKeywords: ["bank reconciliation", "bank statement", "reconcile", "bank match", "statement import", "bank account", "banking", "bank"],
    urKeywords: ["bank reconciliation", "bank statement", "bank match", "bank account", "banking", "bank"],
    enResponses: [
      "🏦 **Bank Reconciliation** matches your book entries with your bank statement:\n\n1. Go to **Dashboard → Bank Reconciliation**\n2. Select your bank account\n3. Import bank statement (or enter manually)\n4. Match transactions — system highlights unmatched ones\n5. Mark reconciled transactions\n\nThis ensures your books match the actual bank balance. Run it monthly for clean accounts!",
    ],
    urResponses: [
      "🏦 **Bank Reconciliation** apki books ko bank statement se match karta hai:\n\n1. **Dashboard → Bank Reconciliation** pe jao\n2. Bank account select karo\n3. Bank statement import karo ya manually enter karo\n4. Transactions match karo — system unmatched highlight karta hai\n5. Reconciled mark karo\n\nMahine mein ek baar karo — accounts clean rahenge!",
    ],
    urScriptResponses: [
      "🏦 **بینک ریکنسلیشن** آپ کی کتابوں کو بینک اسٹیٹمنٹ سے ملاتا ہے:\n\n1. **ڈیش بورڈ ← بینک ریکنسلیشن** پر جائیں\n2. بینک اکاؤنٹ منتخب کریں\n3. بینک اسٹیٹمنٹ درآمد کریں یا دستی داخل کریں\n4. لین دین ملائیں — سسٹم غیر میل شدہ کو نمایاں کرتا ہے\n5. ریکنسائلڈ نشان لگائیں\n\nمہینے میں ایک بار کریں — اکاؤنٹس صاف رہیں گے!",
    ],
    confidence: 0.92,
  },

  // ── Ledger ────────────────────────────────────────────────────────────────────
  {
    id: "ledger",
    enKeywords: ["ledger", "account statement", "account history", "ledger report", "account balance"],
    urKeywords: ["ledger", "khata", "account history", "account balance", "baki"],
    enResponses: [
      "📖 **Ledger Report** shows the complete transaction history of any account:\n\n1. Go to **Dashboard → Reports → Ledger**\n2. Select account (customer, supplier, expense account, etc.)\n3. Set date range\n4. View all debits, credits, and running balance\n5. Export to PDF or Excel\n\nUse this to verify any account's activity.",
    ],
    urResponses: [
      "📖 **Ledger Report** kisi bhi account ki puri history dikhata hai:\n\n1. **Dashboard → Reports → Ledger** pe jao\n2. Account select karo (customer, supplier, expense, etc.)\n3. Date range set karo\n4. Sab debits, credits aur running balance dekho\n5. PDF ya Excel mein export karo\n\nKisi bhi account ki activity verify karne ke liye.",
    ],
    urScriptResponses: [
      "📖 **لیجر رپورٹ** کسی بھی اکاؤنٹ کی پوری تاریخ دکھاتی ہے:\n\n1. **ڈیش بورڈ ← رپورٹس ← لیجر** پر جائیں\n2. اکاؤنٹ منتخب کریں (کسٹمر، سپلائر، خرچ، وغیرہ)\n3. تاریخ کی حد مقرر کریں\n4. تمام ڈیبٹ، کریڈٹ اور چلتا بیلنس دیکھیں\n5. PDF یا Excel میں برآمد کریں\n\nکسی بھی اکاؤنٹ کی سرگرمی تصدیق کرنے کے لیے۔",
    ],
    confidence: 0.9,
  },

  // ── Trial Balance ─────────────────────────────────────────────────────────────
  {
    id: "trial_balance",
    enKeywords: ["trial balance", "TB", "balance of all accounts"],
    urKeywords: ["trial balance", "TB", "tamam accounts ka balance"],
    enResponses: [
      "⚖️ **Trial Balance** shows all account balances at a point in time:\n\n1. Go to **Dashboard → Reports → Trial Balance**\n2. Select date (usually month-end or year-end)\n3. View all debit and credit balances\n4. Total debits should equal total credits — if not, there's an entry error\n\nTrial Balance is the starting point for preparing final financial statements.",
    ],
    urResponses: [
      "⚖️ **Trial Balance** ek date pe tamam accounts ke balances dikhata hai:\n\n1. **Dashboard → Reports → Trial Balance** pe jao\n2. Date select karo (mahine ka aakhir ya saal ka aakhir)\n3. Sab debit aur credit balances dekho\n4. Total debit = total credit hona chahiye — agar nahi to entry mein ghalti hai\n\nFinal financial statements banane ka pehla qadam.",
    ],
    urScriptResponses: [
      "⚖️ **ٹرائل بیلنس** ایک تاریخ پر تمام اکاؤنٹس کے بیلنس دکھاتا ہے:\n\n1. **ڈیش بورڈ ← رپورٹس ← ٹرائل بیلنس** پر جائیں\n2. تاریخ منتخب کریں (مہینے یا سال کا آخر)\n3. تمام ڈیبٹ اور کریڈٹ بیلنسز دیکھیں\n4. کل ڈیبٹ = کل کریڈٹ ہونا چاہیے — اگر نہیں تو اندراج میں غلطی ہے\n\nحتمی مالیاتی بیانات بنانے کا پہلا قدم۔",
    ],
    confidence: 0.9,
  },

  // ── Profit & Loss ─────────────────────────────────────────────────────────────
  {
    id: "profit_loss",
    enKeywords: ["profit loss", "P&L", "income statement", "profit", "loss", "net income", "revenue expenses"],
    urKeywords: ["profit loss", "P&L", "munafa", "nuqsaan", "profit", "loss"],
    enResponses: [
      "📈 **Profit & Loss (P&L) Report**:\n\n1. Go to **Dashboard → Reports → Profit & Loss**\n2. Select period (monthly, quarterly, yearly)\n3. View:\n   • **Revenue** — all income\n   • **Cost of Goods Sold (COGS)**\n   • **Gross Profit**\n   • **Operating Expenses**\n   • **Net Profit/Loss**\n\nExport to PDF for management or tax purposes.",
    ],
    urResponses: [
      "📈 **Profit & Loss (P&L) Report** banane ke liye:\n\n1. **Dashboard → Reports → Profit & Loss** pe jao\n2. Period select karo (mahina, quarter, saal)\n3. Dekho:\n   • **Revenue** — tamam income\n   • **COGS** — maal ki cost\n   • **Gross Profit**\n   • **Operating Expenses**\n   • **Net Profit/Loss**\n\nPDF export karo management ya tax ke liye.",
    ],
    urScriptResponses: [
      "📈 **منافع و نقصان (P&L) رپورٹ** کے لیے:\n\n1. **ڈیش بورڈ ← رپورٹس ← منافع و نقصان** پر جائیں\n2. مدت منتخب کریں (مہینہ، سہ ماہی، سال)\n3. دیکھیں:\n   • **آمدن** — تمام آمدنی\n   • **COGS** — مال کی لاگت\n   • **مجموعی منافع**\n   • **آپریٹنگ اخراجات**\n   • **خالص منافع/نقصان**\n\nانتظامیہ یا ٹیکس کے لیے PDF برآمد کریں۔",
    ],
    confidence: 0.9,
  },

  // ── Balance Sheet ─────────────────────────────────────────────────────────────
  {
    id: "balance_sheet",
    enKeywords: ["balance sheet", "financial position", "assets liabilities", "equity", "net worth"],
    urKeywords: ["balance sheet", "assets", "liabilities", "equity"],
    enResponses: [
      "📊 **Balance Sheet** shows your financial position:\n\n1. Go to **Dashboard → Reports → Balance Sheet**\n2. Select a date\n3. View:\n   • **Assets** — current & fixed\n   • **Liabilities** — payables, loans\n   • **Equity** — owner's capital + retained earnings\n\nAssets = Liabilities + Equity. If not balanced, check your entries!",
    ],
    urResponses: [
      "📊 **Balance Sheet** financial position dikhata hai:\n\n1. **Dashboard → Reports → Balance Sheet** pe jao\n2. Date select karo\n3. Dekho:\n   • **Assets** — current & fixed\n   • **Liabilities** — payables, loans\n   • **Equity** — owner's capital + retained earnings\n\nAssets = Liabilities + Equity hona chahiye.",
    ],
    urScriptResponses: [
      "📊 **بیلنس شیٹ** مالیاتی حیثیت دکھاتی ہے:\n\n1. **ڈیش بورڈ ← رپورٹس ← بیلنس شیٹ** پر جائیں\n2. تاریخ منتخب کریں\n3. دیکھیں:\n   • **اثاثے** — موجودہ اور ثابت\n   • **ذمہ داریاں** — واجبات، قرضے\n   • **ایکویٹی** — مالک کا سرمایہ + برقرار آمدنی\n\nاثاثے = ذمہ داریاں + ایکویٹی ہونا چاہیے۔",
    ],
    confidence: 0.9,
  },

  // ── Cash Flow ─────────────────────────────────────────────────────────────────
  {
    id: "cash_flow",
    enKeywords: ["cash flow", "cash statement", "liquidity", "cash position"],
    urKeywords: ["cash flow", "naqd", "cash position"],
    enResponses: [
      "💸 **Cash Flow Report** tracks cash coming in and going out:\n\n1. Go to **Dashboard → Reports → Cash Flow**\n2. Select period\n3. View three sections:\n   • **Operating Activities** — day-to-day business cash flows\n   • **Investing Activities** — asset purchases/sales\n   • **Financing Activities** — loans, capital\n\nHelps you understand actual cash availability vs profit on paper.",
    ],
    urResponses: [
      "💸 **Cash Flow Report** cash aane jaane ka track:\n\n1. **Dashboard → Reports → Cash Flow** pe jao\n2. Period select karo\n3. Teen sections:\n   • **Operating Activities** — routine business\n   • **Investing Activities** — assets\n   • **Financing Activities** — loans, capital\n\nActual cash availability vs paper profit mein farq dikhata hai.",
    ],
    urScriptResponses: [
      "💸 **کیش فلو رپورٹ** نقد آنے جانے کا ٹریک:\n\n1. **ڈیش بورڈ ← رپورٹس ← کیش فلو** پر جائیں\n2. مدت منتخب کریں\n3. تین حصے:\n   • **آپریٹنگ سرگرمیاں** — روزمرہ کاروبار\n   • **سرمایہ کاری سرگرمیاں** — اثاثے\n   • **مالیاتی سرگرمیاں** — قرضے، سرمایہ\n\nحقیقی نقد دستیابی بمقابلہ کاغذی منافع میں فرق دکھاتا ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Tax Report ────────────────────────────────────────────────────────────────
  {
    id: "tax_report",
    enKeywords: ["tax summary", "tax report", "GST", "sales tax", "income tax", "withholding tax", "tax", "FBR"],
    urKeywords: ["tax", "GST", "sales tax", "income tax", "tax report", "FBR", "withholding"],
    enResponses: [
      "🧾 **Tax Summary Report**:\n\n1. Go to **Dashboard → Reports → Tax Summary**\n2. Select period\n3. View all tax collected and tax paid\n4. Export for FBR/tax filing purposes\n\nMake sure your **Tax Configuration** (Dashboard → Tax Configuration) is set up with correct tax types and rates before recording transactions.",
    ],
    urResponses: [
      "🧾 **Tax Summary Report** ke liye:\n\n1. **Dashboard → Reports → Tax Summary** pe jao\n2. Period select karo\n3. Tax collected aur tax paid dekho\n4. FBR ya tax filing ke liye export karo\n\nPehle **Tax Configuration** mein tax types aur rates set karo.",
    ],
    urScriptResponses: [
      "🧾 **ٹیکس خلاصہ رپورٹ** کے لیے:\n\n1. **ڈیش بورڈ ← رپورٹس ← ٹیکس خلاصہ** پر جائیں\n2. مدت منتخب کریں\n3. وصول شدہ ٹیکس اور ادا شدہ ٹیکس دیکھیں\n4. FBR یا ٹیکس فائلنگ کے لیے برآمد کریں\n\nپہلے **ٹیکس کنفیگریشن** میں ٹیکس اقسام اور شرحیں مقرر کریں۔",
    ],
    confidence: 0.9,
  },

  // ── Reports General ───────────────────────────────────────────────────────────
  {
    id: "reports_general",
    enKeywords: ["reports", "report", "reporting", "analytics", "financial statements", "statements", "all reports"],
    urKeywords: ["reports", "report", "rports", "reporting", "financial statements", "tamam reports"],
    enResponses: [
      "📊 **Reports available in Finova:**\n\n• 📖 **Ledger** — full history of any account\n• ⚖️ **Trial Balance** — all account balances\n• 📈 **Profit & Loss** — income vs expenses\n• 📊 **Balance Sheet** — assets, liabilities, equity\n• 💸 **Cash Flow** — cash in vs out\n• 🧾 **Tax Summary** — GST/Sales tax report\n• 📅 **Ageing Report** — overdue receivables & payables\n• 📦 **Inventory Reports** — stock valuation, movement\n• 📋 **Compliance Reports** — regulatory filings\n\nAll reports can be exported to PDF or Excel. Which report do you need?",
    ],
    urResponses: [
      "📊 **Finova mein available reports:**\n\n• 📖 **Ledger** — kisi bhi account ki puri history\n• ⚖️ **Trial Balance** — tamam accounts ke balances\n• 📈 **Profit & Loss** — income vs expenses\n• 📊 **Balance Sheet** — assets, liabilities, equity\n• 💸 **Cash Flow** — cash aana jaana\n• 🧾 **Tax Summary** — GST/Sales tax report\n• 📅 **Ageing Report** — overdue receivables & payables\n• 📦 **Inventory Reports** — stock valuation\n• 📋 **Compliance Reports** — regulatory\n\nSab reports PDF ya Excel mein export ho sakte hain. Kaun sa report chahiye?",
    ],
    urScriptResponses: [
      "📊 **فنووا میں دستیاب رپورٹس:**\n\n• 📖 **لیجر** — کسی بھی اکاؤنٹ کی پوری تاریخ\n• ⚖️ **ٹرائل بیلنس** — تمام اکاؤنٹس کے بیلنسز\n• 📈 **منافع و نقصان** — آمدن بمقابلہ اخراجات\n• 📊 **بیلنس شیٹ** — اثاثے، ذمہ داریاں، ایکویٹی\n• 💸 **کیش فلو** — نقد آنا جانا\n• 🧾 **ٹیکس خلاصہ** — GST/سیلز ٹیکس رپورٹ\n• 📅 **ایجنگ رپورٹ** — زائد المیعاد وصولیاں اور ادائیگیاں\n• 📦 **انوینٹری رپورٹس** — اسٹاک ویلیویشن\n• 📋 **تعمیل رپورٹس** — ریگولیٹری\n\nتمام رپورٹس PDF یا Excel میں برآمد ہو سکتی ہیں۔ کون سی رپورٹ چاہیے؟",
    ],
    confidence: 0.9,
  },

  // ── Ageing Report ─────────────────────────────────────────────────────────────
  {
    id: "ageing_report",
    enKeywords: ["ageing", "aging", "overdue", "receivables", "payables", "outstanding", "dues", "collection"],
    urKeywords: ["ageing", "overdue", "baqi", "outstanding", "dues", "kaise collect karein"],
    enResponses: [
      "📅 **Ageing Report** shows overdue receivables and payables:\n\n1. Go to **Dashboard → Reports → Ageing**\n2. Choose **Receivables** (money owed TO you) or **Payables** (money you OWE)\n3. View buckets: 0-30, 31-60, 61-90, 90+ days overdue\n4. Export and follow up with customers/suppliers\n\nGreat for managing cash flow and collections!",
    ],
    urResponses: [
      "📅 **Ageing Report** overdue amounts dikhata hai:\n\n1. **Dashboard → Reports → Ageing** pe jao\n2. **Receivables** (jo aapko milna hai) ya **Payables** (jo aapko dena hai) chunen\n3. Buckets: 0-30, 31-60, 61-90, 90+ din overdue\n4. Export karo aur follow-up karo\n\nCash flow manage karne ke liye bohat useful!",
    ],
    urScriptResponses: [
      "📅 **ایجنگ رپورٹ** زائد المیعاد رقمیں دکھاتی ہے:\n\n1. **ڈیش بورڈ ← رپورٹس ← ایجنگ** پر جائیں\n2. **وصولیاں** (جو آپ کو ملنا ہے) یا **ادائیگیاں** (جو آپ کو دینا ہے) منتخب کریں\n3. بالٹیاں: 0-30، 31-60، 61-90، 90+ دن زائد المیعاد\n4. برآمد کریں اور فالو اپ کریں\n\nنقد بہاؤ منظم کرنے کے لیے بہت مفید!",
    ],
    confidence: 0.9,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────────
  {
    id: "inventory",
    enKeywords: ["inventory", "stock", "items", "product catalog", "warehouse", "stock level", "in stock"],
    urKeywords: ["inventory", "stock", "maal", "items", "product"],
    enResponses: [
      "📦 **Inventory Management** in Finova:\n\n1. Go to **Dashboard → Inventory / Items**\n2. Add products with SKU, category, unit of measure\n3. Set opening stock and stock rates\n4. Track stock movement through purchases (GRN) and sales (invoices)\n5. View current stock level and valuation anytime\n\nStock is updated automatically with every sales/purchase transaction!",
    ],
    urResponses: [
      "📦 **Inventory Management**:\n\n1. **Dashboard → Inventory / Items** pe jao\n2. Products add karo (SKU, category, unit)\n3. Opening stock aur stock rates set karo\n4. Purchases (GRN) aur sales (invoices) se stock automatic track hota hai\n5. Current stock aur valuation kisi bhi waqt dekho\n\nHar transaction pe stock automatically update hota hai!",
    ],
    urScriptResponses: [
      "📦 **انوینٹری مینجمنٹ**:\n\n1. **ڈیش بورڈ ← انوینٹری / آئٹمز** پر جائیں\n2. پروڈکٹس شامل کریں (SKU، زمرہ، اکائی)\n3. ابتدائی اسٹاک اور اسٹاک ریٹس مقرر کریں\n4. خریداری (GRN) اور فروخت (انوائسز) سے اسٹاک خودبخود ٹریک ہوتا ہے\n5. کسی بھی وقت موجودہ اسٹاک اور ویلیویشن دیکھیں\n\nہر لین دین پر اسٹاک خودبخود اپ ڈیٹ ہوتا ہے!",
    ],
    confidence: 0.9,
  },

  // ── HR & Payroll ──────────────────────────────────────────────────────────────
  {
    id: "hr_payroll",
    enKeywords: ["HR", "payroll", "salary", "employee", "staff", "human resources", "workforce", "salaries"],
    urKeywords: ["HR", "payroll", "salary", "employee", "staff", "mulazim", "tankhwah"],
    enResponses: [
      "👥 **HR & Payroll** module (Pro & Enterprise):\n\n• **Employees** — add employee profiles, contracts, documents\n• **Attendance** — daily attendance marking\n• **Leaves** — leave applications and approvals\n• **Payroll** — run monthly payroll with auto calculations\n• **Advance Salary** — advance payment management\n\nGo to **Dashboard → Employees / Payroll** to get started.",
    ],
    urResponses: [
      "👥 **HR & Payroll** module (Pro & Enterprise):\n\n• **Employees** — employee profiles, contracts, documents\n• **Attendance** — roz ki haziri\n• **Leaves** — leave applications aur approvals\n• **Payroll** — mahana salary automatic calculate ho\n• **Advance Salary** — advance payment\n\n**Dashboard → Employees / Payroll** pe jao.",
    ],
    urScriptResponses: [
      "👥 **HR اور پے رول** ماڈیول (پرو اور انٹرپرائز):\n\n• **ملازمین** — ملازم پروفائلز، معاہدے، دستاویزات\n• **حاضری** — روزانہ کی حاضری\n• **چھٹیاں** — چھٹی کی درخواستیں اور منظوریاں\n• **پے رول** — ماہانہ تنخواہ خودبخود حساب کرے\n• **ایڈوانس تنخواہ** — ایڈوانس ادائیگی\n\n**ڈیش بورڈ ← ملازمین / پے رول** پر جائیں۔",
    ],
    confidence: 0.9,
  },

  // ── Attendance ────────────────────────────────────────────────────────────────
  {
    id: "attendance",
    enKeywords: ["attendance", "present", "absent", "mark attendance", "daily attendance"],
    urKeywords: ["attendance", "haziri", "present", "absent", "ghair hazir"],
    enResponses: [
      "🕐 **Attendance** tracking:\n\n1. Go to **Dashboard → Attendance**\n2. Select date\n3. Mark each employee as Present, Absent, Half-day, or On Leave\n4. Save — attendance feeds into payroll calculation automatically\n\nYou can also view monthly attendance summary per employee.",
    ],
    urResponses: [
      "🕐 **Attendance** track karne ke liye:\n\n1. **Dashboard → Attendance** pe jao\n2. Date select karo\n3. Har employee ko Present, Absent, Half-day ya Leave mark karo\n4. Save — payroll calculation mein automatic use hota hai\n\nMahane ki attendance summary bhi dekh sakte hain.",
    ],
    urScriptResponses: [
      "🕐 **حاضری** ٹریک کرنے کے لیے:\n\n1. **ڈیش بورڈ ← حاضری** پر جائیں\n2. تاریخ منتخب کریں\n3. ہر ملازم کو حاضر، غیر حاضر، نصف دن یا چھٹی پر نشان لگائیں\n4. محفوظ کریں — پے رول حساب میں خودبخود استعمال ہوتا ہے\n\nمہینے کی حاضری کا خلاصہ بھی دیکھ سکتے ہیں۔",
    ],
    confidence: 0.9,
  },

  // ── CRM ───────────────────────────────────────────────────────────────────────
  {
    id: "crm",
    enKeywords: ["CRM", "contacts", "customers", "leads", "pipeline", "opportunities", "interactions", "follow up"],
    urKeywords: ["CRM", "contacts", "customers", "leads", "pipeline", "opportunities"],
    enResponses: [
      "🤝 **CRM Module** (Pro & Enterprise):\n\n• **Contacts** — manage customers, suppliers, leads\n• **Interactions** — log calls, emails, meetings\n• **Opportunities** — track sales deals & pipeline\n• **Notes** — add notes to contacts\n• **Documents** — attach files to contact records\n\nGo to **Dashboard → CRM → Contacts** to start managing your relationships.",
    ],
    urResponses: [
      "🤝 **CRM Module** (Pro & Enterprise):\n\n• **Contacts** — customers, suppliers, leads manage karo\n• **Interactions** — calls, emails, meetings log karo\n• **Opportunities** — sales deals & pipeline track karo\n• **Notes** — contacts pe notes\n\n**Dashboard → CRM → Contacts** pe jao.",
    ],
    urScriptResponses: [
      "🤝 **CRM ماڈیول** (پرو اور انٹرپرائز):\n\n• **کانٹیکٹس** — کسٹمرز، سپلائرز، لیڈز منظم کریں\n• **تعاملات** — کالز، ای میلز، میٹنگز لاگ کریں\n• **مواقع** — سیلز ڈیلز اور پائپ لائن ٹریک کریں\n• **نوٹس** — کانٹیکٹس پر نوٹس\n\n**ڈیش بورڈ ← CRM ← کانٹیکٹس** پر جائیں۔",
    ],
    confidence: 0.9,
  },

  // ── Users & Permissions ───────────────────────────────────────────────────────
  {
    id: "users_permissions",
    enKeywords: ["users", "add user", "user management", "roles", "permissions", "access", "team member", "staff access"],
    urKeywords: ["users", "user add", "roles", "permissions", "access", "team"],
    enResponses: [
      "👤 **User & Permission Management**:\n\n1. Go to **Dashboard → Users**\n2. Click **+ Add User** — enter name, email, role\n3. Go to **Dashboard → Roles & Permissions**\n4. Assign roles (Admin, Accountant, Viewer, etc.)\n5. Customize module-level access per role\n\nYou can restrict what each user can see and do in the system.",
    ],
    urResponses: [
      "👤 **User & Permission Management**:\n\n1. **Dashboard → Users** pe jao\n2. **+ Add User** — naam, email, role dalo\n3. **Dashboard → Roles & Permissions** pe jao\n4. Roles assign karo (Admin, Accountant, Viewer, etc.)\n5. Module-level access customize karo\n\nHar user ke liye alag alag access set kar sakte ho.",
    ],
    urScriptResponses: [
      "👤 **یوزر اور اجازت مینجمنٹ**:\n\n1. **ڈیش بورڈ ← یوزرز** پر جائیں\n2. **+ یوزر شامل کریں** — نام، ای میل، کردار داخل کریں\n3. **ڈیش بورڈ ← کردار اور اجازتیں** پر جائیں\n4. کردار تفویض کریں (ایڈمن، اکاؤنٹنٹ، ناظر، وغیرہ)\n5. ماڈیول سطح کی رسائی اپنی مرضی کے مطابق کریں\n\nہر یوزر کے لیے الگ الگ رسائی مقرر کر سکتے ہیں۔",
    ],
    confidence: 0.9,
  },

  // ── Backup & Restore ──────────────────────────────────────────────────────────
  {
    id: "backup",
    enKeywords: ["backup", "restore", "data backup", "data recovery", "export data"],
    urKeywords: ["backup", "restore", "data backup", "data save", "recovery"],
    enResponses: [
      "💾 **Backup & Restore**:\n\n1. Go to **Dashboard → Backup & Restore**\n2. Click **Create Backup** — a full database backup is created\n3. Download the backup file to keep it safe\n4. To restore: upload a backup file and click **Restore**\n\nWe recommend taking weekly backups. Backups are stored securely in the system.",
    ],
    urResponses: [
      "💾 **Backup & Restore**:\n\n1. **Dashboard → Backup & Restore** pe jao\n2. **Create Backup** click karo — puri database ka backup banta hai\n3. Backup file download karo safe rakhne ke liye\n4. Restore karne ke liye: backup file upload karo aur **Restore** click karo\n\nHafta mein ek baar backup lena recommended hai.",
    ],
    urScriptResponses: [
      "💾 **بیک اپ اور ریسٹور**:\n\n1. **ڈیش بورڈ ← بیک اپ اور ریسٹور** پر جائیں\n2. **بیک اپ بنائیں** کلک کریں — پوری ڈیٹا بیس کا بیک اپ بنتا ہے\n3. بیک اپ فائل ڈاؤن لوڈ کریں محفوظ رکھنے کے لیے\n4. ریسٹور کرنے کے لیے: بیک اپ فائل اپ لوڈ کریں اور **ریسٹور** کلک کریں\n\nہفتے میں ایک بار بیک اپ لینا تجویز کیا جاتا ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Opening Balances ──────────────────────────────────────────────────────────
  {
    id: "opening_balances",
    enKeywords: ["opening balance", "beginning balance", "starting balance", "initial balance", "first time setup"],
    urKeywords: ["opening balance", "shuru ki raqam", "pehla balance", "initial balance"],
    enResponses: [
      "🔢 **Opening Balances** — when you start using Finova mid-year:\n\n1. Go to **Dashboard → Opening Balances**\n2. Enter balances for all accounts (cash, bank, debtors, creditors, etc.)\n3. Set the opening date (start of your accounting period)\n4. Save — all subsequent transactions build on these balances\n\nGet this right first — it affects all your reports!",
    ],
    urResponses: [
      "🔢 **Opening Balances** — saal ke beech mein Finova shuru karte waqt:\n\n1. **Dashboard → Opening Balances** pe jao\n2. Tamam accounts ke balances enter karo (cash, bank, debtors, creditors)\n3. Opening date set karo (accounting period ka pehla din)\n4. Save — sab future transactions inhi pe build honge\n\nYeh sahi karo sabse pehle — sab reports isi pe depend hain!",
    ],
    urScriptResponses: [
      "🔢 **ابتدائی بیلنسز** — سال کے درمیان فنووا شروع کرتے وقت:\n\n1. **ڈیش بورڈ ← ابتدائی بیلنسز** پر جائیں\n2. تمام اکاؤنٹس کے بیلنسز داخل کریں (نقد، بینک، مقروضین، قرضداران)\n3. ابتدائی تاریخ مقرر کریں (محاسبہ مدت کا پہلا دن)\n4. محفوظ کریں — تمام آئندہ لین دین انہی پر بنیں گے\n\nیہ سب سے پہلے درست کریں — تمام رپورٹس اسی پر منحصر ہیں!",
    ],
    confidence: 0.9,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  {
    id: "dashboard",
    enKeywords: ["dashboard", "home page", "overview", "summary", "main page", "KPI"],
    urKeywords: ["dashboard", "home", "main page", "overview"],
    enResponses: [
      "🏠 The **Dashboard** gives you a real-time overview of your business:\n\n• Total sales, purchases, and expenses\n• Outstanding receivables and payables\n• Bank account balances\n• Recent transactions\n• Key financial charts\n\nAccess all modules from the sidebar on the left. The dashboard updates automatically as you add transactions.",
    ],
    urResponses: [
      "🏠 **Dashboard** pe real-time business overview milta hai:\n\n• Total sales, purchases, expenses\n• Outstanding receivables aur payables\n• Bank account balances\n• Recent transactions\n• Financial charts\n\nLeft sidebar se sab modules access karo. Transactions add karte hi dashboard update hota hai.",
    ],
    urScriptResponses: [
      "🏠 **ڈیش بورڈ** پر ریئل ٹائم کاروباری جائزہ ملتا ہے:\n\n• کل فروخت، خریداری، اخراجات\n• زیر التوا وصولیاں اور ادائیگیاں\n• بینک اکاؤنٹ بیلنسز\n• حالیہ لین دین\n• مالیاتی چارٹس\n\nبائیں طرف سائڈبار سے تمام ماڈیولز رسائی کریں۔ لین دین شامل کرتے ہی ڈیش بورڈ اپ ڈیٹ ہوتا ہے۔",
    ],
    confidence: 0.85,
  },

  // ── Import Data ───────────────────────────────────────────────────────────────
  {
    id: "import_data",
    enKeywords: ["import", "data import", "excel import", "CSV import", "bulk upload", "migrate data"],
    urKeywords: ["import", "data import", "excel upload", "CSV", "bulk upload"],
    enResponses: [
      "📤 **Data Import** wizard:\n\n1. Go to **Dashboard → Import Wizard**\n2. Select what to import (contacts, items, invoices, etc.)\n3. Download the template Excel file\n4. Fill in your data in the template\n5. Upload the file — system validates and imports\n\nStart with items/contacts, then historical invoices if needed.",
    ],
    urResponses: [
      "📤 **Data Import** wizard se:\n\n1. **Dashboard → Import Wizard** pe jao\n2. Kya import karna hai select karo (contacts, items, invoices, etc.)\n3. Template Excel file download karo\n4. Data fill karo template mein\n5. File upload karo — system validate karke import karega\n\nPehle items/contacts import karo, phir historical invoices.",
    ],
    urScriptResponses: [
      "📤 **ڈیٹا درآمد** وزرڈ سے:\n\n1. **ڈیش بورڈ ← درآمد وزرڈ** پر جائیں\n2. کیا درآمد کرنا ہے منتخب کریں (کانٹیکٹس، آئٹمز، انوائسز، وغیرہ)\n3. ٹیمپلیٹ Excel فائل ڈاؤن لوڈ کریں\n4. ٹیمپلیٹ میں ڈیٹا بھریں\n5. فائل اپ لوڈ کریں — سسٹم تصدیق کر کے درآمد کرے گا\n\nپہلے آئٹمز/کانٹیکٹس درآمد کریں، پھر تاریخی انوائسز۔",
    ],
    confidence: 0.9,
  },

  // ── Billing & Subscription ────────────────────────────────────────────────────
  {
    id: "billing_subscription",
    enKeywords: ["billing", "subscription", "renew", "renewal", "payment", "plan billing", "monthly billing", "subscription management"],
    urKeywords: ["billing", "subscription", "renewal", "payment", "plan payment"],
    enResponses: [
      "💳 **Billing & Subscription**:\n\n1. Go to **Dashboard → Billing**\n2. View your current plan and billing cycle\n3. Upgrade or downgrade plan anytime\n4. Payment history available\n\nFor billing issues or invoice requests, connect with our support team. Subscriptions renew automatically unless cancelled.",
    ],
    urResponses: [
      "💳 **Billing & Subscription**:\n\n1. **Dashboard → Billing** pe jao\n2. Current plan aur billing cycle dekho\n3. Upgrade ya downgrade karo kabhi bhi\n4. Payment history available hai\n\nBilling issues ke liye support team se contact karo. Subscription automatic renew hoti hai jab tak cancel na karo.",
    ],
    urScriptResponses: [
      "💳 **بلنگ اور سبسکرپشن**:\n\n1. **ڈیش بورڈ ← بلنگ** پر جائیں\n2. موجودہ پلان اور بلنگ سائیکل دیکھیں\n3. کسی بھی وقت اپ گریڈ یا ڈاؤن گریڈ کریں\n4. ادائیگی کی تاریخ دستیاب ہے\n\nبلنگ مسائل کے لیے سپورٹ ٹیم سے رابطہ کریں۔ سبسکرپشن خودبخود تجدید ہوتی ہے جب تک منسوخ نہ کریں۔",
    ],
    confidence: 0.9,
  },

  // ── Login Issue ───────────────────────────────────────────────────────────────
  {
    id: "login_issue",
    enKeywords: ["login", "can't login", "forgot password", "password reset", "locked out", "access denied", "sign in"],
    urKeywords: ["login", "login nahi ho raha", "password bhool gaya", "password reset", "access nahi"],
    enResponses: [
      "🔐 **Login Issues**:\n\n• **Forgot Password?** Click 'Forgot Password' on login page → OTP sent to email → reset password\n• **Account locked?** Wait 15 minutes and try again, or contact your admin\n• **Wrong email?** Make sure you're using the email address you signed up with\n• **Still stuck?** Connect with a human agent below — they can unlock your account\n\nNeed any of these options?",
    ],
    urResponses: [
      "🔐 **Login Issues**:\n\n• **Password bhool gaye?** Login page pe 'Forgot Password' click karo → email pe OTP aayega → password reset karo\n• **Account lock hua?** 15 minute baad try karo ya admin se poocho\n• **Wrong email?** Wahi email use karo jis se signup kiya tha\n• **Phir bhi problem?** Human agent se baat karo — wo account unlock kar sakte hain\n\nKis cheez ki zaroorat hai?",
    ],
    urScriptResponses: [
      "🔐 **لاگ ان مسائل**:\n\n• **پاس ورڈ بھول گئے؟** لاگ ان صفحے پر 'پاس ورڈ بھول گئے' کلک کریں ← ای میل پر OTP آئے گا ← پاس ورڈ دوبارہ مقرر کریں\n• **اکاؤنٹ لاک ہوا؟** 15 منٹ بعد کوشش کریں یا ایڈمن سے پوچھیں\n• **غلط ای میل؟** وہی ای میل استعمال کریں جس سے سائن اپ کیا تھا\n• **پھر بھی مسئلہ؟** انسانی ایجنٹ سے بات کریں — وہ اکاؤنٹ کھول سکتے ہیں\n\nکس چیز کی ضرورت ہے؟",
    ],
    confidence: 0.92,
  },

  // ── Error / Not Working ───────────────────────────────────────────────────────
  {
    id: "not_working",
    enKeywords: ["not working", "error", "bug", "crash", "problem", "issue", "broken", "failed", "page not loading", "500", "404"],
    urKeywords: ["kaam nahi kar raha", "error aa raha", "problem hai", "kuch nahi ho raha", "band ho gaya", "crash"],
    enResponses: [
      "😟 I'm sorry you're having trouble! Here are some quick fixes:\n\n1. **Refresh the page** (Ctrl+R or F5)\n2. **Clear browser cache** (Ctrl+Shift+Delete)\n3. **Try a different browser** (Chrome recommended)\n4. **Check your internet connection**\n5. **Log out and log back in**\n\nIf the problem persists, please tell me exactly what you're trying to do and I'll connect you with a human agent who can investigate further.",
    ],
    urResponses: [
      "😟 Afsos! Kuch quick fixes try karo:\n\n1. **Page refresh karo** (Ctrl+R)\n2. **Browser cache clear karo** (Ctrl+Shift+Delete)\n3. **Dusra browser try karo** (Chrome recommend hai)\n4. **Internet connection check karo**\n5. **Logout karke wapas login karo**\n\nAgar phir bhi problem ho to bataio kya kar rahe the — main human agent se connect karunga.",
    ],
    urScriptResponses: [
      "😟 افسوس! کچھ فوری حل آزمائیں:\n\n1. **صفحہ تازہ کریں** (Ctrl+R)\n2. **براؤزر کیشے صاف کریں** (Ctrl+Shift+Delete)\n3. **دوسرا براؤزر آزمائیں** (Chrome تجویز کیا جاتا ہے)\n4. **انٹرنیٹ کنکشن جانچیں**\n5. **لاگ آؤٹ کر کے واپس لاگ ان کریں**\n\nاگر پھر بھی مسئلہ ہو تو بتائیں کیا کر رہے تھے — میں انسانی ایجنٹ سے جوڑوں گا۔",
    ],
    confidence: 0.88,
  },

  // ── Data Security ─────────────────────────────────────────────────────────────
  {
    id: "data_security",
    enKeywords: ["security", "data safe", "encryption", "privacy", "GDPR", "data protection", "who can see", "secure"],
    urKeywords: ["security", "data safe hai", "encryption", "privacy", "kon dekh sakta"],
    enResponses: [
      "🔒 **Finova Security**:\n\n• All data is **encrypted at rest and in transit** (AES-256 + TLS)\n• **Multi-tenant isolation** — your data is completely separate from other companies\n• **Role-based access** — each user only sees what you permit\n• **Audit log** — every action is logged with timestamp and user\n• Regular **automated backups**\n• **Session management** — automatic logout on inactivity\n\nYour business data is safe with us!",
    ],
    urResponses: [
      "🔒 **Finova Security**:\n\n• Data **encrypted** hai — rest mein bhi, transit mein bhi (AES-256 + TLS)\n• **Multi-tenant isolation** — aapka data bilkul alag hai\n• **Role-based access** — har user sirf wo dekhe jo aap allow karo\n• **Audit log** — har action ka record\n• Regular **automated backups**\n• **Session management** — inactive hone pe automatic logout\n\nAapka data bilkul safe hai!",
    ],
    urScriptResponses: [
      "🔒 **فنووا سیکیورٹی**:\n\n• ڈیٹا **انکرپٹڈ** ہے — آرام میں بھی، منتقلی میں بھی (AES-256 + TLS)\n• **ملٹی ٹیننٹ الگاؤ** — آپ کا ڈیٹا بالکل الگ ہے\n• **کردار پر مبنی رسائی** — ہر یوزر صرف وہ دیکھے جو آپ اجازت دیں\n• **آڈٹ لاگ** — ہر عمل کا ریکارڈ\n• باقاعدہ **خودکار بیک اپس**\n• **سیشن مینجمنٹ** — غیر فعال ہونے پر خودکار لاگ آؤٹ\n\nآپ کا ڈیٹا بالکل محفوظ ہے!",
    ],
    confidence: 0.9,
  },

  // ── Multi Company ─────────────────────────────────────────────────────────────
  {
    id: "multi_company",
    enKeywords: ["multi company", "multiple companies", "second company", "another company", "switch company"],
    urKeywords: ["multi company", "kai companies", "doosri company", "company switch"],
    enResponses: [
      "🏢 **Multiple Companies**:\n\nFinova supports managing multiple companies under one account!\n\n1. Go to **Dashboard → Companies**\n2. Click **+ Add Company**\n3. Enter company details\n4. Switch between companies from the top navigation\n\nEach company has completely separate data — accounts, invoices, inventory, etc.",
    ],
    urResponses: [
      "🏢 **Multiple Companies** support:\n\nEk account se kai companies manage kar sakte hain!\n\n1. **Dashboard → Companies** pe jao\n2. **+ Add Company** click karo\n3. Company details enter karo\n4. Top navigation se companies switch karo\n\nHar company ka data bilkul alag hota hai.",
    ],
    urScriptResponses: [
      "🏢 **متعدد کمپنیاں** سپورٹ:\n\nایک اکاؤنٹ سے کئی کمپنیاں منظم کر سکتے ہیں!\n\n1. **ڈیش بورڈ ← کمپنیاں** پر جائیں\n2. **+ کمپنی شامل کریں** کلک کریں\n3. کمپنی کی تفصیلات داخل کریں\n4. اوپر نیویگیشن سے کمپنیاں بدلیں\n\nہر کمپنی کا ڈیٹا بالکل الگ ہوتا ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Audit Log ─────────────────────────────────────────────────────────────────
  {
    id: "audit_log",
    enKeywords: ["audit log", "activity log", "who changed", "history", "track changes", "user activity"],
    urKeywords: ["audit log", "history", "kis ne change kiya", "activity log"],
    enResponses: [
      "🔍 **Audit Log** tracks every action in the system:\n\n1. Go to **Dashboard → Users → Activity Logs**\n2. Filter by user, date, or action type\n3. See who created, edited, or deleted what and when\n\nThis is available on Pro & Enterprise plans. Great for accountability and compliance!",
    ],
    urResponses: [
      "🔍 **Audit Log** se har action track hota hai:\n\n1. **Dashboard → Users → Activity Logs** pe jao\n2. User, date ya action type se filter karo\n3. Dekho kisne kya banaya, edit ya delete kiya\n\nPro & Enterprise plans mein available hai. Accountability ke liye best!",
    ],
    urScriptResponses: [
      "🔍 **آڈٹ لاگ** سے ہر عمل ٹریک ہوتا ہے:\n\n1. **ڈیش بورڈ ← یوزرز ← سرگرمی لاگز** پر جائیں\n2. یوزر، تاریخ یا عمل کی قسم سے فلٹر کریں\n3. دیکھیں کس نے کیا بنایا، ترمیم یا حذف کیا\n\nپرو اور انٹرپرائز پلانز میں دستیاب ہے۔ جوابدہی کے لیے بہترین!",
    ],
    confidence: 0.9,
  },

  // ── Mobile App ────────────────────────────────────────────────────────────────
  {
    id: "mobile_app",
    enKeywords: ["mobile app", "android", "ios", "iphone", "phone app", "mobile"],
    urKeywords: ["mobile app", "android", "iOS", "phone", "mobile"],
    enResponses: [
      "📱 Finova is a **web-based application** that works on all devices through your browser — no app download needed!\n\nSimply open your browser on mobile and go to the Finova URL. The interface is mobile-responsive.\n\nA dedicated mobile app may be coming in future updates — stay tuned!",
    ],
    urResponses: [
      "📱 Finova ek **web-based application** hai — kisi bhi device ke browser mein kaam karta hai, app download ki zaroorat nahi!\n\nMobile mein browser kholo aur Finova URL pe jao. Interface mobile-friendly hai.\n\nDedicated mobile app future mein aane wali hai — stay tuned!",
    ],
    urScriptResponses: [
      "📱 فنووا ایک **ویب بیسڈ ایپلیکیشن** ہے — کسی بھی ڈیوائس کے براؤزر میں کام کرتا ہے، ایپ ڈاؤن لوڈ کی ضرورت نہیں!\n\nموبائل میں براؤزر کھولیں اور فنووا URL پر جائیں۔ انٹرفیس موبائل دوست ہے۔\n\nمخصوص موبائل ایپ مستقبل میں آنے والی ہے — توجہ رکھیں!",
    ],
    confidence: 0.9,
  },

  // ── Advance Payment ───────────────────────────────────────────────────────────
  {
    id: "advance_payment",
    enKeywords: ["advance payment", "advance", "prepayment", "deposit", "token money"],
    urKeywords: ["advance payment", "advance", "peshgi", "token"],
    enResponses: [
      "💵 **Advance Payment** management:\n\n1. Go to **Dashboard → Advance Payment**\n2. Record advance received from customer or paid to supplier\n3. When final invoice is created, **adjust** the advance against it\n4. Balance is automatically calculated\n\nThis prevents double-counting and keeps your ledger accurate.",
    ],
    urResponses: [
      "💵 **Advance Payment**:\n\n1. **Dashboard → Advance Payment** pe jao\n2. Customer se ya supplier ko advance record karo\n3. Final invoice banana pe advance **adjust** karo\n4. Balance automatic calculate hota hai\n\nDouble counting se bachta hai aur ledger accurate rehta hai.",
    ],
    urScriptResponses: [
      "💵 **ایڈوانس ادائیگی**:\n\n1. **ڈیش بورڈ ← ایڈوانس ادائیگی** پر جائیں\n2. کسٹمر سے یا سپلائر کو ایڈوانس ریکارڈ کریں\n3. حتمی انوائس بناتے وقت ایڈوانس **ایڈجسٹ** کریں\n4. بیلنس خودبخود حساب ہوتا ہے\n\nدوہری گنتی سے بچتا ہے اور لیجر درست رہتا ہے۔",
    ],
    confidence: 0.9,
  },

  // ── Escalate ─────────────────────────────────────────────────────────────────
  {
    id: "escalate",
    enKeywords: ["human", "agent", "person", "real person", "support team", "talk to someone", "live support", "connect me", "speak to"],
    urKeywords: ["insaan", "agent", "banda", "support team", "kisi se baat", "human se baat", "live support"],
    enResponses: [
      "Of course! Let me connect you with a human support agent right away. 👤\n\nPlease click **'Talk to a human agent'** button below, or I'll escalate this conversation now. Someone will be with you shortly!",
    ],
    urResponses: [
      "Bilkul! Abhi aapko human support agent se connect karta hun. 👤\n\nNeeche **'Talk to a human agent'** button click karein, ya main abhi escalate karta hun. Koi jald hi aapke paas aayega!",
    ],
    urScriptResponses: [
      "بالکل! ابھی آپ کو انسانی سپورٹ ایجنٹ سے جوڑتا ہوں۔ 👤\n\nنیچے **'انسانی ایجنٹ سے بات کریں'** بٹن کلک کریں، یا میں ابھی ایسکیلیٹ کرتا ہوں۔ کوئی جلد ہی آپ کے پاس آئے گا!",
    ],
    confidence: 0.99,
  },

  // ── Compliance / Reports ─────────────────────────────────────────────────────
  {
    id: "compliance",
    enKeywords: ["compliance", "statutory", "government report", "annual return", "filing", "regulatory"],
    urKeywords: ["compliance", "government report", "filing", "regulatory"],
    enResponses: [
      "📋 **Compliance Reports** in Finova:\n\n1. Go to **Dashboard → Reports → Compliance**\n2. Available reports: Tax Summary, Withholding Tax, Sales Tax Return data\n3. Export in required format for filing\n\nFinova helps you prepare the data — final filing should be done through FBR/SECP portals or your tax consultant.",
    ],
    urResponses: [
      "📋 **Compliance Reports**:\n\n1. **Dashboard → Reports → Compliance** pe jao\n2. Tax Summary, Withholding Tax, Sales Tax Return data available hai\n3. Filing ke liye required format mein export karo\n\nFinova data tayyar karta hai — filing FBR/SECP portal ya tax consultant se karein.",
    ],
    urScriptResponses: [
      "📋 **تعمیل رپورٹس**:\n\n1. **ڈیش بورڈ ← رپورٹس ← تعمیل** پر جائیں\n2. ٹیکس خلاصہ، ود ہولڈنگ ٹیکس، سیلز ٹیکس ریٹرن ڈیٹا دستیاب ہے\n3. فائلنگ کے لیے مطلوبہ فارمیٹ میں برآمد کریں\n\nفنووا ڈیٹا تیار کرتا ہے — فائلنگ FBR/SECP پورٹل یا ٹیکس مشیر سے کریں۔",
    ],
    confidence: 0.88,
  },

  // ── Accounts Chart ────────────────────────────────────────────────────────────
  {
    id: "chart_of_accounts",
    enKeywords: ["chart of accounts", "accounts list", "COA", "account codes", "add account", "accounting codes"],
    urKeywords: ["chart of accounts", "accounts list", "COA", "account add"],
    enResponses: [
      "📒 **Chart of Accounts (COA)**:\n\n1. Go to **Dashboard → Accounts**\n2. View all accounts organized by type (Assets, Liabilities, Equity, Income, Expenses)\n3. Click **+ Add Account** to create new accounts\n4. Set account code, name, type, and parent\n\nFinova comes with a pre-built COA suitable for most businesses. Customize as needed!",
    ],
    urResponses: [
      "📒 **Chart of Accounts (COA)**:\n\n1. **Dashboard → Accounts** pe jao\n2. Tamam accounts types se organized (Assets, Liabilities, Equity, Income, Expenses)\n3. **+ Add Account** se naya account banao\n4. Account code, naam, type aur parent set karo\n\nFinova mein pehle se COA built-in hai. Customize karo zaroorat ke mutabiq!",
    ],
    urScriptResponses: [
      "📒 **چارٹ آف اکاؤنٹس (COA)**:\n\n1. **ڈیش بورڈ ← اکاؤنٹس** پر جائیں\n2. تمام اکاؤنٹس اقسام سے منظم (اثاثے، ذمہ داریاں، ایکویٹی، آمدن، اخراجات)\n3. **+ اکاؤنٹ شامل کریں** سے نیا اکاؤنٹ بنائیں\n4. اکاؤنٹ کوڈ، نام، قسم اور والدین مقرر کریں\n\nفنووا میں پہلے سے COA بنا ہوا ہے۔ ضرورت کے مطابق اپنی مرضی کے مطابق کریں!",
    ],
    confidence: 0.9,
  },

  // ── Branches ──────────────────────────────────────────────────────────────────
  {
    id: "branches",
    enKeywords: ["branch", "branches", "office", "location", "multiple locations", "cost center"],
    urKeywords: ["branch", "offices", "location", "alag jagah"],
    enResponses: [
      "🏢 **Branch Management**:\n\n1. Go to **Dashboard → Settings → Branches**\n2. Add branches with name, address, and contact\n3. Assign transactions to specific branches\n4. Run branch-wise reports\n\nCost centers can also be used for departmental tracking.",
    ],
    urResponses: [
      "🏢 **Branch Management**:\n\n1. **Dashboard → Settings → Branches** pe jao\n2. Branch add karo (naam, address, contact)\n3. Transactions specific branch ko assign karo\n4. Branch-wise reports chalao\n\nCost centers se departmental tracking bhi ho sakti hai.",
    ],
    urScriptResponses: [
      "🏢 **برانچ مینجمنٹ**:\n\n1. **ڈیش بورڈ ← ترتیبات ← برانچیں** پر جائیں\n2. برانچ شامل کریں (نام، پتہ، رابطہ)\n3. لین دین مخصوص برانچ کو تفویض کریں\n4. برانچ وار رپورٹس چلائیں\n\nلاگت مراکز سے محکمہ وار ٹریکنگ بھی ہو سکتی ہے۔",
    ],
    confidence: 0.88,
  },

  // ── Currency ──────────────────────────────────────────────────────────────────
  {
    id: "currency",
    enKeywords: ["currency", "multi currency", "foreign currency", "USD", "dollar", "euro", "exchange rate"],
    urKeywords: ["currency", "dollar", "euro", "exchange rate", "foreign currency"],
    enResponses: [
      "💱 **Multi-Currency** support:\n\n1. Go to **Dashboard → Settings → Currencies**\n2. Add currencies (USD, EUR, GBP, etc.)\n3. Set exchange rates\n4. Create invoices in foreign currency\n5. System converts to base currency automatically for reports\n\nBase currency is set during initial company setup.",
    ],
    urResponses: [
      "💱 **Multi-Currency** support:\n\n1. **Dashboard → Settings → Currencies** pe jao\n2. Currencies add karo (USD, EUR, GBP, etc.)\n3. Exchange rates set karo\n4. Foreign currency mein invoice banao\n5. System base currency mein convert karta hai reports ke liye\n\nBase currency company setup mein set hoti hai.",
    ],
    urScriptResponses: [
      "💱 **ملٹی کرنسی** سپورٹ:\n\n1. **ڈیش بورڈ ← ترتیبات ← کرنسیاں** پر جائیں\n2. کرنسیاں شامل کریں (USD، EUR، GBP، وغیرہ)\n3. تبادلہ شرحیں مقرر کریں\n4. غیر ملکی کرنسی میں انوائس بنائیں\n5. سسٹم بنیادی کرنسی میں تبدیل کرتا ہے رپورٹس کے لیے\n\nبنیادی کرنسی کمپنی سیٹ اپ میں مقرر ہوتی ہے۔",
    ],
    confidence: 0.88,
  },

  // ── Integrations ──────────────────────────────────────────────────────────────
  {
    id: "integrations",
    enKeywords: ["integration", "API", "connect", "third party", "external", "Zapier", "webhook"],
    urKeywords: ["integration", "API", "connect", "third party"],
    enResponses: [
      "🔌 **Integrations** available in Finova:\n\n• **API Access** — use Finova API to connect your own tools\n• **Dashboard → Integrations** — view available integrations\n• Data can be exported and imported for third-party tools\n\nFor custom API integrations, check the API documentation or connect with our support team.",
    ],
    urResponses: [
      "🔌 **Integrations**:\n\n• **API Access** — apne tools connect karo Finova API se\n• **Dashboard → Integrations** — available integrations dekho\n• Data export/import third-party tools ke liye\n\nCustom API ke liye API docs dekho ya support se contact karo.",
    ],
    urScriptResponses: [
      "🔌 **انضمامات**:\n\n• **API رسائی** — اپنے ٹولز فنووا API سے جوڑیں\n• **ڈیش بورڈ ← انضمامات** — دستیاب انضمامات دیکھیں\n• ڈیٹا برآمد/درآمد تھرڈ پارٹی ٹولز کے لیے\n\nکسٹم API کے لیے API دستاویزات دیکھیں یا سپورٹ سے رابطہ کریں۔",
    ],
    confidence: 0.85,
  },

  // ── Fallback (very low confidence) ───────────────────────────────────────────
  {
    id: "fallback",
    enKeywords: [],
    urKeywords: [],
    enResponses: [
      "I'm not sure I fully understand. Here are things I can help with — just type the topic:\n\n• **invoicing** — sales/purchase invoices\n• **banking** — bank reconciliation\n• **reports** — P&L, balance sheet, cash flow, tax\n• **inventory** — stock management\n• **HR** — payroll, attendance, employees\n• **CRM** — contacts, pipeline\n• **plans** — pricing, Starter vs Pro\n• **backup** — data backup & restore\n\nOr click below to talk to a human agent! 👤",
      "Could you rephrase that? I can help with any Finova feature. Try asking:\n• 'How do I create a sales invoice?'\n• 'What is bank reconciliation?'\n• 'Tell me about Finova'\n• 'What reports are available?'\n\nOr say **'human agent'** to connect with our team.",
    ],
    urResponses: [
      "Thora aur detail batao? Main in topics mein madad kar sakta hun — topic type karo:\n\n• **invoicing** — sales/purchase invoice\n• **banking** — bank reconciliation\n• **reports** — P&L, balance sheet, cash flow, tax\n• **inventory** — stock management\n• **HR** — payroll, attendance, employees\n• **CRM** — contacts, pipeline\n• **plans** — pricing, Starter vs Pro\n• **backup** — data backup\n\nYa neeche human agent se baat karo! 👤",
      "Thora clear karo? Kuch examples:\n• 'Sales invoice kaise banate hain?'\n• 'Bank reconciliation kya hai?'\n• 'Finova ke baare mein batao'\n• 'Kaun kaun se reports hain?'\n\nYa **'human agent'** type karo hamare team se baat karne ke liye.",
    ],
    urScriptResponses: [
      "تھوڑی اور تفصیل بتائیں؟ میں ان موضوعات میں مدد کر سکتا ہوں — موضوع لکھیں:\n\n• **انوائسنگ** — سیلز/پرچیز انوائس\n• **بینکنگ** — بینک ریکنسلیشن\n• **رپورٹس** — P&L، بیلنس شیٹ، کیش فلو، ٹیکس\n• **انوینٹری** — اسٹاک مینجمنٹ\n• **HR** — پے رول، حاضری، ملازمین\n• **CRM** — کانٹیکٹس، پائپ لائن\n• **پلانز** — قیمتیں، اسٹارٹر بمقابلہ پرو\n• **بیک اپ** — ڈیٹا بیک اپ\n\nیا نیچے انسانی ایجنٹ سے بات کریں! 👤",
      "تھوڑا واضح کریں؟ کچھ مثالیں:\n• 'سیلز انوائس کیسے بناتے ہیں؟'\n• 'بینک ریکنسلیشن کیا ہے؟'\n• 'فنووا کے بارے میں بتائیں'\n• 'کون کون سی رپورٹس ہیں؟'\n\nیا **'انسانی ایجنٹ'** لکھیں ہماری ٹیم سے بات کرنے کے لیے۔",
    ],
    confidence: 0.1,
  },
];

// ─── Graceful replies for languages without full intent coverage ───────────────
const LANG_GREETING: Record<string, string> = {
  hi: "नमस्ते! 👋 मैं Finova का AI सहायक हूं। मैं अभी English और Urdu में पूरी मदद कर सकता हूं। Hindi में मैं आपको agent से connect कर सकता हूं। क्या English में पूछ सकते हैं? या **'human agent'** type करें।",
  ar: "مرحباً! 👋 أنا مساعد Finova الذكي. يمكنني المساعدة باللغة الإنجليزية والأردية بشكل كامل. للعربية، يمكنني توصيلك بوكيل بشري. هل يمكنك السؤال بالإنجليزية؟ أو اكتب **'human agent'**.",
  es: "¡Hola! 👋 Soy el asistente AI de Finova. Puedo ayudarte completamente en inglés y urdu. Para español, puedo conectarte con un agente humano. ¿Puedes preguntar en inglés? O escribe **'human agent'**.",
  fr: "Bonjour! 👋 Je suis l'assistant AI de Finova. Je peux vous aider complètement en anglais et en ourdou. Pour le français, je peux vous connecter avec un agent humain. Pouvez-vous poser votre question en anglais? Ou tapez **'human agent'**.",
  zh: "您好！👋 我是Finova的AI助手。我可以用英语和乌尔都语完全提供帮助。对于中文，我可以为您联系人工客服。能用英语提问吗？或输入 **'human agent'**。",
  de: "Hallo! 👋 Ich bin Finovas KI-Assistent. Ich kann vollständig auf Englisch und Urdu helfen. Für Deutsch kann ich Sie mit einem menschlichen Agenten verbinden. Können Sie auf Englisch fragen? Oder tippen Sie **'human agent'**.",
  pt: "Olá! 👋 Sou o assistente AI da Finova. Posso ajudar completamente em inglês e urdu. Para português, posso conectá-lo com um agente humano. Pode perguntar em inglês? Ou escreva **'human agent'**.",
  ru: "Привет! 👋 Я AI-ассистент Finova. Я могу полностью помочь на английском и урду. Для русского языка я могу связать вас с агентом. Можете спросить по-английски? Или напишите **'human agent'**.",
  bn: "নমস্কার! 👋 আমি Finova-র AI সহকারী। আমি ইংরেজি ও উর্দুতে সম্পূর্ণ সাহায্য করতে পারি। বাংলার জন্য আমি আপনাকে একজন এজেন্টের সাথে সংযুক্ত করতে পারি। ইংরেজিতে জিজ্ঞেস করতে পারেন? অথবা **'human agent'** টাইপ করুন।",
  tr: "Merhaba! 👋 Ben Finova'nın AI asistanıyım. İngilizce ve Urduca'da tam yardım sunabiliyorum. Türkçe için sizi bir insan ajanla bağlayabilirim. İngilizce sorabilir misiniz? Ya da **'human agent'** yazın.",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ENGINE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function runChatEngine(
  message: string,
  history: { sender: string; text: string }[] = []
): ChatEngineResult {
  const lang = detectLanguage(message);

  // Handle non-primary languages gracefully
  const NON_PRIMARY: ChatLanguage[] = ["hi", "ar", "es", "fr", "zh", "de", "pt", "ru", "bn", "tr"];
  if (NON_PRIMARY.includes(lang)) {
    const reply = LANG_GREETING[lang] ?? LANG_GREETING["en"] ?? "Please ask in English or Urdu, or type **'human agent'** to connect with our team.";
    return { reply, confidence: 0.8, intentId: "lang_redirect", shouldEscalate: false, language: lang };
  }

  // Helper: pick correct response array based on detected language
  function getResponses(intent: Intent): string[] {
    if (lang === "ur_script") {
      return intent.urScriptResponses?.length ? intent.urScriptResponses : intent.urResponses;
    }
    if (lang === "ur_roman") return intent.urResponses;
    return intent.enResponses;
  }

  // Find escalation intent first (highest priority)
  const escalateIntent = INTENTS.find(i => i.id === "escalate")!;
  const escScore = scoreIntent(message, escalateIntent);
  if (escScore >= 1) {
    const reply = pick(getResponses(escalateIntent));
    return { reply, confidence: 0.99, intentId: "escalate", shouldEscalate: true, language: lang };
  }

  // Score all other intents
  let bestIntent = INTENTS.find(i => i.id === "fallback")!;
  let bestScore = 0;

  for (const intent of INTENTS) {
    if (intent.id === "fallback" || intent.id === "escalate") continue;
    const score = scoreIntent(message, intent);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Normalize confidence (max score attainable ≈ 8 for multi-word matches)
  const rawConf = bestScore === 0 ? 0 : Math.min(bestIntent.confidence, 0.4 + (bestScore / 8) * 0.55);
  const confidence = bestScore === 0 ? 0.1 : rawConf;
  const intentId = bestScore === 0 ? "fallback" : bestIntent.id;
  const finalIntent = bestScore === 0 ? INTENTS.find(i => i.id === "fallback")! : bestIntent;

  const responses = getResponses(finalIntent);
  const reply = pick(responses.length > 0 ? responses : finalIntent.enResponses);

  // Escalate if very low confidence AND history has multiple turns (user is stuck)
  const turns = history.filter(h => h.sender === "customer").length;
  const shouldEscalate = confidence < 0.3 && turns >= 2;

  return { reply, confidence, intentId, shouldEscalate, language: lang };
}
