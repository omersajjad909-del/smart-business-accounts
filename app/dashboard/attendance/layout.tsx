import PlanGate from "@/components/plan/PlanGate";
export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="hrPayroll">{children}</PlanGate>;
}
