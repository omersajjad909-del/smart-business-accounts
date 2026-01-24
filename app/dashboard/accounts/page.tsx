"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Account = {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  partyType?: string | null;
  city?: string | null;
  phone?: string | null;
  openDebit?: number;
  openCredit?: number;
  openDate?: string;
  creditDays?: number;
  creditLimit?: number;
};

// --- PREFIX MAP BASED ON YOUR LIST ---
const PREFIX_MAP: Record<string, string> = {
  "CUSTOMER": "CS",
  "SUPPLIER": "SP",
  "BANKS": "BNK",
  "CASH": "CASH",
  "FIXED ASSETS": "FA",
  "ACCUMULATED DEPRECIATION": "ADEP",
  "EXPENSE": "EXP",
  "INCOME": "INC",
  "EQUITY": "EQT",
  "LIABILITIES": "LIAB",
  "STOCK": "STK",
  "GENERAL": "GEN",
  "CONTRA": "CON",
};

export default function ChartOfAccounts() {
  const today = new Date().toISOString().split("T")[0];
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");


  const [form, setForm] = useState({
    code: "",
    name: "",
    partyType: "GENERAL",
    city: "",
    phone: "",
    openDate: today,
    openDebit: "",
    openCredit: "",
    creditDays: "",
    creditLimit: "",
  });

  async function loadAccounts() {
    const user = getCurrentUser();
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetch("/api/accounts", {
        headers: { "x-user-role": user.role },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setAccounts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAccounts(); }, []);

  
  async function handleCategoryChange(category: string) {
  
    if (editingId) {
      setForm({ ...form, partyType: category });
      return;
    }

    const prefix = PREFIX_MAP[category] || "ACC";
    const user = getCurrentUser();

    try {
      // یہاں ہم نے پاتھ کو ٹھیک کیا ہے: /api/accounts/next-code کی جگہ /api/accounts استعمال کریں
      // اس URL کو تبدیل کریں
      const res = await fetch(`/api/accounts?prefix=${prefix}`, { // 'next-code' ہٹا دیں
        headers: {
          "x-user-role": "ADMIN" // رول بھیجنا لازمی ہے
        }
      });

      const data = await res.json();

      if (data.nextCode) {
        setForm({ ...form, partyType: category, code: data.nextCode });
      } else {
        setForm({ ...form, partyType: category });
      }
    } catch (e) {
      console.error("Error fetching next code", e);
      setForm({ ...form, partyType: category });
    }
  }

  async function saveAccount() {
    const user = getCurrentUser();
    if (!user) return alert("Session expired");
    if (!form.code || !form.name) return alert("Code aur name zaroori hai");

    const method = editingId ? "PUT" : "POST";
    const payload = editingId ? { ...form, id: editingId } : form;

    const res = await fetch("/api/accounts", {
      method: method,
      headers: { "Content-Type": "application/json", "x-user-role": user.role },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetForm();
      loadAccounts();
      alert(editingId ? "Account updated!" : "Account saved!");
    } else {
      alert("Failed to save account");
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Are you sure?")) return;
    const user = getCurrentUser();
    if (!user) {
  alert("User not logged in");
  return;
}

const res = await fetch(`/api/accounts?id=${id}`, {
  method: "DELETE",
  headers: { "x-user-role": user.role },
});

    if (res.ok) loadAccounts();
    else alert("Failed to delete");
  }

  function handleEdit(a: Account) {
    setEditingId(a.id);
    setForm({
      code: a.code,
      name: a.name,
      partyType: a.partyType || "GENERAL",
      city: a.city || "",
      phone: a.phone || "",
      openDate: a.openDate ? new Date(a.openDate).toISOString().split("T")[0] : today,
      openDebit: String(a.openDebit || ""),
      openCredit: String(a.openCredit || ""),
      creditDays: String(a.creditDays || ""),
      creditLimit: String(a.creditLimit || ""),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      code: "", name: "", partyType: "GENERAL",
      city: "", phone: "", openDate: today,
      openDebit: "", openCredit: "", creditDays: "", creditLimit: "",
    });
  }

  const filteredAccounts = accounts.filter(a => {
    const matchesTab = activeTab === "ALL" ? true : a.partyType === activeTab;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      a.name.toLowerCase().includes(term) ||
      a.code.toLowerCase().includes(term) ||
      (a.city || "").toLowerCase().includes(term);
    return matchesTab && matchesSearch;
  });

  if (loading) return <div className="p-6 font-bold">Loading accounts…</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <h1 className="text-2xl font-black border-b-4 border-black pb-2 uppercase italic">Chart of Accounts</h1>
        <input
    type="text"
    placeholder="Search accounts..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="border px-3 py-2 rounded w-full md:w-64"
  />

      <div className={`bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${editingId ? 'border-blue-500 bg-blue-50' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm font-bold">

          <select
            className="border-2 border-black p-2 bg-yellow-50 md:col-span-1"
            value={form.partyType}
            onChange={e => handleCategoryChange(e.target.value)}
          >
            <option value="GENERAL">General</option>
            <option value="CUSTOMER">Customers</option>
            <option value="SUPPLIER">Suppliers</option>
            <option value="BANKS">Banks (Savings/Current)</option>
            <option value="CASH">Cash in Hand</option>
            <option value="FIXED ASSETS">Fixed Assets (Building, Machinery)</option>
            <option value="ACCUMULATED DEPRECIATION">Accumulated Depreciation</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Revenue / Other Income</option>
            <option value="EQUITY">Equity (Capital, Retained Earnings)</option>
            <option value="LIABILITIES">Liabilities (Loans, Tax Payable)</option>
            <option value="STOCK">Stock / Inventory</option>
            <option value="CONTRA">Contra</option>
          </select>

          <input placeholder="A/C Code" className="border-2 border-black p-2 outline-none font-black text-blue-600" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <input placeholder="Account Name" className="border-2 border-black p-2 md:col-span-2 outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="City" className="border-2 border-black p-2 outline-none" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          <input placeholder="Phone" className="border-2 border-black p-2 outline-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />

          <input type="date" className="border-2 border-black p-2 outline-none" value={form.openDate} onChange={e => setForm({ ...form, openDate: e.target.value })} />
          <input placeholder="Open Debit" className="border-2 border-black p-2 outline-none" value={form.openDebit} onChange={e => setForm({ ...form, openDebit: e.target.value })} />
          <input placeholder="Open Credit" className="border-2 border-black p-2 outline-none" value={form.openCredit} onChange={e => setForm({ ...form, openCredit: e.target.value })} />
          <input placeholder="Credit Days" className="border-2 border-black p-2 outline-none" value={form.creditDays} onChange={e => setForm({ ...form, creditDays: e.target.value })} />
          <input placeholder="Credit Limit" className="border-2 border-black p-2 outline-none" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />

          <div className="md:col-span-1 flex gap-2">
            <button onClick={saveAccount} className={`${editingId ? 'bg-blue-600' : 'bg-black'} text-white flex-1 py-2 uppercase font-black`}>
              {editingId ? "Update" : "Save"}
            </button>
            {editingId && <button onClick={resetForm} className="bg-red-500 text-white px-4 py-2 uppercase font-black">X</button>}
          </div>
        </div>
      </div>

      {/* TABS (Simplified for UI) */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "CUSTOMER", "SUPPLIER", "BANKS", "EXPENSE", "FIXED ASSETS", "EQUITY", 
        "LIABILITIES", "CASH", "INCOME", "GENERAL", "CONTRA"
        ].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1 border-2 border-black font-black text-[10px] ${activeTab === tab ? "bg-yellow-400" : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>{tab}</button>
        ))}
      </div>

      <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead>
            <tr className="bg-black text-white uppercase text-[10px]">
              <th className="p-3 border-r">Code</th>
              <th className="p-3 border-r">Name</th>
              <th className="p-3 border-r">Category</th>
              <th className="p-3 border-r">City</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="font-bold uppercase text-[12px]">
            {filteredAccounts.map((a) => (
              <tr key={a.id} className="border-b-2 border-black hover:bg-blue-50">
                <td className="p-3 border-r-2 border-black text-blue-700">{a.code}</td>
                <td className="p-3 border-r-2 border-black">{a.name}</td>
                <td className="p-3 border-r-2 border-black text-[9px]">{a.partyType}</td>
                <td className="p-3 border-r-2 border-black">{a.city || "---"}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => handleEdit(a)} className="bg-yellow-400 border border-black px-2 py-1 text-[10px]">EDIT</button>
                  <button onClick={() => deleteAccount(a.id)} className="bg-red-500 text-white border border-black px-2 py-1 text-[10px]">DEL</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

