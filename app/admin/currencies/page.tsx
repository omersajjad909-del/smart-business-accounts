import AdminSectionPage from "@/app/admin/components/AdminSectionPage";
import { adminSectionConfigs } from "@/app/admin/components/admin-section-config";

export default function AdminCurrenciesPage() {
  return <AdminSectionPage {...adminSectionConfigs.currencies} />;
}
