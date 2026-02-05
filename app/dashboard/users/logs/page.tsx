"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Loader2, AlertCircle, History } from "lucide-react"; 
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const u = getCurrentUser();

        if (!u || !hasPermission(u, PERMISSIONS.VIEW_LOGS)) {
          setError("Access Denied: Logs permission required.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/logs", {
          headers: {
            "x-user-role": u.role,
            "x-user-id": u.id,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "ڈیٹا لوڈ کرنے میں ناکامی");
        }

        const data = await response.json();
        setLogs(data);

      } catch (err: Any) {
        setError(err.message || "Error Loading Logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-medium italic">Loading..........</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
        <AlertCircle className="mr-3 shrink-0" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="text-blue-600" size={28} />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Activity Logs</h1>
          </div>
          <p className="text-gray-500">All Activity Logs</p>
        </div>
        
        <div className="bg-white shadow-sm border px-4 py-2 rounded-lg">
          <span className="text-sm text-gray-500">Total Entries: </span>
          <span className="text-lg font-bold text-blue-600">{logs.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b">Action</th>
              <th className="p-4 border-b">Details</th>
              <th className="p-4 border-b text-center">User</th>
              <th className="p-4 border-b">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-400 italic">
                 No Record Found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4">
                    <span className="bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-700 px-3 py-1 rounded-md font-bold text-xs uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 leading-relaxed">{log.details}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium text-gray-800">{log.user?.name || "System"}</span>
                      <span className="text-[10px] text-gray-400">{log.user?.email || "Auto-generated"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 font-mono text-xs">
                    {new Date(log.createdAt).toLocaleString("en-PK", {
                       dateStyle: 'medium',
                       timeStyle: 'short'
                    })}
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
