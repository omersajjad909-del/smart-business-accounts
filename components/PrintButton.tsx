"use client";

import React from "react";

export default function PrintButton() {
  return (
    <button
      className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 font-bold"
      onClick={() => window.print()}
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
