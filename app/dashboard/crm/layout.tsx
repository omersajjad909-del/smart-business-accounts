import PlanGate from "@/components/plan/PlanGate";
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="crm">{children}</PlanGate>;
}
