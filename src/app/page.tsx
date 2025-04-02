"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon, FolderIcon } from "@heroicons/react/24/outline";
import Tabs from "@/components/Tabs";
import ProjectsTab from "@/components/ProjectsTab";
import AnalyticsTab from "@/components/AnalyticsTab";

type Tab = "projects" | "analytics";

const tabs = [
  { id: "projects", label: "Projects", icon: FolderIcon },
  { id: "analytics", label: "Analytics", icon: ChartBarIcon },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        />
      </div>

      {activeTab === "projects" ? (
        <ProjectsTab projects={projects} />
      ) : (
        <AnalyticsTab projects={projects} />
      )}
    </div>
  );
}
