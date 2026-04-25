import AdminGuard from "@/components/AdminGuard";
import DashboardContent from "./DashboardContent/page";

export default function UsersPage() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}