"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function QuickBooksHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative bg-white pt-20 pb-32 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Trusted by 10,000+ Businesses
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
              Smart accounting <br />
              <span className="text-emerald-600">for smart business.</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl font-medium">
              Manage your invoices, expenses, and taxes all in one place. Save time, get paid faster, and stay organized effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link 
                href="/signup" 
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-emerald-200 transition-all text-center"
              >
                Get Started Now
              </Link>
              <Link 
                href="/pricing" 
                className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-lg font-bold transition-all text-center shadow-sm"
              >
                View Plans & Pricing
              </Link>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    U{i}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-bold text-slate-900">4.9/5 Rating</div>
                <div className="text-slate-500 font-medium">based on 2,000+ reviews</div>
              </div>
            </div>
          </div>

          <div className={`relative transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
            {/* Mockup UI */}
            <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-800 transform rotate-2 hover:rotate-0 transition-transform duration-700">
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                {/* Header */}
                <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  </div>
                  <div className="flex-1 h-6 bg-white rounded-lg border border-slate-100 flex items-center px-3">
                    <div className="w-20 h-2 bg-slate-50 rounded" />
                  </div>
                </div>
                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Revenue</div>
                      <div className="text-2xl font-extrabold text-slate-900">$124,500.00</div>
                    </div>
                    <div className="w-24 h-12 flex items-end gap-1">
                      {[40, 70, 55, 90, 60, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-emerald-500 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-lg">
                          {i === 1 ? '📄' : i === 2 ? '💰' : '📦'}
                        </div>
                        <div className="flex-1">
                          <div className="h-2.5 w-24 bg-slate-200 rounded mb-2" />
                          <div className="h-2 w-16 bg-slate-100 rounded" />
                        </div>
                        <div className="h-2.5 w-12 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-600 rounded-3xl opacity-10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-600 rounded-full opacity-10 blur-3xl animate-pulse delay-1000" />
          </div>
        </div>
      </div>
    </section>
  );
}
