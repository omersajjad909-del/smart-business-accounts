"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

const SOURCES = [
  { id: "quickbooks", name: "QuickBooks", icon: "QB", color: "bg-green-500", desc: "Export CSV from QuickBooks → Reports → Export" },
  { id: "xero", name: "Xero", icon: "XE", color: "bg-blue-500", desc: "Export CSV from Xero → Accounting → Export Data" },
  { id: "sage", name: "Sage", icon: "SA", color: "bg-orange-500", desc: "Export from Sage → File → Import/Export → Export" },
  { id: "tally", name: "Tally", icon: "TL", color: "bg-purple-500", desc: "Export from Tally → Gateway → Data → Export" },
  { id: "csv", name: "Generic CSV", icon: "CS", color: "bg-gray-500", desc: "Any standard CSV with headers: name, type, email, phone, rate..." },
];

const DATA_TYPES = [
  { id: "accounts", name: "Chart of Accounts", icon: "📊", desc: "Import ledger accounts and their opening balances" },
  { id: "contacts", name: "Contacts (Customers/Suppliers)", icon: "👥", desc: "Import customer and supplier records" },
  { id: "items", name: "Products & Items", icon: "📦", desc: "Import inventory items and their prices" },
];

type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
};

export default function ImportWizardPage() {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState("");
  const [dataType, setDataType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function buildHeaders() {
    const u = getCurrentUser();
    return {
      "x-company-id": u?.companyId || "",
      "x-user-role": u?.role || "",
      "x-user-id": u?.id || "",
    };
  }

  async function handleImport() {
    if (!file || !source || !dataType) {
      toast.error("Please complete all steps");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      formData.append("dataType", dataType);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: buildHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      setStep(4);
      toast.success(`Imported ${data.imported} records successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setSource("");
    setDataType("");
    setFile(null);
    setResult(null);
  }

  const selectedSource = SOURCES.find((s) => s.id === source);
  const selectedType = DATA_TYPES.find((d) => d.id === dataType);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Data Migration Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import your data from QuickBooks, Xero, Sage, Tally, or any CSV file
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["Source", "Data Type", "Upload", "Done"].map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step > idx + 1
                  ? "bg-green-500 text-white"
                  : step === idx + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > idx + 1 ? "✓" : idx + 1}
            </div>
            <span
              className={`text-sm ${step === idx + 1 ? "text-blue-600 font-medium" : "text-gray-500"}`}
            >
              {label}
            </span>
            {idx < 3 && <div className="h-px w-8 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Source */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Select your accounting software</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSource(s.id); setStep(2); }}
                className="flex items-start gap-4 p-5 border-2 rounded-xl text-left hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className={`${s.color} text-white rounded-lg w-12 h-12 flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700">{s.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Data Type */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50 rounded-lg">
            <div className={`${selectedSource?.color} text-white rounded w-8 h-8 flex items-center justify-center font-bold text-xs`}>
              {selectedSource?.icon}
            </div>
            <span className="text-sm text-blue-700 font-medium">Source: {selectedSource?.name}</span>
            <button onClick={() => { setSource(""); setStep(1); }} className="ml-auto text-xs text-blue-500 hover:underline">
              Change
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-4 text-gray-800">What do you want to import?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DATA_TYPES.map((d) => (
              <button
                key={d.id}
                onClick={() => { setDataType(d.id); setStep(3); }}
                className="p-5 border-2 rounded-xl text-left hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="text-3xl mb-3">{d.icon}</div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-700">{d.name}</div>
                <div className="text-xs text-gray-500 mt-1">{d.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Upload */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-4 mb-6 p-3 bg-blue-50 rounded-lg text-sm">
            <span className="text-blue-700">
              <strong>{selectedSource?.name}</strong> → <strong>{selectedType?.name}</strong>
            </span>
            <button onClick={() => setStep(2)} className="ml-auto text-xs text-blue-500 hover:underline">Change</button>
          </div>

          <h2 className="text-lg font-semibold mb-2 text-gray-800">Upload your CSV file</h2>

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm text-amber-800">
            <p className="font-medium mb-1">How to export from {selectedSource?.name}:</p>
            <p>{selectedSource?.desc}</p>
            {dataType === "accounts" && (
              <p className="mt-2 text-xs">Expected columns: Name/Account Name/Ledger Name, Type/Account Type/Group, Balance/Opening Balance</p>
            )}
            {dataType === "contacts" && (
              <p className="mt-2 text-xs">Expected columns: Customer Name/Contact Name/Name, Email/Email Address, Phone/Telephone, City/Town</p>
            )}
            {dataType === "items" && (
              <p className="mt-2 text-xs">Expected columns: Name/Description/Item Name, SKU/Item Code/Part No, Price/Unit Price/Selling Price/Rate</p>
            )}
          </div>

          <label className="block">
            <div className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-gray-500 mt-2">Click to change file</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">📁</div>
                  <p className="font-medium text-gray-700">Click to upload CSV file</p>
                  <p className="text-sm text-gray-400 mt-1">or drag & drop</p>
                </>
              )}
            </div>
          </label>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Importing...
                </>
              ) : (
                "Start Import →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
          <p className="text-gray-500 mb-6">
            Your {selectedType?.name} from {selectedSource?.name} have been imported
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-700">{result.total}</div>
              <div className="text-xs text-blue-500 mt-1">Total Rows</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-700">{result.imported}</div>
              <div className="text-xs text-green-500 mt-1">Imported</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-500 mt-1">Skipped (Duplicates)</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-lg mx-auto">
              <p className="text-sm font-medium text-red-700 mb-2">Some rows had errors:</p>
              <ul className="text-xs text-red-600 space-y-1">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-5 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Import More Data
            </button>
            <a
              href={`/dashboard/${dataType === "items" ? "items-new" : dataType === "contacts" ? "accounts" : "accounts"}`}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              View Imported Data →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
