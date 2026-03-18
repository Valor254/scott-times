import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useQuery } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api";
import { CampusAlertBanner } from "@/components/shared/CampusAlertBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  // ✅ Hooks must be inside the component
  const alertQuery = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: async () => {
      const res = await alertsApi.getActive();
      return res.alert; // can be null
    },
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        {!isMobile && <AppSidebar isOpen={sidebarOpen} />}

        <main className={`flex-1 ${isMobile ? "pb-20" : ""} transition-all duration-300`}>
          <CampusAlertBanner message={alertQuery.data?.message ?? null} />
          {children}
        </main>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}