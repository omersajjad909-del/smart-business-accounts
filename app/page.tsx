"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface UserType {
  id: string;
  email: string;
  name: string;
  role: string;
}

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
      } catch (err: Any) {
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
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("User saved to localStorage:", data.user);
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        const errorMsg = data.message || data.error || "Login failed. Please check your credentials.";
        setError(errorMsg);
        console.error("Login failed:", errorMsg, data);
      }
    } catch (err: Any) {
      console.error("Login error:", err);
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--app-bg)] flex items-center justify-center font-[var(--font-sans)] p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(33,199,183,0.25)_0%,_rgba(33,199,183,0)_65%)]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_70%)]" />
      </div>
      <div className="w-full max-w-md my-8 relative">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] shadow-[var(--shadow)] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between bg-[linear-gradient(120deg,_rgba(33,199,183,0.18),_rgba(15,27,53,0.7))]">
            <div>
              <div className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)]">US Traders</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Business Management</div>
            </div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">FAISALABAD</div>
          </div>
          <div className="border-t border-b border-[var(--border)] py-2 text-center font-semibold tracking-[0.35em] text-xs uppercase text-[var(--text-muted)]">
            User Information
          </div>
          <div className="flex justify-center py-6 px-5">
            <div className="bg-[var(--card-bg)] text-[var(--text-primary)] p-6 w-full border border-[var(--border)] rounded-xl">
              <p className="text-sm mb-1 font-semibold text-[var(--text-primary)]">Please Login Here...</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-4">Secure access for authorized users only.</p>
              {error && (
                <div className="text-[10px] bg-[var(--danger)] text-[#0b1324] p-2 mb-3 text-center rounded">
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
                  <label className="w-24 font-semibold sm:font-normal text-[var(--text-muted)]">User Name:</label>
                  <select
                    className="flex-1 bg-[var(--panel-bg-2)] text-[var(--text-primary)] px-2 py-1.5 outline-none w-full rounded border border-[var(--border)]"
                    value={username}
                    onChange={(e) => handleUserChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                        if (passwordInput) passwordInput.focus();
                      }
                    }}
                  >
                    <option value="">-- Select User --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="w-24 font-semibold sm:font-normal text-[var(--text-muted)]">Password:</label>
                  <input
                    type="password"
                    className="flex-1 bg-[var(--panel-bg-2)] text-[var(--text-primary)] px-2 py-1.5 outline-none w-full rounded border border-[var(--border)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLogin();
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="w-24 font-semibold sm:font-normal text-[var(--text-muted)]">User Role:</label>
                  <input
                    type="text"
                    readOnly
                    className="flex-1 text-[var(--text-primary)] px-2 py-1.5 bg-[var(--panel-bg-2)] font-semibold outline-none w-full rounded border border-[var(--border)]"
                    value={selectedRole}
                  />
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="px-6 py-2 bg-[var(--accent)] text-[#0b1324] rounded-md text-sm font-semibold hover:bg-[var(--accent-strong)] disabled:opacity-70"
                >
                  {loading ? "..." : "OK"}
                </button>
                <button className="px-6 py-2 bg-[var(--panel-bg-2)] text-[var(--text-primary)] border border-[var(--border)] rounded-md text-sm">
                  Cancel
                </button>
              </div>
              {usersList.length === 0 && (
                <div className="mt-4 text-[10px] text-[var(--warning)] bg-[rgba(244,194,91,0.12)] p-3 border border-[rgba(244,194,91,0.35)] rounded">
                  <p className="font-bold mb-1">No users found!</p>
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
                          toast.success(`Created: ${data.email}`, { duration: 6000 });
                          setTimeout(() => window.location.reload(), 2000);
                        } else {
                          toast.error("Error: " + (data.error || "Failed to create user"));
                        }
                      } catch (e: Any) {
                        toast.error("Error: " + e.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="mt-2 bg-[var(--success)] text-[#0b1324] px-3 py-1 rounded text-xs font-bold disabled:opacity-70"
                  >
                    {loading ? "Creating..." : "Create Default Admin User"}
                  </button>
                  <p className="mt-2 text-xs">Or run: <code>npm run seed</code></p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between px-4 py-3 text-[10px] border-t border-[var(--border)] text-[var(--text-muted)]">
            <span className="underline">For further detail.</span>
            <span className="text-right">
              US DEVELOPERS.
              <br />
              Umer Sajjad 0304-76536939
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
