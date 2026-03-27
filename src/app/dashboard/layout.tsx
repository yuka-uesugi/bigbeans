import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import VisitorGuard from "@/components/dashboard/VisitorGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-ag-gray-50 overflow-hidden">
      {/* サイドバー */}
      <Sidebar />

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* トップバー */}
        <TopBar />

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-y-auto">
          <VisitorGuard>
            {children}
          </VisitorGuard>
        </main>
      </div>
    </div>
  );
}
