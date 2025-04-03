"use client";

import { useState } from "react";
import { ProjectAnalytics } from "./ProjectAnalytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface AnalyticsTabProps {
  projects: Project[];
}

export default function AnalyticsTab({ projects }: AnalyticsTabProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <label
          htmlFor="project-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select Project
        </label>
        <Select
          value={selectedProject?.id || ""}
          onValueChange={(value) => {
            const project = projects.find((p) => p.id === value);
            setSelectedProject(project || null);
          }}
        >
          <SelectTrigger id="project-select">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedProject && <ProjectAnalytics projectId={selectedProject.id} />}
    </div>
  );
}
