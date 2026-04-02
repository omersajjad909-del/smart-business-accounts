"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCurrentUser } from "@/lib/auth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Get values directly from form as fallback for password managers
    const formData = new FormData(e.currentTarget);
    const finalEmail = (formData.get("email") as string) || email;
    const finalPassword = (formData.get("password") as string) || password;

    console.log("ðŸš€ Payload Checking:", { 
      email: finalEmail, 
      passLen: finalPassword?.length 
    });

    if (!finalEmail || !finalPassword) {
      setError("Please fill both email and password");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: finalEmail, password: finalPassword }),
      });

      const data = await res.json();
      
      if (res.ok) {
        console.log("âœ… LOGIN SUCCESS!");
        // We only store basic info in localStorage for UI purposes.
        // The real auth is handled by the httpOnly cookie set by the server.
        const userData = {
          id:           data.user.id,
          name:         data.user.name,
          email:        data.user.email,
          role:         "ADMIN",
          companyId:    "system",
          isSuperAdmin: data.user.isSuperAdmin !== false,
          team:         data.user.team || null,
          allowedPages: data.user.allowedPages || null,
        };
        setCurrentUser(userData);
        
        router.push("/admin");
      } else {
        console.error("âŒ SERVER ERROR DETAILS:", JSON.stringify(data));
        setError(data.message || `Error ${res.status}`);
      }
    } catch (err: any) {
      console.error("ðŸ”¥ Admin Login Error:", err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c1e", fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 40, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 24, textAlign: "center" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5" opacity=".7"/><path d="M2 12l10 5 10-5" opacity=".88"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 8 }}>Admin Login</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>SaaS Control Center Access</p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 13, marginBottom: 24, textAlign: "left" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Email Address</label>
            <input 
              type="email" 
              name="email"
              autoComplete="username"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="finovaos.app@gmail.com"
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", outline: "none", transition: "all .2s" }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Password</label>
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              required
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", outline: "none", transition: "all .2s" }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: 8, padding: "14px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all .2s", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Authenticating..." : "Sign in to Admin"}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <Link href="/login" style={{ fontSize: 13, color: "rgba(255,255,255,.3)", textDecoration: "none", transition: "color .2s" }}>
            Return to Project Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
