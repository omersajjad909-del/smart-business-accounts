"use client";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  ngoBg,
  ngoBorder,
  ngoFont,
  ngoMuted,
  mapBeneficiaries,
  mapDonors,
  mapFunds,
  mapFundTransactions,
  mapGrants,
} from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: ngoMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: ngoMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function NgoAnalyticsPage() {
  const donors = mapDonors(useBusinessRecords("donor").records);
  const grants = mapGrants(useBusinessRecords("grant").records);
  const beneficiaries = mapBeneficiaries(useBusinessRecords("beneficiary").records);
  const funds = mapFunds(useBusinessRecords("fund").records);
  const transactions = mapFundTransactions(useBusinessRecords("fund_transaction").records);

  const totalRaised = donors.reduce((sum, donor) => sum + donor.totalDonated, 0);
  const totalGrants = grants.reduce((sum, grant) => sum + grant.amount, 0);
  const monthlyAid = beneficiaries.filter((beneficiary) => beneficiary.status === "active").reduce((sum, beneficiary) => sum + beneficiary.monthlyAid, 0);
  const totalBalance = funds.reduce((sum, fund) => sum + fund.balance, 0);

  const donorTypeMap = new Map<string, number>();
  donors.forEach((donor) => donorTypeMap.set(donor.type, (donorTypeMap.get(donor.type) || 0) + 1));
  const donorMix = [...donorTypeMap.entries()].sort((a, b) => b[1] - a[1]);

  const beneficiaryMap = new Map<string, number>();
  beneficiaries.forEach((beneficiary) => beneficiaryMap.set(beneficiary.category, (beneficiaryMap.get(beneficiary.category) || 0) + 1));
  const beneficiaryMix = [...beneficiaryMap.entries()].sort((a, b) => b[1] - a[1]);

  const receiptVolume = transactions.filter((transaction) => transaction.type === "receipt").reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseVolume = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ngoFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>NGO Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Fundraising mix, aid burden, aur mission accountability</h1>
        <p style={{ margin: 0, fontSize: 14, color: ngoMuted, maxWidth: 760 }}>
          Is page se NGO leadership ko donor base, beneficiary spread, receipts vs expenses, aur fund balances ka quick strategic view milta hai.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Donor Raised" value={`Rs. ${totalRaised.toLocaleString()}`} note="Direct donor contributions" color="#34d399" />
        <Metric title="Grant Book" value={`Rs. ${totalGrants.toLocaleString()}`} note="Approved grant portfolio" color="#60a5fa" />
        <Metric title="Monthly Aid" value={`Rs. ${monthlyAid.toLocaleString()}`} note="Active beneficiary commitment" color="#f59e0b" />
        <Metric title="Fund Balance" value={`Rs. ${totalBalance.toLocaleString()}`} note={`Receipts ${receiptVolume.toLocaleString()} / Expenses ${expenseVolume.toLocaleString()}`} color="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Donor Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {donorMix.length === 0 ? (
              <div style={{ color: ngoMuted, fontSize: 13 }}>Donor mix show karne ke liye donor records add karein.</div>
            ) : donorMix.map(([type, count]) => {
              const pct = donors.length ? Math.max(10, Math.round((count / donors.length) * 100)) : 10;
              return (
                <div key={type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{type}</span>
                    <span style={{ fontSize: 12, color: ngoMuted }}>{count} donors</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#6366f1,#3b82f6)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: ngoBg, border: `1px solid ${ngoBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Beneficiary Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {beneficiaryMix.length === 0 ? (
              <div style={{ color: ngoMuted, fontSize: 13 }}>Beneficiary mix dekhne ke liye aid profiles add karein.</div>
            ) : beneficiaryMix.map(([category, count]) => (
              <div key={category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{category}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
