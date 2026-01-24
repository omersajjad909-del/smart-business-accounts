import AdminGuard from "@/components/AdminGuard";
import DashboardContent from "./DashboardContent/page";

export default function UsersPage() {
  return (
    <AdminGuard>
      {/* یہاں پر یوزر مینجمنٹ ہٹا کر ڈیش بورڈ لگا دیا */}
      <DashboardContent />
    </AdminGuard>
  );
}