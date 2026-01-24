"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
type AuthUser = {
  id?: string;
  role?: string;
  permissions?: (string | { permission?: string })[];
  rolePermissions?: (string | { permission?: string })[];
};


function userHasPerm(user: AuthUser | null, perm: string): boolean {
  if (!user) return false;

  const p = perm.toUpperCase();

  if (user.role === "ADMIN") return true;

  if (
    user.permissions?.some(
      (x) =>
        (typeof x === "string"
          ? x.toUpperCase()
          : (x.permission || "").toUpperCase()) === p
    )
  ) {
    return true;
  }

  if (
    user.rolePermissions?.some(
      (x) =>
        (typeof x === "string"
          ? x.toUpperCase()
          : (x.permission || "").toUpperCase()) === p
    )
  ) {
    return true;
  }

  return false;
}


type Backup = {
  id: string;
  fileName: string;
  fileSize?: number;
  backupType: string;
  status: string;
  createdAt: string;
};

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const user = getCurrentUser();

  if (!userHasPerm(user, 'BACKUP_RESTORE')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">❌ Access Denied</h2>
          <p className="text-red-700">You do not have permission to access backup & restore.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBackups(data);
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    if (!confirm("Create a full backup of all system data?")) {
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ backupType: "FULL" }),
      });

      if (res.ok) {
        alert("Backup created successfully!");
        await loadBackups();
      } else {
        const error = await res.json();
        alert(error.error || "Backup failed");
      }
    } catch (e) {
      alert("Backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function restoreBackup(backupId: string, fileName: string) {
    if (!confirm(`Restore from "${fileName}"?\n\nThis will replace ALL current data!`)) {
      return;
    }

    setLoading(true);
    try {
      console.log("Starting restore from:", backupId);
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ backupId }),
      });

      console.log("Restore response status:", res.status);
      const result = await res.json();
      console.log("Restore result:", result);

      if (res.ok) {
        alert("Data restored successfully! Page will refresh...");
        // Reload page to show restored data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert("Restore failed: " + (result.error || "Unknown error"));
      }
    } catch (e) {
      console.error("Restore error:", e);
      alert("Restore failed: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Backup & Restore</h1>
        <button
          onClick={createBackup}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {creating ? "Creating Backup..." : "+ Create Backup"}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Backups are stored locally. For production use,
          configure cloud storage (AWS S3, Google Cloud Storage, etc.) for
          automatic backups.
        </p>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">File Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Size</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No backups found
                </td>
              </tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3">{b.fileName}</td>
                  <td className="p-3">{b.backupType}</td>
                  <td className="p-3 text-right">{formatFileSize(b.fileSize)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : b.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    {b.status === "COMPLETED" && (
                      <button
                        onClick={() => restoreBackup(b.id, b.fileName)}
                        disabled={loading}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 hover:bg-green-700"
                      >
                        {loading ? "Restoring..." : "Restore"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
