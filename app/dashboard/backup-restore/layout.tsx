import PlanGate from "@/components/plan/PlanGate";
export default function BackupRestoreLayout({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="backupRestore">{children}</PlanGate>;
}
