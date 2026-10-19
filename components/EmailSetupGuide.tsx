"use client";

import { useEffect, useState } from "react";

type Lang = "en" | "ur";

type Guide = {
  title: string;
  intro: string;
  steps: Array<{ title: string; body: string[]; link?: { href: string; label: string } }>;
  fieldsTitle: string;
  fields: Array<[string, string]>;
  fillGmail: string;
  othersTitle: string;
  others: Array<[string, string]>;
  helpTitle: string;
  help: string[];
  note: string;
};

const GUIDE: Record<Lang, Guide> = {
  en: {
    title: "How to set up your email",
    intro:
      "Set this up once and every invoice, quotation and report you send will go from your own email address — not from FinovaOS. The steps below use Gmail, the most common choice.",
    steps: [
      {
        title: "Turn on 2-Step Verification in Google",
        body: ["Sign in to the Gmail account you want to send from and switch on 2-Step Verification. Google only allows app passwords after this is on."],
        link: { href: "https://myaccount.google.com/security", label: "Open Google Security" },
      },
      {
        title: "Create an App Password",
        body: [
          "Open the App Passwords page, type a name such as “FinovaOS” and click Create.",
          "Google shows a 16-character password. Copy it (without spaces) — you will not see it again.",
        ],
        link: { href: "https://myaccount.google.com/apppasswords", label: "Open App Passwords" },
      },
      {
        title: "Fill in the form on the left",
        body: ["Use the values in the table below, then press Save Configuration."],
      },
      {
        title: "Test it",
        body: [
          "Press Test Email. If you see “Success”, you are done — emails now go from your own address.",
          "Check your Spam folder the first time.",
        ],
      },
    ],
    fieldsTitle: "What to type in each field (Gmail)",
    fields: [
      ["Enable company-specific SMTP", "Tick it"],
      ["SMTP Host", "smtp.gmail.com"],
      ["SMTP Port", "587"],
      ["SSL/TLS", "Leave unticked for port 587 (tick it only if you use port 465)"],
      ["SMTP User", "Your full Gmail address, e.g. yourname@gmail.com"],
      ["Password / App Password", "The 16-character App Password from step 2 — NOT your normal Gmail password"],
      ["From Email", "The same Gmail address"],
      ["From Name", "Your business name — this is what your customers see"],
    ],
    fillGmail: "Fill Gmail host & port for me",
    othersTitle: "Other email providers",
    others: [
      ["Outlook / Microsoft 365", "smtp.office365.com · port 587"],
      ["Yahoo Mail", "smtp.mail.yahoo.com · port 465 · tick SSL/TLS"],
      ["Your own domain email", "Ask your email provider for the SMTP host, port and password"],
    ],
    helpTitle: "Something not working?",
    help: [
      "“Invalid login” — you typed your normal password. Use the 16-character App Password instead.",
      "No App Passwords option — 2-Step Verification is not turned on yet (step 1).",
      "Remove any spaces from the App Password.",
      "Gmail allows roughly 500 emails per day from one account.",
    ],
    note: "Your password is stored encrypted and is never shown again after saving.",
  },
  ur: {
    title: "اپنی ای میل سیٹ اپ کرنے کا طریقہ",
    intro:
      "یہ سیٹ اپ ایک بار کریں، پھر آپ کی بھیجی ہوئی ہر انوائس، کوٹیشن اور رپورٹ آپ کی اپنی ای میل سے جائے گی، FinovaOS کی طرف سے نہیں۔ نیچے کے مراحل جی میل کے لیے ہیں جو سب سے عام ہے۔",
    steps: [
      {
        title: "گوگل میں 2-Step Verification آن کریں",
        body: ["جس جی میل اکاؤنٹ سے ای میل بھیجنی ہے اس میں لاگ اِن کریں اور 2-Step Verification آن کریں۔ اس کے بعد ہی گوگل ایپ پاس ورڈ بنانے دیتا ہے۔"],
        link: { href: "https://myaccount.google.com/security", label: "گوگل سکیورٹی کھولیں" },
      },
      {
        title: "ایپ پاس ورڈ (App Password) بنائیں",
        body: [
          "App Passwords کا صفحہ کھولیں، نام میں “FinovaOS” لکھیں اور Create دبائیں۔",
          "گوگل 16 حروف کا پاس ورڈ دکھائے گا۔ اسے بغیر خالی جگہوں (spaces) کے کاپی کر لیں، یہ دوبارہ نظر نہیں آئے گا۔",
        ],
        link: { href: "https://myaccount.google.com/apppasswords", label: "App Passwords کھولیں" },
      },
      {
        title: "بائیں طرف والا فارم بھریں",
        body: ["نیچے ٹیبل کے مطابق ہر خانہ بھریں اور Save Configuration دبائیں۔"],
      },
      {
        title: "ٹیسٹ کریں",
        body: [
          "Test Email دبائیں۔ اگر “Success” آ جائے تو کام مکمل، اب ای میلز آپ کے اپنے ایڈریس سے جائیں گی۔",
          "پہلی بار Spam فولڈر بھی ضرور دیکھ لیں۔",
        ],
      },
    ],
    fieldsTitle: "ہر خانے میں کیا لکھنا ہے (جی میل)",
    fields: [
      ["Enable company-specific SMTP", "ٹک کریں"],
      ["SMTP Host", "smtp.gmail.com"],
      ["SMTP Port", "587"],
      ["SSL/TLS", "پورٹ 587 کے لیے ٹک نہ کریں (صرف پورٹ 465 پر ٹک کریں)"],
      ["SMTP User", "آپ کا پورا جی میل ایڈریس، مثلاً yourname@gmail.com"],
      ["Password / App Password", "مرحلہ 2 والا 16 حروف کا ایپ پاس ورڈ، آپ کا عام جی میل پاس ورڈ نہیں"],
      ["From Email", "وہی جی میل ایڈریس"],
      ["From Name", "آپ کے کاروبار کا نام، کسٹمر کو یہی نام نظر آئے گا"],
    ],
    fillGmail: "جی میل کا ہوسٹ اور پورٹ خود بھر دیں",
    othersTitle: "دوسری ای میل سروسز",
    others: [
      ["Outlook / Microsoft 365", "smtp.office365.com · پورٹ 587"],
      ["Yahoo Mail", "smtp.mail.yahoo.com · پورٹ 465 · SSL/TLS ٹک کریں"],
      ["اپنے ڈومین کی ای میل", "SMTP ہوسٹ، پورٹ اور پاس ورڈ اپنے ای میل فراہم کنندہ سے پوچھیں"],
    ],
    helpTitle: "کچھ کام نہیں کر رہا؟",
    help: [
      "“Invalid login”: آپ نے عام پاس ورڈ ڈالا ہے۔ اس کی جگہ 16 حروف کا ایپ پاس ورڈ ڈالیں۔",
      "App Passwords کا آپشن نہیں مل رہا: 2-Step Verification ابھی آن نہیں ہے (مرحلہ 1)۔",
      "ایپ پاس ورڈ میں سے خالی جگہیں (spaces) نکال دیں۔",
      "ایک جی میل اکاؤنٹ سے روزانہ تقریباً 500 ای میلز بھیجی جا سکتی ہیں۔",
    ],
    note: "آپ کا پاس ورڈ انکرپٹ ہو کر محفوظ ہوتا ہے اور سیو کرنے کے بعد دوبارہ نظر نہیں آتا۔",
  },
};

const STORAGE_KEY = "finova:email-guide-lang";

export default function EmailSetupGuide({ onFillGmail }: { onFillGmail?: () => void }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ur") setLang(saved);
    } catch {}
  }, []);

  function pick(next: Lang) {
    setLang(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  const g = GUIDE[lang];
  const rtl = lang === "ur";
  // Urdu reads in Nastaliq-style fonts; fall back gracefully if none installed.
  const font = rtl ? "'Noto Nastaliq Urdu','Noto Naskh Arabic','Jameel Noori Nastaleeq',serif" : undefined;
  const lineHeight = rtl ? 2.1 : 1.6;

  const toggleBtn = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => pick(value)}
      aria-pressed={lang === value}
      className={`px-3 py-1 text-xs font-bold rounded-full transition ${lang === value ? "bg-amber-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {label}
    </button>
  );

  return (
    <aside className="bg-white border rounded p-5 lg:sticky lg:top-4 self-start" aria-label="Email setup guide">
      <div className="flex items-center justify-between gap-3 mb-3" dir="ltr">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Setup guide</span>
        <div className="flex items-center gap-1 border rounded-full p-0.5" role="group" aria-label="Language">
          {toggleBtn("en", "English")}
          {toggleBtn("ur", "اردو")}
        </div>
      </div>

      <div dir={rtl ? "rtl" : "ltr"} style={{ fontFamily: font, lineHeight }} className="text-sm text-gray-800">
        <h2 className="text-lg font-bold mb-1">{g.title}</h2>
        <p className="text-gray-600 mb-4">{g.intro}</p>

        <ol className="space-y-4 mb-5">
          {g.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5" dir="ltr">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-bold">{s.title}</div>
                {s.body.map((b, j) => <p key={j} className="text-gray-600">{b}</p>)}
                {s.link && (
                  <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-amber-700 font-semibold underline">
                    {s.link.label} ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h3 className="font-bold mb-2">{g.fieldsTitle}</h3>
        <div className="border rounded overflow-hidden mb-2">
          {g.fields.map(([k, v], i) => (
            <div key={i} className={`grid grid-cols-[2fr_3fr] gap-3 px-3 py-2 ${i % 2 ? "bg-gray-50" : ""}`}>
              <span className="font-semibold" dir="ltr" style={{ textAlign: rtl ? "right" : "left" }}>{k}</span>
              <span className="text-gray-700 break-words">{v}</span>
            </div>
          ))}
        </div>
        {onFillGmail && (
          <button type="button" onClick={onFillGmail} className="mb-5 text-xs font-bold px-3 py-1.5 rounded border border-amber-600 text-amber-700 hover:bg-amber-50" style={{ fontFamily: font }}>
            {g.fillGmail}
          </button>
        )}

        <h3 className="font-bold mb-2 mt-2">{g.othersTitle}</h3>
        <ul className="mb-5 space-y-1 text-gray-700">
          {g.others.map(([k, v], i) => (
            <li key={i}><span className="font-semibold">{k}:</span> {v}</li>
          ))}
        </ul>

        <h3 className="font-bold mb-2">{g.helpTitle}</h3>
        <ul className="list-disc ps-5 mb-4 space-y-1 text-gray-700">
          {g.help.map((h, i) => <li key={i}>{h}</li>)}
        </ul>

        <p className="text-xs text-gray-500 border-t pt-3">🔒 {g.note}</p>
      </div>
    </aside>
  );
}
