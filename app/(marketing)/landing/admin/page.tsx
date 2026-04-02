//  "use client";
//  import Link from "next/link";
 
//  export default function LandingAdminPage() {
//    return (
//      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
//        <div className="max-w-7xl mx-auto px-6 py-16">
//          <h1 className="text-4xl font-extrabold">Admin Overview</h1>
//          <p className="mt-3 text-slate-600">
//            Configure roles, permissions, companies, branches, and audit logs with confidence.
//          </p>
//          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
//            {[
//              { t: "Role-Based Access Control", d: "Assign granular permissions to ADMIN, ACCOUNTANT, and VIEWER." },
//              { t: "Multi-Company Management", d: "Create, switch, and set default company for users." },
//              { t: "Audit Logging", d: "Track critical actions performed across the system." },
//              { t: "Security Policies", d: "JWT sessions, secure cookies, and subscription guard." },
//              { t: "Data Backup", d: "Cloud backup schedules and restore flows." },
//              { t: "User Management", d: "Invite users, activate/deactivate accounts securely." },
//            ].map((f) => (
//              <div key={f.t} className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
//                <div className="font-semibold">{f.t}</div>
//                <div className="mt-2 text-sm text-slate-600">{f.d}</div>
//              </div>
//            ))}
//          </div>
//          <div className="mt-10">
//            <Link href="/get-started" className="px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700">
//              Get Started
//            </Link>
//          </div>
//        </div>
//      </div>
//    );
//  }



"use client";
import Link from "next/link";

export default function LandingAdminPage() {
  const adminFeatures = [
    { 
      icon: "🔐", 
      title: "Role-Based Access Control", 
      desc: "Granular permissions: ADMIN, ACCOUNTANT, VIEWER with audit trails",
      color: "from-indigo-500 to-purple-600"
    },
    { 
      icon: "🏢", 
      title: "Multi-Company Management", 
      desc: "Create, switch, archive companies & set user defaults instantly",
      color: "from-emerald-500 to-teal-600"
    },
    { 
      icon: "📋", 
      title: "Complete Audit Logging", 
      desc: "Track every action, export logs, compliance-ready reports",
      color: "from-amber-500 to-orange-600"
    },
    { 
      icon: "🛡️", 
      title: "Enterprise Security", 
      desc: "JWT sessions, 2FA, secure cookies, subscription enforcement",
      color: "from-rose-500 to-pink-600"
    },
    { 
      icon: "💾", 
      title: "Automated Data Backup", 
      desc: "Daily cloud backups + point-in-time restore capabilities",
      color: "from-blue-500 to-cyan-600"
    },
    { 
      icon: "👥", 
      title: "Advanced User Management", 
      desc: "Bulk invites, role assignments, activate/deactivate securely",
      color: "from-slate-500 to-zinc-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 text-slate-900 antialiased">
      {/* Gradient Background Decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-linear-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        {/* Hero Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-100/80 to-purple-100/80 border-2 border-indigo-200/50 rounded-3xl backdrop-blur-xl shadow-xl mb-8 mx-auto max-w-max">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
            </span>
            <span className="font-bold text-indigo-800 text-lg">Admin Dashboard Access</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-8 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text tracking-tight">
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600">Control Center</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12">
            Configure roles, companies, security policies, and audit everything with enterprise-grade controls.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Link 
              href="/admin/roles" 
              className="w-full sm:w-auto px-10 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl rounded-4xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
            >
              🚀 Enter Admin Panel
            </Link>
            <Link 
              href="/pricing" 
              className="px-10 py-6 border-3 border-slate-200 bg-white/90 text-slate-900 font-bold text-xl rounded-4xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all backdrop-blur-xl flex items-center justify-center"
            >
              👁️ View Demo First
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminFeatures.map((feature, index) => (
            <div 
              key={feature.title} 
              className="group relative bg-white/80 backdrop-blur-xl rounded-4xl p-10 border border-slate-200/50 shadow-2xl hover:shadow-3xl hover:-translate-y-4 hover:border-indigo-300/70 transition-all duration-500 overflow-hidden hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50/50"
            >
              {/* Background Glow */}
                <div className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-5 blur-xl group-hover:opacity-10 transition-opacity`}></div>
              
              <div className="relative">
                {/* Icon */}
                  <div className={`w-20 h-20 mx-auto mb-8 rounded-3xl bg-linear-to-br ${feature.color} shadow-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all duration-300 shadow-${feature.color.split('-')[0]}-500/30`}>
                  {feature.icon}
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-black text-slate-900 mb-6 text-center group-hover:text-indigo-700 transition-colors">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-slate-600 text-lg leading-relaxed text-center group-hover:text-slate-800 transition-colors">
                  {feature.desc}
                </p>
                
                {/* Index Badge */}
                  <div className="absolute top-6 -right-6 w-12 h-12 bg-linear-to-br from-indigo-600 to-purple-600 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/50 group-hover:rotate-12 transition-all duration-300">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-24 flex flex-wrap justify-center gap-12 opacity-80 hover:opacity-100 transition-all duration-500">
            <div className="w-28 h-12 bg-linear-to-r from-slate-200 to-slate-300 rounded-2xl shadow-lg flex items-center justify-center animate-pulse"></div>
          <div className="w-28 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl shadow-lg flex items-center justify-center animate-pulse delay-300"></div>
          <div className="w-28 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl shadow-lg flex items-center justify-center animate-pulse delay-600"></div>
          <div className="w-28 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl shadow-lg flex items-center justify-center animate-pulse delay-900"></div>
          <div className="w-28 h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl shadow-lg flex items-center justify-center animate-pulse delay-1200"></div>
        </div>

        {/* Final CTA */}
        <div className="mt-32 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-200 text-emerald-800 font-bold rounded-3xl shadow-xl mb-8 backdrop-blur-sm">
            <span className="text-2xl">✅</span>
            Enterprise-grade security for modern businesses
          </div>
          <Link 
            href="/admin/dashboard" 
            className="inline-block px-12 py-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 text-white font-black text-2xl rounded-4xl shadow-4xl hover:shadow-5xl hover:scale-105 transition-all duration-300 group"
          >
            <span>Enter Secure Admin →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
