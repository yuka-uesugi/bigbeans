import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import AuthGuard from "@/components/dashboard/AuthGuard";
import InstallPrompt from "@/components/dashboard/InstallPrompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-ag-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
      </div>
      <InstallPrompt />
    </div>
  );
}
