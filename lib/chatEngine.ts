/**
 * FinovaOS Local Chat AI Engine
 * Rule-based NLP engine — no external API needed.
 * Covers 60+ intents with English-only responses.
 */

// Supported language codes used for detection
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
  urResponses: string[];       // English fallback for Roman Urdu input
  urScriptResponses?: string[]; // English fallback for Urdu-script input
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
    enKeywords: ["about this system", "about finova", "what is finova", "tell me about", "what does finova", "overview", "what is this", "explain finova", "introduce", "features of finova", "what can finova", "system overview", "about the platform", "about the software", "who are you", "what are you", "about yourself", "tell me about yourself"],
    urKeywords: ["is system ke bare", "finova kya hai", "system kya hai", "bata do", "overview", "features batao", "kya hai ye", "is software ke bare", "platform kya hai", "apne bare", "apne baare", "bare me btao", "baare mein", "btayie", "btaiye", "batayein", "khud ke bare", "tum kaun", "aap kaun", "kaun ho tum", "kaun hain aap", "kya hai finova", "ye kya hai", "yeh kya hai", "parichay do", "introduce karo"],
    enResponses: [
      "🚀 **FinovaOS** is a complete cloud-based business management platform designed for SMEs.\n\nHere's what it covers:\n\n• 📄 **Accounting** — invoices, vouchers, journal entries, ledger\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Financial Reports** — P&L, Balance Sheet, Cash Flow, Trial Balance, Tax Summary\n• 📦 **Inventory** — items, stock rates, GRN, stock tracking\n• 🛒 **Sales & Purchase** — invoices, quotations, POs, delivery challans\n• 👥 **HR & Payroll** — employees, attendance, leaves, salary\n• 🤝 **CRM** — contacts, interactions, sales pipeline\n• 🔧 **Admin** — users, permissions, roles, audit log, backup\n\nAll in one platform — accessible from any browser, anywhere. What area would you like to know more about?",
    ],
    urResponses: [
      "🚀 **FinovaOS** is a complete cloud-based business management platform designed for SMEs.\n\nHere's what it covers:\n\n• 📄 **Accounting** — invoices, vouchers, journal entries, ledger\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Financial Reports** — P&L, Balance Sheet, Cash Flow, Trial Balance, Tax Summary\n• 📦 **Inventory** — items, stock rates, GRN, stock tracking\n• 🛒 **Sales & Purchase** — invoices, quotations, POs, delivery challans\n• 👥 **HR & Payroll** — employees, attendance, leaves, salary\n• 🤝 **CRM** — contacts, interactions, sales pipeline\n• 🔧 **Admin** — users, permissions, roles, audit log, backup\n\nAll in one platform — accessible from any browser, anywhere. What area would you like to know more about?",
    ],
    urScriptResponses: [
      "🚀 **FinovaOS** is a complete cloud-based business management platform designed for SMEs.\n\nHere's what it covers:\n\n• 📄 **Accounting** — invoices, vouchers, journal entries, ledger\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Financial Reports** — P&L, Balance Sheet, Cash Flow, Trial Balance, Tax Summary\n• 📦 **Inventory** — items, stock rates, GRN, stock tracking\n• 🛒 **Sales & Purchase** — invoices, quotations, POs, delivery challans\n• 👥 **HR & Payroll** — employees, attendance, leaves, salary\n• 🤝 **CRM** — contacts, interactions, sales pipeline\n• 🔧 **Admin** — users, permissions, roles, audit log, backup\n\nAll in one platform — accessible from any browser, anywhere. What area would you like to know more about?",
    ],
    confidence: 0.92,
  },

  // ── Greeting ────────────────────────────────────────────────────────────────
  {
    id: "greeting",
    enKeywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "greetings", "hi there", "hey there"],
    urKeywords: ["salam", "assalamualaikum", "adaab", "helo", "haloo"],
    enResponses: [
      "Hello! 👋 Welcome to FinovaOS Support. I'm your AI assistant — I can help with invoicing, reports, banking, inventory, HR, and more. What can I help you with today?",
      "Hi there! 😊 I'm FinovaOS's AI support assistant. Ask me anything about the platform — from setting up invoices to reading your financial reports!",
    ],
    urResponses: [
      "Hello! 👋 Welcome to FinovaOS Support. I'm your AI assistant — I can help with invoicing, reports, banking, inventory, HR, and more. What can I help you with today?",
      "Hi there! 😊 I'm FinovaOS's AI support assistant. Ask me anything about the platform — from setting up invoices to reading your financial reports!",
    ],
    urScriptResponses: [
      "Hello! 👋 Welcome to FinovaOS Support. I'm your AI assistant — I can help with invoicing, reports, banking, inventory, HR, and more. What can I help you with today?",
      "Hi there! 😊 I'm FinovaOS's AI support assistant. Ask me anything about the platform — from setting up invoices to reading your financial reports!",
    ],
    confidence: 0.95,
  },

  // ── Farewell ─────────────────────────────────────────────────────────────────
  {
    id: "farewell",
    enKeywords: ["bye", "goodbye", "thanks", "thank you", "see you", "take care", "done", "that's all"],
    urKeywords: ["shukriya", "shukria", "alvida", "theek hai", "bas", "khuda hafiz", "allah hafiz", "ok bye"],
    enResponses: [
      "You're welcome! 😊 Have a great day. Feel free to chat again anytime you need help with FinovaOS!",
      "Goodbye! 👋 Don't hesitate to reach out if you have more questions. Happy to help anytime!",
    ],
    urResponses: [
      "You're welcome! 😊 Have a great day. Feel free to chat again anytime you need help with FinovaOS!",
      "Goodbye! 👋 Don't hesitate to reach out if you have more questions. Happy to help anytime!",
    ],
    urScriptResponses: [
      "You're welcome! 😊 Have a great day. Feel free to chat again anytime you need help with FinovaOS!",
      "Goodbye! 👋 Don't hesitate to reach out if you have more questions. Happy to help anytime!",
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
      "I can help you with:\n• 📄 **Invoicing** — sales invoices, purchase invoices, quotations\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Reports** — P&L, balance sheet, cash flow, tax, ageing\n• 📦 **Inventory** — items, stock rates, GRN\n• 👥 **HR & Payroll** — employees, salaries, attendance\n• 🔧 **Setup** — plans, users, permissions, backup\n\nJust ask your question and I'll guide you!",
    ],
    urScriptResponses: [
      "I can help you with:\n• 📄 **Invoicing** — sales invoices, purchase invoices, quotations\n• 🏦 **Banking** — bank reconciliation, payment receipts\n• 📊 **Reports** — P&L, balance sheet, cash flow, tax, ageing\n• 📦 **Inventory** — items, stock rates, GRN\n• 👥 **HR & Payroll** — employees, salaries, attendance\n• 🔧 **Setup** — plans, users, permissions, backup\n\nJust ask your question and I'll guide you!",
    ],
    confidence: 0.85,
  },

  // ── Pricing General ───────────────────────────────────────────────────────────
  {
    id: "pricing_general",
    enKeywords: ["price", "cost", "how much", "pricing", "tariff", "charges", "fees", "rate", "amount", "affordable"],
    urKeywords: ["kitna", "qeemat", "rate", "pricing", "charges", "fees", "mehnga", "sasta", "dam"],
    enResponses: [
      "FinovaOS offers 4 plans:\n\n🌱 **Starter** — Ideal for small businesses. Core accounting + invoicing.\n🚀 **Professional** — Full suite including HR, CRM, advanced reports.\n💎 **Enterprise** — All modules + priority support + unlimited users.\n⚡ **Custom** — Pick only the modules you need.\n\nPricing is shown on the Plans page. An intro offer may be available for the first 3 months!",
      "We have plans starting from Starter (basic accounting) all the way to Enterprise (full business suite). Go to the Plans page to see current pricing and compare. An intro discount may apply for new signups!",
    ],
    urResponses: [
      "FinovaOS offers 4 plans:\n\n🌱 **Starter** — Ideal for small businesses. Core accounting + invoicing.\n🚀 **Professional** — Full suite including HR, CRM, advanced reports.\n💎 **Enterprise** — All modules + priority support + unlimited users.\n⚡ **Custom** — Pick only the modules you need.\n\nPricing is shown on the Plans page. An intro offer may be available for the first 3 months!",
      "We have plans starting from Starter (basic accounting) all the way to Enterprise (full business suite). Go to the Plans page to see current pricing and compare. An intro discount may apply for new signups!",
    ],
    urScriptResponses: [
      "FinovaOS offers 4 plans:\n\n🌱 **Starter** — Ideal for small businesses. Core accounting + invoicing.\n🚀 **Professional** — Full suite including HR, CRM, advanced reports.\n💎 **Enterprise** — All modules + priority support + unlimited users.\n⚡ **Custom** — Pick only the modules you need.\n\nPricing is shown on the Plans page. An intro offer may be available for the first 3 months!",
      "We have plans starting from Starter (basic accounting) all the way to Enterprise (full business suite). Go to the Plans page to see current pricing and compare. An intro discount may apply for new signups!",
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
      "🌱 **Starter Plan** includes:\n• Dashboard & core reporting\n• Sales & purchase invoicing\n• Quotations, delivery challans\n• Bank reconciliation & payment receipts\n• Expense vouchers & CPV/CRV\n• Inventory management\n• Basic financial reports (ledger, trial balance)\n• User & permission management\n\nPerfect for small to medium businesses getting started with digital accounting!",
    ],
    urScriptResponses: [
      "🌱 **Starter Plan** includes:\n• Dashboard & core reporting\n• Sales & purchase invoicing\n• Quotations, delivery challans\n• Bank reconciliation & payment receipts\n• Expense vouchers & CPV/CRV\n• Inventory management\n• Basic financial reports (ledger, trial balance)\n• User & permission management\n\nPerfect for small to medium businesses getting started with digital accounting!",
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
      "🚀 **Professional Plan** includes everything in Starter plus:\n• HR & Payroll (employees, salaries, attendance, leaves)\n• CRM (contacts, interactions, opportunities)\n• Advanced financial reports (P&L, balance sheet, cash flow)\n• Profit & Loss report\n• Inventory reports\n• Audit log\n• System logs\n\nIdeal for growing businesses that need HR and CRM alongside accounting!",
    ],
    urScriptResponses: [
      "🚀 **Professional Plan** includes everything in Starter plus:\n• HR & Payroll (employees, salaries, attendance, leaves)\n• CRM (contacts, interactions, opportunities)\n• Advanced financial reports (P&L, balance sheet, cash flow)\n• Profit & Loss report\n• Inventory reports\n• Audit log\n• System logs\n\nIdeal for growing businesses that need HR and CRM alongside accounting!",
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
      "💎 **Enterprise Plan** includes ALL modules:\n• Everything in Professional\n• Full HR & Payroll including payroll processing\n• Priority customer support\n• Unlimited users\n• All compliance & tax reports\n• Dedicated account manager\n\nDesigned for large organizations with complex accounting needs.",
    ],
    urScriptResponses: [
      "💎 **Enterprise Plan** includes ALL modules:\n• Everything in Professional\n• Full HR & Payroll including payroll processing\n• Priority customer support\n• Unlimited users\n• All compliance & tax reports\n• Dedicated account manager\n\nDesigned for large organizations with complex accounting needs.",
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
      "⚡ **Custom Plan** lets you pick exactly the modules you need!\n\nOur admin configures which modules are enabled for your Custom plan. You only pay for what you use. Contact our support team or your account manager to set up a Custom plan tailored to your business.",
    ],
    urScriptResponses: [
      "⚡ **Custom Plan** lets you pick exactly the modules you need!\n\nOur admin configures which modules are enabled for your Custom plan. You only pay for what you use. Contact our support team or your account manager to set up a Custom plan tailored to your business.",
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
      "Here's a quick comparison:\n\n| Feature | Starter | Pro | Enterprise |\n|---|---|---|---|\n| Accounting | ✅ | ✅ | ✅ |\n| Invoicing | ✅ | ✅ | ✅ |\n| Banking | ✅ | ✅ | ✅ |\n| HR & Payroll | ❌ | ✅ | ✅ |\n| CRM | ❌ | ✅ | ✅ |\n| All Reports | Partial | ✅ | ✅ |\n| Priority Support | ❌ | ❌ | ✅ |\n\n**Choose Starter** if you need basic accounting. **Pro** if you need HR+CRM. **Enterprise** for everything + priority support.",
    ],
    urScriptResponses: [
      "Here's a quick comparison:\n\n| Feature | Starter | Pro | Enterprise |\n|---|---|---|---|\n| Accounting | ✅ | ✅ | ✅ |\n| Invoicing | ✅ | ✅ | ✅ |\n| Banking | ✅ | ✅ | ✅ |\n| HR & Payroll | ❌ | ✅ | ✅ |\n| CRM | ❌ | ✅ | ✅ |\n| All Reports | Partial | ✅ | ✅ |\n| Priority Support | ❌ | ❌ | ✅ |\n\n**Choose Starter** if you need basic accounting. **Pro** if you need HR+CRM. **Enterprise** for everything + priority support.",
    ],
    confidence: 0.88,
  },

  // ── Signup / Onboarding ──────────────────────────────────────────────────────
  {
    id: "signup",
    enKeywords: ["signup", "sign up", "register", "create account", "new account", "get started", "join", "trial"],
    urKeywords: ["account banana", "register", "signup", "shuru karna", "join", "kaise use karun"],
    enResponses: [
      "Getting started with FinovaOS is easy! 🎉\n\n1. Go to the **Sign Up** page\n2. Enter your name, email & password\n3. Verify your email (OTP sent)\n4. **Choose a plan** (Starter/Pro/Enterprise/Custom)\n5. Review features on the Features page\n6. **Proceed to Payment** and activate your plan\n7. You're in! Access your full dashboard 🚀\n\nNeed help with any specific step?",
    ],
    urResponses: [
      "Getting started with FinovaOS is easy! 🎉\n\n1. Go to the **Sign Up** page\n2. Enter your name, email & password\n3. Verify your email (OTP sent)\n4. **Choose a plan** (Starter/Pro/Enterprise/Custom)\n5. Review features on the Features page\n6. **Proceed to Payment** and activate your plan\n7. You're in! Access your full dashboard 🚀\n\nNeed help with any specific step?",
    ],
    urScriptResponses: [
      "Getting started with FinovaOS is easy! 🎉\n\n1. Go to the **Sign Up** page\n2. Enter your name, email & password\n3. Verify your email (OTP sent)\n4. **Choose a plan** (Starter/Pro/Enterprise/Custom)\n5. Review features on the Features page\n6. **Proceed to Payment** and activate your plan\n7. You're in! Access your full dashboard 🚀\n\nNeed help with any specific step?",
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
      "📄 To create a **Sales Invoice**:\n\n1. Go to **Dashboard → Sales Invoice**\n2. Click **+ New Invoice**\n3. Select customer, add items with quantity & rate\n4. Set tax if applicable\n5. Save or **Print/Export** as PDF\n\nYou can also track payment status and send invoices directly from the platform. Need help with a specific field?",
    ],
    urScriptResponses: [
      "📄 To create a **Sales Invoice**:\n\n1. Go to **Dashboard → Sales Invoice**\n2. Click **+ New Invoice**\n3. Select customer, add items with quantity & rate\n4. Set tax if applicable\n5. Save or **Print/Export** as PDF\n\nYou can also track payment status and send invoices directly from the platform. Need help with a specific field?",
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
      "📄 To create a **Purchase Invoice**:\n\n1. Go to **Dashboard → Purchase Invoice**\n2. Click **+ New Purchase Invoice**\n3. Select supplier, add items purchased\n4. Set payment terms & due date\n5. Save — it updates your accounts payable automatically\n\nPurchase invoices also update your inventory if linked to items.",
    ],
    urScriptResponses: [
      "📄 To create a **Purchase Invoice**:\n\n1. Go to **Dashboard → Purchase Invoice**\n2. Click **+ New Purchase Invoice**\n3. Select supplier, add items purchased\n4. Set payment terms & due date\n5. Save — it updates your accounts payable automatically\n\nPurchase invoices also update your inventory if linked to items.",
    ],
    confidence: 0.9,
  },

  // ── Quotation ─────────────────────────────────────────────────────────────────
  {
    id: "quotation",
    enKeywords: ["quotation", "quote", "estimate", "proposal", "proforma"],
    urKeywords: ["quotation", "estimate", "quote", "offer"],
    enResponses: [
      "📋 **Quotations** in FinovaOS:\n\n1. Go to **Dashboard → Quotation**\n2. Create quotation with customer details, items, prices\n3. Set validity date\n4. Export as PDF and send to customer\n5. Convert to **Sales Invoice** with one click when approved!\n\nThis saves time — no need to re-enter data.",
    ],
    urResponses: [
      "📋 **Quotations** in FinovaOS:\n\n1. Go to **Dashboard → Quotation**\n2. Create quotation with customer details, items, prices\n3. Set validity date\n4. Export as PDF and send to customer\n5. Convert to **Sales Invoice** with one click when approved!\n\nThis saves time — no need to re-enter data.",
    ],
    urScriptResponses: [
      "📋 **Quotations** in FinovaOS:\n\n1. Go to **Dashboard → Quotation**\n2. Create quotation with customer details, items, prices\n3. Set validity date\n4. Export as PDF and send to customer\n5. Convert to **Sales Invoice** with one click when approved!\n\nThis saves time — no need to re-enter data.",
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
      "📦 **Purchase Order (PO)**:\n\n1. Go to **Dashboard → Purchase Order**\n2. Select supplier and add items to order\n3. Set expected delivery date\n4. Save and send PO to supplier\n5. When goods arrive, create **GRN** (Goods Receipt Note) against this PO\n\nPOs help you track what was ordered vs what was received.",
    ],
    urScriptResponses: [
      "📦 **Purchase Order (PO)**:\n\n1. Go to **Dashboard → Purchase Order**\n2. Select supplier and add items to order\n3. Set expected delivery date\n4. Save and send PO to supplier\n5. When goods arrive, create **GRN** (Goods Receipt Note) against this PO\n\nPOs help you track what was ordered vs what was received.",
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
      "🚚 **Delivery Challan** is used when you dispatch goods to a customer before raising an invoice.\n\n1. Go to **Dashboard → Delivery Challan**\n2. Select customer and items being dispatched\n3. Save and print — driver carries this as proof of delivery\n4. Later, convert to **Sales Invoice**\n\nUseful for businesses that deliver first and bill later.",
    ],
    urScriptResponses: [
      "🚚 **Delivery Challan** is used when you dispatch goods to a customer before raising an invoice.\n\n1. Go to **Dashboard → Delivery Challan**\n2. Select customer and items being dispatched\n3. Save and print — driver carries this as proof of delivery\n4. Later, convert to **Sales Invoice**\n\nUseful for businesses that deliver first and bill later.",
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
      "📥 **GRN (Goods Receipt Note)** records goods received from a supplier:\n\n1. Go to **Dashboard → GRN**\n2. Link to a Purchase Order (optional)\n3. Enter items received and quantities\n4. Save — inventory is updated automatically\n5. Match with purchase invoice for 3-way matching\n\nGRN ensures your inventory is always accurate.",
    ],
    urScriptResponses: [
      "📥 **GRN (Goods Receipt Note)** records goods received from a supplier:\n\n1. Go to **Dashboard → GRN**\n2. Link to a Purchase Order (optional)\n3. Enter items received and quantities\n4. Save — inventory is updated automatically\n5. Match with purchase invoice for 3-way matching\n\nGRN ensures your inventory is always accurate.",
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
      "↩️ **Sale Return** handles goods returned by customers:\n\n1. Go to **Dashboard → Sale Return**\n2. Select the original sales invoice\n3. Enter items being returned\n4. Save — it creates a credit note and updates inventory\n\nThe customer's account balance is adjusted automatically.",
    ],
    urScriptResponses: [
      "↩️ **Sale Return** handles goods returned by customers:\n\n1. Go to **Dashboard → Sale Return**\n2. Select the original sales invoice\n3. Enter items being returned\n4. Save — it creates a credit note and updates inventory\n\nThe customer's account balance is adjusted automatically.",
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
      "💰 **Payment Receipt** records money received from customers:\n\n1. Go to **Dashboard → Payment Receipts**\n2. Select customer and the invoice being paid\n3. Enter amount received, payment mode (cash/bank/cheque)\n4. Save — invoice is marked as paid automatically\n\nYou can apply one payment to multiple invoices!",
    ],
    urScriptResponses: [
      "💰 **Payment Receipt** records money received from customers:\n\n1. Go to **Dashboard → Payment Receipts**\n2. Select customer and the invoice being paid\n3. Enter amount received, payment mode (cash/bank/cheque)\n4. Save — invoice is marked as paid automatically\n\nYou can apply one payment to multiple invoices!",
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
      "🧾 **Expense Voucher** records business expenses:\n\n1. Go to **Dashboard → Expense Vouchers**\n2. Select expense category (rent, utilities, travel, etc.)\n3. Enter amount, date, description\n4. Attach receipt/photo if needed\n5. Submit for approval or save directly\n\nExpenses flow into your P&L report automatically.",
    ],
    urScriptResponses: [
      "🧾 **Expense Voucher** records business expenses:\n\n1. Go to **Dashboard → Expense Vouchers**\n2. Select expense category (rent, utilities, travel, etc.)\n3. Enter amount, date, description\n4. Attach receipt/photo if needed\n5. Submit for approval or save directly\n\nExpenses flow into your P&L report automatically.",
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
      "💵 **CPV & CRV** are cash transaction vouchers:\n\n• **CPV (Cash Payment Voucher)** — Record cash paid out (payments to suppliers, expenses)\n• **CRV (Cash Receipt Voucher)** — Record cash received (from customers, other sources)\n\nBoth are found in **Dashboard → CPV** / **Dashboard → CRV**. They update your cash book and ledger automatically.",
    ],
    urScriptResponses: [
      "💵 **CPV & CRV** are cash transaction vouchers:\n\n• **CPV (Cash Payment Voucher)** — Record cash paid out (payments to suppliers, expenses)\n• **CRV (Cash Receipt Voucher)** — Record cash received (from customers, other sources)\n\nBoth are found in **Dashboard → CPV** / **Dashboard → CRV**. They update your cash book and ledger automatically.",
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
      "📒 **Journal Voucher (JV)** is for manual accounting entries:\n\n1. Go to **Dashboard → Journal Voucher**\n2. Select debit account(s) and credit account(s)\n3. Enter amounts — debits must equal credits\n4. Add narration/description\n5. Save — entries appear in ledger and trial balance\n\nUsed for adjustments, accruals, depreciation entries, etc.",
    ],
    urScriptResponses: [
      "📒 **Journal Voucher (JV)** is for manual accounting entries:\n\n1. Go to **Dashboard → Journal Voucher**\n2. Select debit account(s) and credit account(s)\n3. Enter amounts — debits must equal credits\n4. Add narration/description\n5. Save — entries appear in ledger and trial balance\n\nUsed for adjustments, accruals, depreciation entries, etc.",
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
      "🏦 **Bank Reconciliation** matches your book entries with your bank statement:\n\n1. Go to **Dashboard → Bank Reconciliation**\n2. Select your bank account\n3. Import bank statement (or enter manually)\n4. Match transactions — system highlights unmatched ones\n5. Mark reconciled transactions\n\nThis ensures your books match the actual bank balance. Run it monthly for clean accounts!",
    ],
    urScriptResponses: [
      "🏦 **Bank Reconciliation** matches your book entries with your bank statement:\n\n1. Go to **Dashboard → Bank Reconciliation**\n2. Select your bank account\n3. Import bank statement (or enter manually)\n4. Match transactions — system highlights unmatched ones\n5. Mark reconciled transactions\n\nThis ensures your books match the actual bank balance. Run it monthly for clean accounts!",
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
      "📖 **Ledger Report** shows the complete transaction history of any account:\n\n1. Go to **Dashboard → Reports → Ledger**\n2. Select account (customer, supplier, expense account, etc.)\n3. Set date range\n4. View all debits, credits, and running balance\n5. Export to PDF or Excel\n\nUse this to verify any account's activity.",
    ],
    urScriptResponses: [
      "📖 **Ledger Report** shows the complete transaction history of any account:\n\n1. Go to **Dashboard → Reports → Ledger**\n2. Select account (customer, supplier, expense account, etc.)\n3. Set date range\n4. View all debits, credits, and running balance\n5. Export to PDF or Excel\n\nUse this to verify any account's activity.",
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
      "⚖️ **Trial Balance** shows all account balances at a point in time:\n\n1. Go to **Dashboard → Reports → Trial Balance**\n2. Select date (usually month-end or year-end)\n3. View all debit and credit balances\n4. Total debits should equal total credits — if not, there's an entry error\n\nTrial Balance is the starting point for preparing final financial statements.",
    ],
    urScriptResponses: [
      "⚖️ **Trial Balance** shows all account balances at a point in time:\n\n1. Go to **Dashboard → Reports → Trial Balance**\n2. Select date (usually month-end or year-end)\n3. View all debit and credit balances\n4. Total debits should equal total credits — if not, there's an entry error\n\nTrial Balance is the starting point for preparing final financial statements.",
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
      "📈 **Profit & Loss (P&L) Report**:\n\n1. Go to **Dashboard → Reports → Profit & Loss**\n2. Select period (monthly, quarterly, yearly)\n3. View:\n   • **Revenue** — all income\n   • **Cost of Goods Sold (COGS)**\n   • **Gross Profit**\n   • **Operating Expenses**\n   • **Net Profit/Loss**\n\nExport to PDF for management or tax purposes.",
    ],
    urScriptResponses: [
      "📈 **Profit & Loss (P&L) Report**:\n\n1. Go to **Dashboard → Reports → Profit & Loss**\n2. Select period (monthly, quarterly, yearly)\n3. View:\n   • **Revenue** — all income\n   • **Cost of Goods Sold (COGS)**\n   • **Gross Profit**\n   • **Operating Expenses**\n   • **Net Profit/Loss**\n\nExport to PDF for management or tax purposes.",
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
      "📊 **Balance Sheet** shows your financial position:\n\n1. Go to **Dashboard → Reports → Balance Sheet**\n2. Select a date\n3. View:\n   • **Assets** — current & fixed\n   • **Liabilities** — payables, loans\n   • **Equity** — owner's capital + retained earnings\n\nAssets = Liabilities + Equity. If not balanced, check your entries!",
    ],
    urScriptResponses: [
      "📊 **Balance Sheet** shows your financial position:\n\n1. Go to **Dashboard → Reports → Balance Sheet**\n2. Select a date\n3. View:\n   • **Assets** — current & fixed\n   • **Liabilities** — payables, loans\n   • **Equity** — owner's capital + retained earnings\n\nAssets = Liabilities + Equity. If not balanced, check your entries!",
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
      "💸 **Cash Flow Report** tracks cash coming in and going out:\n\n1. Go to **Dashboard → Reports → Cash Flow**\n2. Select period\n3. View three sections:\n   • **Operating Activities** — day-to-day business cash flows\n   • **Investing Activities** — asset purchases/sales\n   • **Financing Activities** — loans, capital\n\nHelps you understand actual cash availability vs profit on paper.",
    ],
    urScriptResponses: [
      "💸 **Cash Flow Report** tracks cash coming in and going out:\n\n1. Go to **Dashboard → Reports → Cash Flow**\n2. Select period\n3. View three sections:\n   • **Operating Activities** — day-to-day business cash flows\n   • **Investing Activities** — asset purchases/sales\n   • **Financing Activities** — loans, capital\n\nHelps you understand actual cash availability vs profit on paper.",
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
      "🧾 **Tax Summary Report**:\n\n1. Go to **Dashboard → Reports → Tax Summary**\n2. Select period\n3. View all tax collected and tax paid\n4. Export for FBR/tax filing purposes\n\nMake sure your **Tax Configuration** (Dashboard → Tax Configuration) is set up with correct tax types and rates before recording transactions.",
    ],
    urScriptResponses: [
      "🧾 **Tax Summary Report**:\n\n1. Go to **Dashboard → Reports → Tax Summary**\n2. Select period\n3. View all tax collected and tax paid\n4. Export for FBR/tax filing purposes\n\nMake sure your **Tax Configuration** (Dashboard → Tax Configuration) is set up with correct tax types and rates before recording transactions.",
    ],
    confidence: 0.9,
  },

  // ── Reports General ───────────────────────────────────────────────────────────
  {
    id: "reports_general",
    enKeywords: ["reports", "report", "reporting", "analytics", "financial statements", "statements", "all reports"],
    urKeywords: ["reports", "report", "rports", "reporting", "financial statements", "tamam reports"],
    enResponses: [
      "📊 **Reports available in FinovaOS:**\n\n• 📖 **Ledger** — full history of any account\n• ⚖️ **Trial Balance** — all account balances\n• 📈 **Profit & Loss** — income vs expenses\n• 📊 **Balance Sheet** — assets, liabilities, equity\n• 💸 **Cash Flow** — cash in vs out\n• 🧾 **Tax Summary** — GST/Sales tax report\n• 📅 **Ageing Report** — overdue receivables & payables\n• 📦 **Inventory Reports** — stock valuation, movement\n• 📋 **Compliance Reports** — regulatory filings\n\nAll reports can be exported to PDF or Excel. Which report do you need?",
    ],
    urResponses: [
      "📊 **Reports available in FinovaOS:**\n\n• 📖 **Ledger** — full history of any account\n• ⚖️ **Trial Balance** — all account balances\n• 📈 **Profit & Loss** — income vs expenses\n• 📊 **Balance Sheet** — assets, liabilities, equity\n• 💸 **Cash Flow** — cash in vs out\n• 🧾 **Tax Summary** — GST/Sales tax report\n• 📅 **Ageing Report** — overdue receivables & payables\n• 📦 **Inventory Reports** — stock valuation, movement\n• 📋 **Compliance Reports** — regulatory filings\n\nAll reports can be exported to PDF or Excel. Which report do you need?",
    ],
    urScriptResponses: [
      "📊 **Reports available in FinovaOS:**\n\n• 📖 **Ledger** — full history of any account\n• ⚖️ **Trial Balance** — all account balances\n• 📈 **Profit & Loss** — income vs expenses\n• 📊 **Balance Sheet** — assets, liabilities, equity\n• 💸 **Cash Flow** — cash in vs out\n• 🧾 **Tax Summary** — GST/Sales tax report\n• 📅 **Ageing Report** — overdue receivables & payables\n• 📦 **Inventory Reports** — stock valuation, movement\n• 📋 **Compliance Reports** — regulatory filings\n\nAll reports can be exported to PDF or Excel. Which report do you need?",
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
      "📅 **Ageing Report** shows overdue receivables and payables:\n\n1. Go to **Dashboard → Reports → Ageing**\n2. Choose **Receivables** (money owed TO you) or **Payables** (money you OWE)\n3. View buckets: 0-30, 31-60, 61-90, 90+ days overdue\n4. Export and follow up with customers/suppliers\n\nGreat for managing cash flow and collections!",
    ],
    urScriptResponses: [
      "📅 **Ageing Report** shows overdue receivables and payables:\n\n1. Go to **Dashboard → Reports → Ageing**\n2. Choose **Receivables** (money owed TO you) or **Payables** (money you OWE)\n3. View buckets: 0-30, 31-60, 61-90, 90+ days overdue\n4. Export and follow up with customers/suppliers\n\nGreat for managing cash flow and collections!",
    ],
    confidence: 0.9,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────────
  {
    id: "inventory",
    enKeywords: ["inventory", "stock", "items", "product catalog", "warehouse", "stock level", "in stock"],
    urKeywords: ["inventory", "stock", "maal", "items", "product"],
    enResponses: [
      "📦 **Inventory Management** in FinovaOS:\n\n1. Go to **Dashboard → Inventory / Items**\n2. Add products with SKU, category, unit of measure\n3. Set opening stock and stock rates\n4. Track stock movement through purchases (GRN) and sales (invoices)\n5. View current stock level and valuation anytime\n\nStock is updated automatically with every sales/purchase transaction!",
    ],
    urResponses: [
      "📦 **Inventory Management** in FinovaOS:\n\n1. Go to **Dashboard → Inventory / Items**\n2. Add products with SKU, category, unit of measure\n3. Set opening stock and stock rates\n4. Track stock movement through purchases (GRN) and sales (invoices)\n5. View current stock level and valuation anytime\n\nStock is updated automatically with every sales/purchase transaction!",
    ],
    urScriptResponses: [
      "📦 **Inventory Management** in FinovaOS:\n\n1. Go to **Dashboard → Inventory / Items**\n2. Add products with SKU, category, unit of measure\n3. Set opening stock and stock rates\n4. Track stock movement through purchases (GRN) and sales (invoices)\n5. View current stock level and valuation anytime\n\nStock is updated automatically with every sales/purchase transaction!",
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
      "👥 **HR & Payroll** module (Pro & Enterprise):\n\n• **Employees** — add employee profiles, contracts, documents\n• **Attendance** — daily attendance marking\n• **Leaves** — leave applications and approvals\n• **Payroll** — run monthly payroll with auto calculations\n• **Advance Salary** — advance payment management\n\nGo to **Dashboard → Employees / Payroll** to get started.",
    ],
    urScriptResponses: [
      "👥 **HR & Payroll** module (Pro & Enterprise):\n\n• **Employees** — add employee profiles, contracts, documents\n• **Attendance** — daily attendance marking\n• **Leaves** — leave applications and approvals\n• **Payroll** — run monthly payroll with auto calculations\n• **Advance Salary** — advance payment management\n\nGo to **Dashboard → Employees / Payroll** to get started.",
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
      "🕐 **Attendance** tracking:\n\n1. Go to **Dashboard → Attendance**\n2. Select date\n3. Mark each employee as Present, Absent, Half-day, or On Leave\n4. Save — attendance feeds into payroll calculation automatically\n\nYou can also view monthly attendance summary per employee.",
    ],
    urScriptResponses: [
      "🕐 **Attendance** tracking:\n\n1. Go to **Dashboard → Attendance**\n2. Select date\n3. Mark each employee as Present, Absent, Half-day, or On Leave\n4. Save — attendance feeds into payroll calculation automatically\n\nYou can also view monthly attendance summary per employee.",
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
      "🤝 **CRM Module** (Pro & Enterprise):\n\n• **Contacts** — manage customers, suppliers, leads\n• **Interactions** — log calls, emails, meetings\n• **Opportunities** — track sales deals & pipeline\n• **Notes** — add notes to contacts\n• **Documents** — attach files to contact records\n\nGo to **Dashboard → CRM → Contacts** to start managing your relationships.",
    ],
    urScriptResponses: [
      "🤝 **CRM Module** (Pro & Enterprise):\n\n• **Contacts** — manage customers, suppliers, leads\n• **Interactions** — log calls, emails, meetings\n• **Opportunities** — track sales deals & pipeline\n• **Notes** — add notes to contacts\n• **Documents** — attach files to contact records\n\nGo to **Dashboard → CRM → Contacts** to start managing your relationships.",
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
      "👤 **User & Permission Management**:\n\n1. Go to **Dashboard → Users**\n2. Click **+ Add User** — enter name, email, role\n3. Go to **Dashboard → Roles & Permissions**\n4. Assign roles (Admin, Accountant, Viewer, etc.)\n5. Customize module-level access per role\n\nYou can restrict what each user can see and do in the system.",
    ],
    urScriptResponses: [
      "👤 **User & Permission Management**:\n\n1. Go to **Dashboard → Users**\n2. Click **+ Add User** — enter name, email, role\n3. Go to **Dashboard → Roles & Permissions**\n4. Assign roles (Admin, Accountant, Viewer, etc.)\n5. Customize module-level access per role\n\nYou can restrict what each user can see and do in the system.",
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
      "💾 **Backup & Restore**:\n\n1. Go to **Dashboard → Backup & Restore**\n2. Click **Create Backup** — a full database backup is created\n3. Download the backup file to keep it safe\n4. To restore: upload a backup file and click **Restore**\n\nWe recommend taking weekly backups. Backups are stored securely in the system.",
    ],
    urScriptResponses: [
      "💾 **Backup & Restore**:\n\n1. Go to **Dashboard → Backup & Restore**\n2. Click **Create Backup** — a full database backup is created\n3. Download the backup file to keep it safe\n4. To restore: upload a backup file and click **Restore**\n\nWe recommend taking weekly backups. Backups are stored securely in the system.",
    ],
    confidence: 0.9,
  },

  // ── Opening Balances ──────────────────────────────────────────────────────────
  {
    id: "opening_balances",
    enKeywords: ["opening balance", "beginning balance", "starting balance", "initial balance", "first time setup"],
    urKeywords: ["opening balance", "shuru ki raqam", "pehla balance", "initial balance"],
    enResponses: [
      "🔢 **Opening Balances** — when you start using FinovaOS mid-year:\n\n1. Go to **Dashboard → Opening Balances**\n2. Enter balances for all accounts (cash, bank, debtors, creditors, etc.)\n3. Set the opening date (start of your accounting period)\n4. Save — all subsequent transactions build on these balances\n\nGet this right first — it affects all your reports!",
    ],
    urResponses: [
      "🔢 **Opening Balances** — when you start using FinovaOS mid-year:\n\n1. Go to **Dashboard → Opening Balances**\n2. Enter balances for all accounts (cash, bank, debtors, creditors, etc.)\n3. Set the opening date (start of your accounting period)\n4. Save — all subsequent transactions build on these balances\n\nGet this right first — it affects all your reports!",
    ],
    urScriptResponses: [
      "🔢 **Opening Balances** — when you start using FinovaOS mid-year:\n\n1. Go to **Dashboard → Opening Balances**\n2. Enter balances for all accounts (cash, bank, debtors, creditors, etc.)\n3. Set the opening date (start of your accounting period)\n4. Save — all subsequent transactions build on these balances\n\nGet this right first — it affects all your reports!",
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
      "🏠 The **Dashboard** gives you a real-time overview of your business:\n\n• Total sales, purchases, and expenses\n• Outstanding receivables and payables\n• Bank account balances\n• Recent transactions\n• Key financial charts\n\nAccess all modules from the sidebar on the left. The dashboard updates automatically as you add transactions.",
    ],
    urScriptResponses: [
      "🏠 The **Dashboard** gives you a real-time overview of your business:\n\n• Total sales, purchases, and expenses\n• Outstanding receivables and payables\n• Bank account balances\n• Recent transactions\n• Key financial charts\n\nAccess all modules from the sidebar on the left. The dashboard updates automatically as you add transactions.",
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
      "📤 **Data Import** wizard:\n\n1. Go to **Dashboard → Import Wizard**\n2. Select what to import (contacts, items, invoices, etc.)\n3. Download the template Excel file\n4. Fill in your data in the template\n5. Upload the file — system validates and imports\n\nStart with items/contacts, then historical invoices if needed.",
    ],
    urScriptResponses: [
      "📤 **Data Import** wizard:\n\n1. Go to **Dashboard → Import Wizard**\n2. Select what to import (contacts, items, invoices, etc.)\n3. Download the template Excel file\n4. Fill in your data in the template\n5. Upload the file — system validates and imports\n\nStart with items/contacts, then historical invoices if needed.",
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
      "💳 **Billing & Subscription**:\n\n1. Go to **Dashboard → Billing**\n2. View your current plan and billing cycle\n3. Upgrade or downgrade plan anytime\n4. Payment history available\n\nFor billing issues or invoice requests, connect with our support team. Subscriptions renew automatically unless cancelled.",
    ],
    urScriptResponses: [
      "💳 **Billing & Subscription**:\n\n1. Go to **Dashboard → Billing**\n2. View your current plan and billing cycle\n3. Upgrade or downgrade plan anytime\n4. Payment history available\n\nFor billing issues or invoice requests, connect with our support team. Subscriptions renew automatically unless cancelled.",
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
      "🔐 **Login Issues**:\n\n• **Forgot Password?** Click 'Forgot Password' on login page → OTP sent to email → reset password\n• **Account locked?** Wait 15 minutes and try again, or contact your admin\n• **Wrong email?** Make sure you're using the email address you signed up with\n• **Still stuck?** Connect with a human agent below — they can unlock your account\n\nNeed any of these options?",
    ],
    urScriptResponses: [
      "🔐 **Login Issues**:\n\n• **Forgot Password?** Click 'Forgot Password' on login page → OTP sent to email → reset password\n• **Account locked?** Wait 15 minutes and try again, or contact your admin\n• **Wrong email?** Make sure you're using the email address you signed up with\n• **Still stuck?** Connect with a human agent below — they can unlock your account\n\nNeed any of these options?",
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
      "😟 I'm sorry you're having trouble! Here are some quick fixes:\n\n1. **Refresh the page** (Ctrl+R or F5)\n2. **Clear browser cache** (Ctrl+Shift+Delete)\n3. **Try a different browser** (Chrome recommended)\n4. **Check your internet connection**\n5. **Log out and log back in**\n\nIf the problem persists, please tell me exactly what you're trying to do and I'll connect you with a human agent who can investigate further.",
    ],
    urScriptResponses: [
      "😟 I'm sorry you're having trouble! Here are some quick fixes:\n\n1. **Refresh the page** (Ctrl+R or F5)\n2. **Clear browser cache** (Ctrl+Shift+Delete)\n3. **Try a different browser** (Chrome recommended)\n4. **Check your internet connection**\n5. **Log out and log back in**\n\nIf the problem persists, please tell me exactly what you're trying to do and I'll connect you with a human agent who can investigate further.",
    ],
    confidence: 0.88,
  },

  // ── Data Security ─────────────────────────────────────────────────────────────
  {
    id: "data_security",
    enKeywords: ["security", "data safe", "encryption", "privacy", "GDPR", "data protection", "who can see", "secure"],
    urKeywords: ["security", "data safe hai", "encryption", "privacy", "kon dekh sakta"],
    enResponses: [
      "🔒 **FinovaOS Security**:\n\n• All data is **encrypted at rest and in transit** (AES-256 + TLS)\n• **Multi-tenant isolation** — your data is completely separate from other companies\n• **Role-based access** — each user only sees what you permit\n• **Audit log** — every action is logged with timestamp and user\n• Regular **automated backups**\n• **Session management** — automatic logout on inactivity\n\nYour business data is safe with us!",
    ],
    urResponses: [
      "🔒 **FinovaOS Security**:\n\n• All data is **encrypted at rest and in transit** (AES-256 + TLS)\n• **Multi-tenant isolation** — your data is completely separate from other companies\n• **Role-based access** — each user only sees what you permit\n• **Audit log** — every action is logged with timestamp and user\n• Regular **automated backups**\n• **Session management** — automatic logout on inactivity\n\nYour business data is safe with us!",
    ],
    urScriptResponses: [
      "🔒 **FinovaOS Security**:\n\n• All data is **encrypted at rest and in transit** (AES-256 + TLS)\n• **Multi-tenant isolation** — your data is completely separate from other companies\n• **Role-based access** — each user only sees what you permit\n• **Audit log** — every action is logged with timestamp and user\n• Regular **automated backups**\n• **Session management** — automatic logout on inactivity\n\nYour business data is safe with us!",
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
      "🏢 **Multiple Companies**:\n\nFinova supports managing multiple companies under one account!\n\n1. Go to **Dashboard → Companies**\n2. Click **+ Add Company**\n3. Enter company details\n4. Switch between companies from the top navigation\n\nEach company has completely separate data — accounts, invoices, inventory, etc.",
    ],
    urScriptResponses: [
      "🏢 **Multiple Companies**:\n\nFinova supports managing multiple companies under one account!\n\n1. Go to **Dashboard → Companies**\n2. Click **+ Add Company**\n3. Enter company details\n4. Switch between companies from the top navigation\n\nEach company has completely separate data — accounts, invoices, inventory, etc.",
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
      "🔍 **Audit Log** tracks every action in the system:\n\n1. Go to **Dashboard → Users → Activity Logs**\n2. Filter by user, date, or action type\n3. See who created, edited, or deleted what and when\n\nThis is available on Pro & Enterprise plans. Great for accountability and compliance!",
    ],
    urScriptResponses: [
      "🔍 **Audit Log** tracks every action in the system:\n\n1. Go to **Dashboard → Users → Activity Logs**\n2. Filter by user, date, or action type\n3. See who created, edited, or deleted what and when\n\nThis is available on Pro & Enterprise plans. Great for accountability and compliance!",
    ],
    confidence: 0.9,
  },

  // ── Mobile App ────────────────────────────────────────────────────────────────
  {
    id: "mobile_app",
    enKeywords: ["mobile app", "android", "ios", "iphone", "phone app", "mobile"],
    urKeywords: ["mobile app", "android", "iOS", "phone", "mobile"],
    enResponses: [
      "📱 FinovaOS is a **web-based application** that works on all devices through your browser — no app download needed!\n\nSimply open your browser on mobile and go to the FinovaOS URL. The interface is mobile-responsive.\n\nA dedicated mobile app may be coming in future updates — stay tuned!",
    ],
    urResponses: [
      "📱 FinovaOS is a **web-based application** that works on all devices through your browser — no app download needed!\n\nSimply open your browser on mobile and go to the FinovaOS URL. The interface is mobile-responsive.\n\nA dedicated mobile app may be coming in future updates — stay tuned!",
    ],
    urScriptResponses: [
      "📱 FinovaOS is a **web-based application** that works on all devices through your browser — no app download needed!\n\nSimply open your browser on mobile and go to the FinovaOS URL. The interface is mobile-responsive.\n\nA dedicated mobile app may be coming in future updates — stay tuned!",
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
      "💵 **Advance Payment** management:\n\n1. Go to **Dashboard → Advance Payment**\n2. Record advance received from customer or paid to supplier\n3. When final invoice is created, **adjust** the advance against it\n4. Balance is automatically calculated\n\nThis prevents double-counting and keeps your ledger accurate.",
    ],
    urScriptResponses: [
      "💵 **Advance Payment** management:\n\n1. Go to **Dashboard → Advance Payment**\n2. Record advance received from customer or paid to supplier\n3. When final invoice is created, **adjust** the advance against it\n4. Balance is automatically calculated\n\nThis prevents double-counting and keeps your ledger accurate.",
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
      "Of course! Let me connect you with a human support agent right away. 👤\n\nPlease click **'Talk to a human agent'** button below, or I'll escalate this conversation now. Someone will be with you shortly!",
    ],
    urScriptResponses: [
      "Of course! Let me connect you with a human support agent right away. 👤\n\nPlease click **'Talk to a human agent'** button below, or I'll escalate this conversation now. Someone will be with you shortly!",
    ],
    confidence: 0.99,
  },

  // ── Compliance / Reports ─────────────────────────────────────────────────────
  {
    id: "compliance",
    enKeywords: ["compliance", "statutory", "government report", "annual return", "filing", "regulatory"],
    urKeywords: ["compliance", "government report", "filing", "regulatory"],
    enResponses: [
      "📋 **Compliance Reports** in FinovaOS:\n\n1. Go to **Dashboard → Reports → Compliance**\n2. Available reports: Tax Summary, Withholding Tax, Sales Tax Return data\n3. Export in required format for filing\n\nFinova helps you prepare the data — final filing should be done through FBR/SECP portals or your tax consultant.",
    ],
    urResponses: [
      "📋 **Compliance Reports** in FinovaOS:\n\n1. Go to **Dashboard → Reports → Compliance**\n2. Available reports: Tax Summary, Withholding Tax, Sales Tax Return data\n3. Export in required format for filing\n\nFinova helps you prepare the data — final filing should be done through FBR/SECP portals or your tax consultant.",
    ],
    urScriptResponses: [
      "📋 **Compliance Reports** in FinovaOS:\n\n1. Go to **Dashboard → Reports → Compliance**\n2. Available reports: Tax Summary, Withholding Tax, Sales Tax Return data\n3. Export in required format for filing\n\nFinova helps you prepare the data — final filing should be done through FBR/SECP portals or your tax consultant.",
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
      "📒 **Chart of Accounts (COA)**:\n\n1. Go to **Dashboard → Accounts**\n2. View all accounts organized by type (Assets, Liabilities, Equity, Income, Expenses)\n3. Click **+ Add Account** to create new accounts\n4. Set account code, name, type, and parent\n\nFinova comes with a pre-built COA suitable for most businesses. Customize as needed!",
    ],
    urScriptResponses: [
      "📒 **Chart of Accounts (COA)**:\n\n1. Go to **Dashboard → Accounts**\n2. View all accounts organized by type (Assets, Liabilities, Equity, Income, Expenses)\n3. Click **+ Add Account** to create new accounts\n4. Set account code, name, type, and parent\n\nFinova comes with a pre-built COA suitable for most businesses. Customize as needed!",
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
      "🏢 **Branch Management**:\n\n1. Go to **Dashboard → Settings → Branches**\n2. Add branches with name, address, and contact\n3. Assign transactions to specific branches\n4. Run branch-wise reports\n\nCost centers can also be used for departmental tracking.",
    ],
    urScriptResponses: [
      "🏢 **Branch Management**:\n\n1. Go to **Dashboard → Settings → Branches**\n2. Add branches with name, address, and contact\n3. Assign transactions to specific branches\n4. Run branch-wise reports\n\nCost centers can also be used for departmental tracking.",
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
      "💱 **Multi-Currency** support:\n\n1. Go to **Dashboard → Settings → Currencies**\n2. Add currencies (USD, EUR, GBP, etc.)\n3. Set exchange rates\n4. Create invoices in foreign currency\n5. System converts to base currency automatically for reports\n\nBase currency is set during initial company setup.",
    ],
    urScriptResponses: [
      "💱 **Multi-Currency** support:\n\n1. Go to **Dashboard → Settings → Currencies**\n2. Add currencies (USD, EUR, GBP, etc.)\n3. Set exchange rates\n4. Create invoices in foreign currency\n5. System converts to base currency automatically for reports\n\nBase currency is set during initial company setup.",
    ],
    confidence: 0.88,
  },

  // ── Integrations ──────────────────────────────────────────────────────────────
  {
    id: "integrations",
    enKeywords: ["integration", "API", "connect", "third party", "external", "Zapier", "webhook"],
    urKeywords: ["integration", "API", "connect", "third party"],
    enResponses: [
      "🔌 **Integrations** available in FinovaOS:\n\n• **API Access** — use FinovaOS API to connect your own tools\n• **Dashboard → Integrations** — view available integrations\n• Data can be exported and imported for third-party tools\n\nFor custom API integrations, check the API documentation or connect with our support team.",
    ],
    urResponses: [
      "🔌 **Integrations** available in FinovaOS:\n\n• **API Access** — use FinovaOS API to connect your own tools\n• **Dashboard → Integrations** — view available integrations\n• Data can be exported and imported for third-party tools\n\nFor custom API integrations, check the API documentation or connect with our support team.",
    ],
    urScriptResponses: [
      "🔌 **Integrations** available in FinovaOS:\n\n• **API Access** — use FinovaOS API to connect your own tools\n• **Dashboard → Integrations** — view available integrations\n• Data can be exported and imported for third-party tools\n\nFor custom API integrations, check the API documentation or connect with our support team.",
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
      "Could you rephrase that? I can help with any FinovaOS feature. Try asking:\n• 'How do I create a sales invoice?'\n• 'What is bank reconciliation?'\n• 'Tell me about FinovaOS'\n• 'What reports are available?'\n\nOr say **'human agent'** to connect with our team.",
    ],
    urResponses: [
      "I'm not sure I fully understand. Here are things I can help with — just type the topic:\n\n• **invoicing** — sales/purchase invoices\n• **banking** — bank reconciliation\n• **reports** — P&L, balance sheet, cash flow, tax\n• **inventory** — stock management\n• **HR** — payroll, attendance, employees\n• **CRM** — contacts, pipeline\n• **plans** — pricing, Starter vs Pro\n• **backup** — data backup & restore\n\nOr click below to talk to a human agent! 👤",
      "Could you rephrase that? I can help with any FinovaOS feature. Try asking:\n• 'How do I create a sales invoice?'\n• 'What is bank reconciliation?'\n• 'Tell me about FinovaOS'\n• 'What reports are available?'\n\nOr say **'human agent'** to connect with our team.",
    ],
    urScriptResponses: [
      "I'm not sure I fully understand. Here are things I can help with — just type the topic:\n\n• **invoicing** — sales/purchase invoices\n• **banking** — bank reconciliation\n• **reports** — P&L, balance sheet, cash flow, tax\n• **inventory** — stock management\n• **HR** — payroll, attendance, employees\n• **CRM** — contacts, pipeline\n• **plans** — pricing, Starter vs Pro\n• **backup** — data backup & restore\n\nOr click below to talk to a human agent! 👤",
      "Could you rephrase that? I can help with any FinovaOS feature. Try asking:\n• 'How do I create a sales invoice?'\n• 'What is bank reconciliation?'\n• 'Tell me about FinovaOS'\n• 'What reports are available?'\n\nOr say **'human agent'** to connect with our team.",
    ],
    confidence: 0.1,
  },
];

// ─── Graceful replies for languages without full intent coverage ───────────────
const LANG_GREETING: Record<string, string> = {
  hi: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  ar: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  es: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  fr: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  zh: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  de: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  pt: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  ru: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  bn: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
  tr: "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ENGINE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function runChatEngine(
  message: string,
  history: { sender: string; text: string }[] = []
): ChatEngineResult {
  const lang = detectLanguage(message);

  // Handle non-primary languages with an English fallback
  const NON_PRIMARY: ChatLanguage[] = ["hi", "ar", "es", "fr", "zh", "de", "pt", "ru", "bn", "tr"];
  if (NON_PRIMARY.includes(lang)) {
    const reply = LANG_GREETING[lang] ?? "Hello! I'm the FinovaOS AI assistant. I currently respond in English. You can continue in your language, ask in English, or type **'human agent'** for live support.";
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
