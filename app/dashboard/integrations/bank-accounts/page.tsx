"use client";
import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";

export default function BankAccountsPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getCurrentUser();

  // 1. Fetch existing accounts and link token
  useEffect(() => {
    loadAccounts();
    createLinkToken();
  }, []);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load accounts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createLinkToken() {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (e) {
      console.error("Failed to create link token:", e);
    }
  }

  // 2. Plaid Link handler
  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    try {
      const response = await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          publicToken: public_token, 
          companyId: user?.companyId 
        }),
      });
      if (response.ok) {
        toast.success("Bank account linked successfully!");
        loadAccounts();
      } else {
        toast.error("Failed to link bank account.");
      }
    } catch (e) {
      toast.error("An error occurred while linking.");
    }
  }, [user?.companyId]);

  const { open, ready } = usePlaidLink({
    token: linkToken!,
    onSuccess,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Bank Integrations</h1>
          <p className="text-xs font-bold text-gray-500 tracking-widest uppercase italic mt-1">
            Connect your bank accounts for automatic sync
          </p>
        </div>
        <button
          onClick={() => open()}
          disabled={!ready}
          className={`px-6 py-3 font-black uppercase text-sm border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all
            ${ready ? 'bg-blue-500 text-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          {ready ? "+ Connect New Bank" : "Loading Plaid..."}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold animate-pulse text-gray-400">LOADING ACCOUNTS...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
          <div className="text-6xl mb-4">🏦</div>
          <h2 className="text-2xl font-black uppercase mb-2">No Banks Connected</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
            Connect your bank account to automatically import transactions and simplify your reconciliation process.
          </p>
          <button 
            onClick={() => open()} 
            disabled={!ready}
            className="text-blue-600 font-black uppercase border-b-4 border-blue-600 hover:text-blue-800 hover:border-blue-800 transition-colors"
          >
            Start Integration Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
              {acc.isPlaidLinked && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   Linked via Plaid ✓
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">{acc.bankName}</p>
                  <h3 className="text-xl font-black uppercase truncate max-w-[200px]">{acc.accountName}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400">Current Balance</p>
                  <p className="text-2xl font-black">{acc.balance.toLocaleString()} USD</p>
                </div>
              </div>
              <div className="flex justify-between items-center border-t-2 border-dashed border-gray-200 pt-4">
                <span className="text-xs font-bold font-mono text-gray-500">**** **** {acc.accountNo.slice(-4)}</span>
                <button className="text-[10px] font-black uppercase bg-black text-white px-3 py-1 hover:bg-gray-800 transition-colors">
                  View Transactions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SETUP GUIDE */}
      <div className="mt-12 bg-blue-50 border-4 border-blue-600 p-8 shadow-[8px_8px_0px_0px_rgba(37,99,235,0.2)]">
        <h3 className="text-lg font-black uppercase mb-4 text-blue-800 flex items-center gap-2">
          <span>🛡️</span> Security & Privacy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs font-black uppercase text-blue-600 mb-1">End-to-End Encryption</p>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              We never see or store your bank login credentials. Plaid uses bank-grade security to connect safely.
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-blue-600 mb-1">Read-Only Access</p>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              This connection is read-only. No one can move money or authorize transactions through this integration.
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-blue-600 mb-1">You’re in Control</p>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              You can disconnect your bank account at any time from this dashboard or your bank’s security settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
