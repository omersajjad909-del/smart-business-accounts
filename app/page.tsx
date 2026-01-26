"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface UserType {
  id: string;
  email: string;
  name: string;
  role: string;
}
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (res.ok) {
          const users = Array.isArray(data) ? data : [];
          setUsersList(users);
          if (users.length === 0) {
            setError("No users found. Please create a user first.");
          }
        } else {
          setError(data.error || "Failed to load users");
        }
      } catch (err: any) {
        console.error("Users fetch error:", err);
        setError("Connection Error: " + (err.message || "Cannot connect to server"));
      }
    }
    fetchUsers();
  }, []);

  const handleUserChange = (email: string) => {
    setUsername(email);
    const user = usersList.find((u) => u.email === email);
    setSelectedRole(user ? user.role : "");
  };

  async function handleLogin() {
    if (!username || !password) {
      setError("Please select user and enter password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username.trim(), password }),
      });

      let data;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Response parse error:", parseError);
        setError("Invalid server response");
        setLoading(false);
        return;
      }

      if (res.ok && data.user) {
        // Save user to localStorage (getCurrentUser() expects this format)
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("✅ User saved to localStorage:", data.user);
        
        // Small delay to ensure localStorage is set
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        const errorMsg = data.message || data.error || "Login failed. Please check your credentials.";
        setError(errorMsg);
        console.error("❌ Login failed:", errorMsg, data);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-blue-300 flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-md bg-white border border-gray-600 shadow-lg my-8">
        <div className="flex justify-between px-6 py-3">
          <span className="font-bold text-blue-800 text-lg">US Traders</span>
          <span className="text-sm font-semibold">FAISALABAD</span>
        </div>
        <div className="border-t border-b border-blue-800 py-2 text-center font-semibold tracking-widest text-sm uppercase">
          User Information
        </div>
        <div className="flex justify-center py-6 px-4">
          <div className="bg-blue-900 text-white p-6 w-full border">
            <p className="text-sm mb-3 font-semibold">Please Login Here...</p>
            {error && (
              <div className="text-[10px] bg-red-600 text-white p-1 mb-2 text-center">
                {error}
                <br />
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/test-login");
                      const data = await res.json();
                      alert(JSON.stringify(data, null, 2));
                    } catch (e) {
                      alert("Test failed: " + e);
                    }
                  }}
                  className="mt-1 text-xs underline"
                >
                  Check Database
                </button>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="w-24 font-semibold sm:font-normal">User Name:</label>
                <select 
                  className="flex-1 bg-gray-300 text-black px-1 py-0.5 outline-none w-full"
                  value={username}
                  onChange={(e) => handleUserChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                      if (passwordInput) passwordInput.focus();
                    }
                  }}
                >
                  <option value="">-- Select User --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.email}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="w-24 font-semibold sm:font-normal">Password:</label>
                <input 
                  type="password" 
                  className="flex-1 bg-gray-300 text-black px-1 py-0.5 outline-none w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLogin();
                    }
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="w-24 font-semibold sm:font-normal">User Role:</label>
                <input 
                  type="text" 
                  readOnly 
                  className="flex-1 text-black px-1 py-0.5 bg-gray-300 font-bold outline-none w-full"
                  value={selectedRole}
                />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-6">
              <button onClick={handleLogin} disabled={loading} className="px-6 py-1 bg-gray-200 text-black border border-gray-500 text-sm active:bg-gray-400">
                {loading ? "..." : "OK"}
              </button>
              <button className="px-6 py-1 bg-gray-200 text-black border border-gray-500 text-sm">Cancel</button>
            </div>
            {usersList.length === 0 && (
              <div className="mt-4 text-[10px] text-yellow-600 bg-yellow-100 p-2 border border-yellow-400">
                <p className="font-bold mb-1">⚠️ No users found!</p>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await fetch("/api/create-default-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password: "us786" }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast.success(`✅ ${data.message}\nEmail: ${data.email}\nPassword: ${data.password}`, { duration: 6000 });
                        // Reload users list
                        setTimeout(() => window.location.reload(), 2000);
                      } else {
                        toast.error("Error: " + (data.error || "Failed to create user"));
                      }
                    } catch (e: any) {
                      toast.error("Error: " + e.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs font-bold disabled:bg-gray-400"
                >
                  {loading ? "Creating..." : "Create Default Admin User"}
                </button>
                <p className="mt-2 text-xs">Or run: <code>npm run seed</code></p>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between px-4 py-2 text-[10px] border-t border-gray-500">
          <span className="text-blue-700 underline">For further detail.</span>
          <span className="text-right">US DEVELOPERS.<br />Umer Sajjad 0304-76536939</span>
        </div>
      </div>
    </div>
  );
}