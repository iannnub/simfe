import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`simpresma-main relative min-w-0 flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed inset-y-0 right-0 top-[72px] z-[60] flex items-center justify-center bg-[#f8fafc]/95 dark:bg-gray-950/95 ${isExpanded || isHovered ? "lg:left-[290px]" : "lg:left-[90px]"} ${isMobileOpen ? "left-0" : "left-0"}`}
          >
            <div className="flex flex-col items-center text-center">
              <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#3978e8] border-t-transparent" />
              <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Memuat halaman...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Harap tunggu sebentar</p>
            </div>
          </div>
        )}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
