"use client";

import { Suspense } from "react";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import CalendarPage from "@/components/Calendar/CalendarPage";

export default function CalendarRoute() {
  return (
    <>
      <DashboardNavbar />
      <Suspense fallback={null}>
        <CalendarPage />
      </Suspense>
    </>
  );
}
