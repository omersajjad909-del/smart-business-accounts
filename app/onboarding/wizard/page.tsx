"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Toaster, toast } from "react-hot-toast";

export default function OnboardingWizard() {
  const [show, setShow] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const v = document.cookie.split(";").some(c => c.trim().startsWith("first_login="));
      setShow(v);
    } catch {}
  }, []);

  async function saveProfile() {
    if (!companyName) {
      toast.error("Please enter a company name");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/onboarding/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, fiscalYearStart, baseCurrency }),
      });
      if (r.ok) {
        setSaved(true);
        toast.success("Company profile saved!");
      } else {
        const d = await r.json();
        toast.error(d.error || "Failed to save profile");
      }
    } catch (err) {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">F</div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">FinovaOS</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
              Account Created
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Welcome to FinovaOS</h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">Let’s get your workspace ready. Follow these quick steps to set up your business profile.</p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className={`bg-white rounded-[32px] border ${saved ? 'border-emerald-200' : 'border-slate-200'} p-8 shadow-sm transition-all`}>
            <div className="flex items-start gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {saved ? "✓" : "1"}
              </div>
              <div className="flex-1">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Company Profile</h3>
                  <p className="text-sm font-medium text-slate-400">Basic details to identify your business on invoices and reports.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                    <input 
                      value={companyName} onChange={e=>setCompanyName(e.target.value)} 
                      placeholder="Acme Corp" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Fiscal Year Start</label>
                    <input 
                      type="date" value={fiscalYearStart} onChange={e=>setFiscalYearStart(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Base Currency</label>
                    <input 
                      value={baseCurrency} onChange={e=>setBaseCurrency(e.target.value)} 
                      placeholder="USD" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={saveProfile}
                  disabled={saving || saved}
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${
                    saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                  }`}
                >
                  {saving ? "Saving..." : saved ? "Profile Saved" : "Save & Continue"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 (Locked) */}
          <div className="bg-white/60 rounded-[32px] border border-slate-200 p-8 shadow-sm opacity-60">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-xl font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Tax & Regional Settings</h3>
                <p className="text-sm font-medium text-slate-400">Configure VAT/GST, timezone, and date formats.</p>
              </div>
            </div>
          </div>

          {/* Step 3 (Locked) */}
          <div className="bg-white/60 rounded-[32px] border border-slate-200 p-8 shadow-sm opacity-60">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-xl font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Invite Your Team</h3>
                <p className="text-sm font-medium text-slate-400">Add accountants or managers to your workspace.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Everything auto-saves
          </div>
          <div className="flex gap-4">
            <Link href="/onboarding/checklist" className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              View Checklist
            </Link>
            <Link href="/dashboard" className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
