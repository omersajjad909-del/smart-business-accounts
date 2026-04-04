"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Update = {
  id: string;
  title: string;
  body: string;
  type: string;
  version?: string;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  feature: { label: "New Feature", icon: "✨", color: "#818cf8", bg: "rgba(129,140,248,.12)" },
  improvement: { label: "Improvement", icon: "⚡", color: "#38bdf8", bg: "rgba(56,189,248,.12)" },
  bugfix: { label: "Bug Fix", icon: "🐛", color: "#34d399", bg: "rgba(52,211,153,.12)" },
  announcement: { label: "Announcement", icon: "📣", color: "#fbbf24", bg: "rgba(251,191,36,.12)" },
  maintenance: { label: "Maintenance", icon: "🔧", color: "#f87171", bg: "rgba(248,113,113,.12)" },
};

export default function ReleaseNotesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/updates")
      .then((r) => r.json())
      .then((d) => {
        setUpdates(d.updates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#080c1e] text-white font-sans py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-6">
            🚀 Product Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            What's New in FinovaOS
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and bug fixes we've been working on to help you manage your business better.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800">
            <div className="text-4xl mb-4">📫</div>
            <h3 className="text-xl font-bold mb-2">No updates found</h3>
            <p className="text-slate-500">Check back later for new releases!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {updates.map((update) => {
              const tc = TYPE_CONFIG[update.type] || TYPE_CONFIG.feature;
              return (
                <div key={update.id} className="relative pl-8 md:pl-0">
                  {/* Timeline line */}
                  <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-slate-800 -ml-24"></div>
                  
                  <div className="md:grid md:grid-cols-[160px_1fr] gap-12">
                    {/* Date Sidebar */}
                    <div className="hidden md:block text-right -ml-24 pr-12">
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        {new Date(update.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {new Date(update.createdAt).getFullYear()}
                      </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 hover:border-indigo-500/30 transition-all group">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                          style={{ backgroundColor: tc.bg, color: tc.color }}
                        >
                          {tc.icon} {tc.label}
                        </span>
                        {update.version && (
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold font-mono">
                            {update.version}
                          </span>
                        )}
                        <span className="md:hidden text-xs text-slate-500 font-bold">
                          • {new Date(update.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-4 group-hover:text-indigo-400 transition-colors">
                        {update.title}
                      </h2>
                      
                      <div className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {update.body}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-24 p-12 rounded-[40px] bg-gradient-to-br from-indigo-600 to-violet-700 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Want to see these in action?</h2>
            <p className="text-indigo-100 mb-8 max-w-lg mx-auto">
              Join thousands of businesses using FinovaOS to automate their accounts and inventory management.
            </p>
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all transform hover:scale-105 active:scale-95 shadow-xl"
            >
              Get Started for Free 🚀
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
