import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finova — Cloud Financial Management for SMEs",
  description: "Secure, cloud-based accounting for traders, distributors, manufacturers, and service businesses. Real-time dashboards, smart reporting, and multi-company management.",
  openGraph: {
    title: "Finova",
    description: "Cloud financial management for SMEs — professional, trustworthy, and simple.",
    url: "https://example.com/landing",
    siteName: "Finova",
    images: [
      { url: "/og/landing", width: 1200, height: 630, alt: "Finova" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova",
    description: "Cloud financial management for SMEs.",
    images: ["/og/landing"],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    
      {children}
    </>
  )
}

// "use client";
// // ═══════════════════════════════════════════════════════
// //  FILE: app/admin/layout.tsx
// //  Sirf auth check karta hai — sidebar/UI AdminPanel.tsx mein hai
// // ═══════════════════════════════════════════════════════

// import { ReactNode, useEffect, useState } from "react";
// import { usePathname, useRouter } from "next/navigation";
// import { Toaster } from "react-hot-toast";

// function getCurrentUser() {
//   if (typeof window === "undefined") return null;
//   try {
//     const raw = localStorage.getItem("user");
//     return raw ? JSON.parse(raw) : null;
//   } catch {
//     return null;
//   }
// }

// export default function AdminLayout({ children }: { children: ReactNode }) {
//   const pathname  = usePathname();
//   const router    = useRouter();
//   const isLoginPage = pathname === "/admin/login";

//   const [authorized, setAuthorized] = useState(false);
//   const [checking,   setChecking]   = useState(true);

//   useEffect(() => {
//     // Login page — no auth needed
//     if (isLoginPage) {
//       setChecking(false);
//       return;
//     }

//     const user = getCurrentUser();

//     if (!user || user.role !== "ADMIN") {
//       router.replace("/admin/login");
//       return;
//     }

//     setAuthorized(true);
//     setChecking(false);
//   }, [pathname]);

//   // Login page — render as-is
//   if (isLoginPage) {
//     return (
//       <>
//         <Toaster position="top-center" />
//         {children}
//       </>
//     );
//   }

//   // Auth check chal raha hai
//   if (checking) {
//     return (
//       <div style={{
//         minHeight: "100vh",
//         background: "#080c1e",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         color: "rgba(255,255,255,.4)",
//         fontFamily: "'Outfit',sans-serif",
//         fontSize: 14,
//         gap: 12,
//       }}>
//         <div style={{
//           width: 20, height: 20, borderRadius: "50%",
//           border: "2px solid rgba(99,102,241,.3)",
//           borderTopColor: "#6366f1",
//           animation: "spin 0.8s linear infinite",
//         }}/>
//         Verifying Admin Access...
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // Unauthorized — null return (redirect ho raha hai)
//   if (!authorized) return null;

//   // Authorized — sirf children render karo (AdminPanel.tsx apna layout khud handle karta hai)
//   return (
//     <>
//       <Toaster position="top-center" />
//       {children}
//     </>
//   );
// }