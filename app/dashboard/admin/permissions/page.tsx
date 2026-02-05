"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions"; // آپ کی پرمیشنز کی لسٹ

export default function AdminPermissionsPage() {
  const userSession = getCurrentUser();
  const isAdmin = userSession?.role === "ADMIN";

  const [users, setUsers] = useState<Any[]>([]);
  const [selectedUser, setSelectedUser] = useState<Any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. تمام یوزرز لوڈ کریں (ہیڈر کے ساتھ)
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/users", {
      headers: { "x-user-role": "ADMIN" },
    })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading users:", err));
  }, [isAdmin]);

  // 2. یوزر کی موجودہ پرمیشنز لوڈ کرنا

  // Guard - صرف ADMIN رسائی کر سکتے ہیں
  if (!userSession) return null;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">❌ رسائی مسترد</h2>
          <p className="text-red-700">صرف ADMIN صارفین اجازتیں سنبھال سکتے ہیں</p>
        </div>
      </div>
    );
  }
  function loadPermissions(user: Any) {
    // اگر یوزر ابجیکٹ میں پرمیشنز پہلے سے ہیں تو وہ اٹھا لو
    if (user.permissions) {
      setPermissions(user.permissions.map((p: Any) => p.permission));
    } else {
      setPermissions([]);
    }
  }

  function togglePermission(p: string) {
    setPermissions(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  // 3. سیو کرنے والا فنکشن (ہیڈرز فکس کر دیے)
  async function save() {
    if (!selectedUser) return alert("Please select a user first");
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/user-permissions", { // صحیح پاتھ استعمال کریں
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": "ADMIN" // یہ جادوئی لائن ہے جو ایرر ختم کرے گی
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissions,
        }),
      });

      if (res.ok) {
        alert("Permissions Saved Successfully! ✅");
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to save"));
      }
    } catch (_err) {
      alert("Network error occurred!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl bg-white shadow-lg rounded-xl mt-10 mx-auto border">
      <h1 className="text-2xl font-black mb-6 text-blue-800 uppercase tracking-tight">
        🛡️ User Permissions Control
      </h1>

      <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed mb-6">
        <label className="block text-sm font-bold mb-2">SELECT USER TO MANAGE:</label>
        <select
          className="w-full border-2 p-3 rounded-md font-bold text-lg focus:border-blue-500 outline-none"
          onChange={e => {
            const u = users.find(x => x.id === e.target.value);
            setSelectedUser(u);
            if (u) loadPermissions(u);
          }}
        >
          <option value="">-- Select a User --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-500">
          <h2 className="font-bold text-gray-700 border-b pb-2">
            Assigning Access for: <span className="text-blue-600">{selectedUser.name}</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* آپ کی PERMISSIONS فائل سے تمام آپشنز یہاں خود بخود آ جائیں گے */}
            {Object.values(PERMISSIONS).map((p: Any) => (
              <label key={p} className="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer transition-all shadow-sm">
                <input
                  type="checkbox"
                  className="w-5 h-5 mr-3"
                  checked={permissions.includes(p)}
                  onChange={() => togglePermission(p)}
                />{" "}
                <span className="text-sm font-semibold text-gray-700">{p}</span>
              </label>
            ))}
          </div>

          <button
            onClick={save}
            disabled={loading}
            className={`w-full mt-6 text-white px-4 py-4 rounded-lg font-black text-lg shadow-xl transition-all ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {loading ? "SAVING..." : "CONFIRM & SAVE PERMISSIONS"}
          </button>
        </div>
      )}
    </div>
  );
}


