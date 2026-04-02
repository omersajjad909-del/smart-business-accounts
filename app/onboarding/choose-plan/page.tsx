import { Suspense } from "react";
import ChoosePlanClient from "./ChoosePlanClient";

export default function ChoosePlanPage() {
  return (
    <Suspense fallback={null}>
      <ChoosePlanClient />
    </Suspense>
  );
}
