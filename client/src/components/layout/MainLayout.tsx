import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import SuggestedUsers from "../feed/SuggestedUsers";

const MainLayout = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Only show SuggestedUsers on the home page
  const isHomePage = location.pathname === "/";
  // Detect if we're on the messages page (or sub-routes, e.g. /messages/123)
  const isMessagesPage = location.pathname.startsWith("/messages");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar - fixed */}
      {!isMobile && <Sidebar />}

      {/* Main content area */}
      <main
        className={`flex-1 transition-all duration-300 pb-16 md:pb-0
          ${!isMobile ? "ml-[240px]" : ""}
          ${!isMobile && isHomePage ? "mr-[240px]" : ""}
        `}
      >
        <ScrollArea className="h-screen" scrollHideDelay={100}>
          {isMessagesPage ? (
            /**
             * If on the /messages route, we skip the container
             * so the page can go full width.
             */
            <Outlet />
          ) : (
            /**
             * Otherwise, use the normal centered layout
             */
            <div className="container mx-auto p-4 md:py-6">
              <div className="flex justify-center">
                <div className="w-full max-w-xl">
                  <Outlet />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </main>

      {/* Right panel with fixed position matching sidebar width (only on home) */}
      {!isMobile && isHomePage && (
        <div className="fixed top-0 right-0 w-[240px] h-screen border-l bg-card/60 backdrop-blur-sm z-10 flex flex-col">
          <div className="pt-6 pb-6 px-4 border-b">
            <h2 className="text-2xl font-bold mt-6">Suggestions</h2>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
            <SuggestedUsers />
          </ScrollArea>

          {/* Footer section at the bottom */}
          <div className="p-4 mt-auto border-t text-xs text-muted-foreground bg-background/60">
            <div className="space-y-2">
              <p>© 2023 Photogram</p>
              <div className="flex flex-wrap gap-2">
                <a href="#" className="hover:underline">About</a>
                <a href="#" className="hover:underline">Help</a>
                <a href="#" className="hover:underline">Privacy</a>
                <a href="#" className="hover:underline">Terms</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && <MobileNavigation />}
    </div>
  );
};

export default MainLayout;
