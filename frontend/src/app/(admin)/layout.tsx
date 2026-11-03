"use client";

import AuthWrapper from "./AuthWrapper";
import AppHeader from "../../layout/AppHeader";
import AppSidebar from "../../layout/AppSidebar";
import Backdrop from "../../layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded } = useSidebar();

  return (
    <AuthWrapper>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <AppSidebar />
        <Backdrop />

        <div
          className={`relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-300 ${isExpanded ? "lg:pl-[18rem]" : "lg:pl-0"}`}
        >
          <AppHeader />

          <main className="mx-auto w-full max-w-screen-10xl p-1 md:p-6 2xl:p-2">
            {children}
          </main>
        </div>

        

        
      </div>
    </AuthWrapper>
  );
}