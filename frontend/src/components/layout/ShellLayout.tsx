import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopAppBar } from "./TopAppBar";
import { BottomNavBar } from "./BottomNavBar";
import { OfflineIndicator } from "../ui/OfflineIndicator";
import { PwaInstallBanner } from "../ui/PwaInstallBanner";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function ShellLayout() {
  const { isOnline, wasOffline } = useOnlineStatus();

  return (
    <>
      <OfflineIndicator isOnline={isOnline} wasOffline={wasOffline} />
      <PwaInstallBanner />

      <div className="min-h-screen bg-surface">
        <Sidebar />

        <main className="lg:ml-64 min-h-screen flex flex-col">
          <TopAppBar />

          <div className="flex-1">
            <Outlet />
          </div>

          <div className="h-24 md:hidden" />
        </main>

        <BottomNavBar />
      </div>
    </>
  );
}
