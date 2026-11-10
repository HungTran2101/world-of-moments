"use client";

import Toolbar from "@/components/Toolbar";
import SubmissionSidebar from "@/components/SubmissionSidebar";
import Title from "@/components/Title";
import QueryProvider from "@/components/shared/QueryProvider";
import { VisitorIdentity } from "@/components/VisitorIdentity";
import dynamic from "next/dynamic";

// Dynamically import MapView to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false
});
export default function HomePageView() {
  return (
    <QueryProvider>
      <VisitorIdentity />
      <main className="main">
        <Title />
        <Toolbar />
        {/* Submission sidebar */}
        <SubmissionSidebar />
        {/* Map — fills the viewport */}
        <div className="mapArea">
          <MapView />
        </div>
      </main>
    </QueryProvider>
  );
}
