"use client";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="mt-4 text-slate-600 text-sm">
          For assistance, please contact support@smartbusinessaccounts.example or visit our help center.
        </p>
        <div className="mt-6">
          <Link href="/landing" className="text-indigo-700 hover:text-indigo-900">
            ← Back to Landing
          </Link>
        </div>
      </div>
    </div>
  );
}
