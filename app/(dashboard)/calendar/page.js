"use client";

import { Suspense } from "react";
import CalendarPage from "@/components/Calendar/CalendarPage";

export default function CalendarRoute() {
  return (
    <>

      <Suspense fallback={null}>
        <CalendarPage />
      </Suspense>
    </>
  );
}
