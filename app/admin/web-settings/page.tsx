import AdminSectionPage from "@/app/admin/components/AdminSectionPage";
import { adminSectionConfigs } from "@/app/admin/components/admin-section-config";

export default function AdminWebSettingsPage() {
  return <AdminSectionPage {...adminSectionConfigs["web-settings"]} />;
}
