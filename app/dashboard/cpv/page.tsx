"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";

type Account = {
  id: string;
  name: string;
  phone?: string | null;
  partyType?: string | null;
};

type Voucher = {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  accountName: string;
  accountId: string;
  amount: number;
  paymentMode: string;
  paymentAccountId: string;
};

export default function CPVPage() {
  const today = new Date().toISOString().split("T")[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<Voucher | null>(null);

  const [accountId, setAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [narration, setNarration] = useState("");
  const [voucher, setVoucher] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");

  const user = getCurrentUser();

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!user) {
      // toast.error("Session expired");
      return;
    }

    if (!user.companyId) {
      toast.error("Please select a company first");
      return;
    }

    loadVouchers();
    loadAccounts();
  }, []);

  async function loadVouchers() {
    try {
      if (!user?.companyId) return;
      const res = await fetch("/api/cpv", {
        headers: { 
          "x-user-role": user?.role || "",
          "x-company-id": user.companyId 
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVouchers(data);
      }
    } catch (e) {
      console.error("Load vouchers error:", e);
    }
  }

  async function loadAccounts() {
    if (!user?.companyId) return;
    
    const headers = { 
      "x-user-role": user?.role || "",
      "x-company-id": user.companyId 
    };

    Promise.all([
      fetch("/api/accounts", {
        method: "GET",
        headers,
      }),
      fetch("/api/bank-accounts", { 
        method: "GET",
        headers,
      }),
    ])
      .then(async ([accountsRes, banksRes]) => {
        const accountsData = await accountsRes.json();
        const banksData = await banksRes.json();

        if (Array.isArray(accountsData)) {
          // CPV میں SUPPLIER + BANKS + دوسرے non-customer accounts
          setAccounts(
            accountsData.filter(a =>
              !a.partyType || (a.partyType !== "CUSTOMER")
            )
          );
        }

        const allBanks: any[] = [];
        // Removed manual addition of banks from accountsData as banksData already includes them
        
        if (Array.isArray(banksData)) {
          banksData.forEach((bank: any) => {
            allBanks.push({
              id: bank.id,
              accountId: bank.accountId,
              name: bank.accountName || `${bank.bankName} - ${bank.accountNo}`,
              bankName: bank.bankName,
              accountNo: bank.accountNo,
            });
          });
        }
        setBankAccounts(allBanks);
      })
      .catch(err => {
        console.error("Accounts load error:", err);
      });
  }

  /* ================= SAVE/UPDATE CPV ================= */
  async function saveCPV() {
    if (!accountId) {
      toast.error("Account select karein");
      return;
    }

    const amountNum = Number(amount);
    if (!amount || amount.trim() === "" || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Valid amount enter karein (0 se zyada)");
      return;
    }

    setSaving(true);

    try {
      const url = editing ? "/api/cpv" : "/api/cpv";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        },
        body: JSON.stringify(editing ? {
          id: editing.id,
          accountId,
          bankAccountId: bankAccountId || null,
          paymentMode: bankAccountId ? "BANK" : "CASH",
          amount,
          date,
          narration,
        } : {
          accountId,
          bankAccountId: bankAccountId || null,
          paymentMode: bankAccountId ? "BANK" : "CASH",
          amount,
          date,
          narration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Error: ${data?.error || "Save failed"}`);
        return;
      }

      setVoucher(data);
      alert(editing ? "CPV updated successfully!" : "CPV saved successfully!");
      await loadVouchers();
      resetForm();
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      alert(`Error: ${e.message || "Failed to save"}`);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setAccountId("");
    setBankAccountId("");
    setAmount("");
    setNarration("");
    setSelectedName("");
    setSelectedPhone("");
  }

  function startEdit(v: Voucher) {
    setEditing(v);
    setAccountId(v.accountId);
    setBankAccountId(v.paymentAccountId || "");
    setAmount(v.amount.toString());
    setDate(v.date);
    setNarration(v.narration);
    setShowForm(true);
    setShowList(false);
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Are you sure you want to delete this CPV?")) {
      return;
    }

    try {
      const res = await fetch(`/api/cpv?id=${id}`, {
        method: "DELETE",
        headers: { 
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        },
      });

      if (res.ok) {
        alert("CPV deleted successfully!");
        await loadVouchers();
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed");
      }
    } catch (_e) {
      alert("Delete failed");
    }
  }

  function printVoucher() {
    window.print();
  }

  function sendWhatsApp() {
    const phoneNo = voucher?.phone || selectedPhone;
    if (!phoneNo) {
      toast.error("Party ka phone number nahi mila");
      return;
    }

    const phone = String(phoneNo).replace(/\D/g, "");
    const finalPhone = phone.startsWith('0') ? '92' + phone.substring(1) : phone;

    if (finalPhone.length < 10) {
      toast.error("Phone number theek nahi hai");
      return;
    }

    const msg =
      `*US TRADERS - PAYMENT ADVICE*\n` +
      `--------------------------\n` +
      `*Voucher No:* ${voucher.voucherNo}\n` +
      `*Paid To:* ${selectedName || voucher.accountName}\n` +
      `*Amount:* Rs. ${Number(voucher.amount || amount || 0).toLocaleString()}/-\n` +
      `*Date:* ${voucher.date?.split('T')[0] || date}\n` +
      `*Narration:* ${narration || "N/A"}\n` +
      `--------------------------\n` +
      `_This is a computer generated confirmation._`;

    window.open(
      `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  }

  /* ================= UI ================= */
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cash Payment Voucher (CPV)</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowList(!showList);
              setShowForm(!showForm);
              setEditing(null);
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setShowList(false);
              setEditing(null);
              resetForm();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New CPV
          </button>
        </div>
      </div>

      {/* VOUCHER LIST */}
      {showList && (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Voucher No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Paid To</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-left">Payment Mode</th>
                <th className="p-3 text-left">Narration</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">
                    No CPVs found
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{v.voucherNo}</td>
                    <td className="p-3">{v.date}</td>
                    <td className="p-3">{v.accountName}</td>
                    <td className="p-3 text-right">{v.amount.toLocaleString()}</td>
                    <td className="p-3">{v.paymentMode}</td>
                    <td className="p-3">{v.narration}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(v)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteVoucher(v.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="border p-4 space-y-3 bg-white print:hidden">
          <h2 className="text-xl font-bold">
            {editing ? "Edit CPV" : "New CPV"}
          </h2>

          <select
            className="border px-3 py-2 w-full"
            value={accountId}
            onChange={(e) => {
              const id = e.target.value;
              setAccountId(id);
              const acc = accounts.find(a => a.id === id);
              setSelectedName(acc?.name || "");
              setSelectedPhone(acc?.phone || "");
            }}
          >
            <option value="">Paid To (Supplier / Bank / Expense)</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} {a.phone ? `(${a.phone})` : ""}
              </option>
            ))}
          </select>

          <div>
            <label className="block text-sm font-semibold mb-1">Payment Method</label>
            <select
              className="border px-3 py-2 w-full"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">Cash</option>
              {bankAccounts.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <input
            className="border px-3 py-2 w-full"
            placeholder="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <input
            type="date"
            className="border px-3 py-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <textarea
            className="border px-3 py-2 w-full"
            placeholder="Narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={saveCPV}
              disabled={saving}
              className="bg-black text-white px-4 py-2 flex-1"
            >
              {saving ? "Saving..." : editing ? "Update CPV" : "Save CPV"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                resetForm();
              }}
              className="bg-gray-600 text-white px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {voucher && (
        <div className="overflow-x-auto">
          <div className="invoice-print max-w-[210mm] mx-auto bg-white p-8 border-2 border-black text-black shadow-lg min-w-[700px]">
            <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-8">
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">US TRADERS</h1>
              <p className="text-[10px] font-bold tracking-[3px] text-gray-600 uppercase">Industrial Goods & Services</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black uppercase underline decoration-2 underline-offset-4">
                Payment Voucher
              </h2>
              <div className="mt-2 text-sm font-bold space-y-1">
                <p>No: <span className="font-mono">{voucher.voucherNo}</span></p>
                <p>Date: {voucher.date?.split('T')[0] || date}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 my-10">
            <div className="flex items-end gap-4 border-b border-gray-300 pb-2">
              <span className="text-xs font-black uppercase w-32 shrink-0">Paid To:</span>
              <span className="text-xl font-bold uppercase flex-1 border-b-2 border-black px-2">
                {selectedName || voucher.accountName}
              </span>
            </div>

            <div className="flex items-end gap-4 border-b border-gray-300 pb-2">
              <span className="text-xs font-black uppercase w-32 shrink-0">Amount (PKR):</span>
              <span className="text-xl font-bold italic flex-1 border-b-2 border-black px-2">
                Rs. {Number(voucher.amount || amount || 0).toLocaleString()}/-
              </span>
            </div>

            <div className="flex items-start gap-4 border-b border-gray-300 pb-2">
              <span className="text-xs font-black uppercase w-32 shrink-0">Description:</span>
              <span className="text-sm font-medium flex-1 border-b border-black px-2 italic">
                {narration || "Official transaction recorded."}
              </span>
            </div>
          </div>

          <div className="mt-16 flex justify-between items-end px-2">
            <div className="bg-gray-100 border-4 border-black p-4 flex flex-col min-w-[200px]">
              <span className="text-[10px] font-black uppercase border-b border-black mb-1">Net Amount Paid</span>
              <span className="text-3xl font-black italic">
                {Number(voucher.amount || amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-12">
              <div className="text-center w-32 border-t-2 border-black mt-12 pt-1 font-bold text-[10px] uppercase">Receiver Sign</div>
              <div className="text-center w-32 border-t-2 border-black mt-12 pt-1 font-bold text-[10px] uppercase">Accountant</div>
            </div>
          </div>

          <div className="mt-12 text-[9px] text-gray-400 text-center border-t pt-2 italic">
            This is a computer generated voucher for US TRADERS. No signature required if stamped.
          </div>

          <div className="flex gap-3 mt-10 print:hidden justify-center">
            <button onClick={printVoucher} className="bg-black text-white px-8 py-2 font-bold hover:bg-gray-800 transition-all shadow-md">
              Print Now
            </button>
            <button onClick={sendWhatsApp} className="bg-green-600 text-white px-8 py-2 font-bold hover:bg-green-700 transition-all shadow-md">
              WhatsApp
            </button>
            <button onClick={() => { setVoucher(null); resetForm(); }} className="bg-white text-black border-2 border-black px-8 py-2 font-bold hover:bg-gray-100">
              New Entry
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
