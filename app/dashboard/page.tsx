import DashboardContent from "./DashboardContent/page";

// No AdminGuard here: it sent every non-admin to "Checking permissions..." and
// then back to this same URL. DashboardContent already gates on VIEW_DASHBOARD
// and shows the welcome screen when that permission is off.
export default function DashboardPage() {
  return <DashboardContent />;
}
