"use client";

import dynamic from "next/dynamic";
import React from "react";

const Barcode = dynamic(() => import("react-barcode"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BarcodeWrapper(props: Any) {
  return <Barcode {...props} />;
}
