import PlanGate from "@/components/plan/PlanGate";
export default function BranchesLayout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="multiBranch">{children}</PlanGate>;
}
