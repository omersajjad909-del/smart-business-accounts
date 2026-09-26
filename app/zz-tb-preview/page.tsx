"use client";
import TrialBalancePage from "@/app/dashboard/reports/trial-balance/page";
export default function P() {
  return (
    <div className="dashboard-root" style={{ display:"flex", minHeight:"100dvh", background:"#0b1020" }}>
      <aside style={{ width:70, background:"#111a33" }}>SIDEBAR</aside>
      <main style={{ flex:1, padding:16 }}><div className="dashboard-content-scroll"><div className="dashboard-content-inner"><TrialBalancePage/></div></div></main>
      <div className="demo-session-timer" style={{ position:"fixed", right:20, bottom:20, color:"white" }}>DEMO SESSION</div>
    </div>
  );
}
