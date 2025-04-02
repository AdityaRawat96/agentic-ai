"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface Error {
  id: string;
  title: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface ProjectAnalyticsProps {
  projectId: string;
}

export default function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const queryClient = useQueryClient();

  const { data: errors = [] } = useQuery({
    queryKey: ["errors", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/errors`);
      return response.json();
    },
  });

  const fetchErrorsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/fetch-errors`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors", projectId] });
    },
  });

  const severityCounts = errors.reduce(
    (acc: Record<string, number>, error: Error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
        <button
          onClick={() => fetchErrorsMutation.mutate()}
          disabled={fetchErrorsMutation.isPending}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-5 w-5 mr-2 ${
              fetchErrorsMutation.isPending ? "animate-spin" : ""
            }`}
          />
          {fetchErrorsMutation.isPending ? "Fetching..." : "Fetch Errors"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidiven shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm font-medium text-gray-500 truncate">
              Total Errors
            </div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {errors.length}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidiven shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm font-medium text-gray-500 truncate">
              Critical Issues
            </div>
            <div className="mt-1 text-3xl font-semibold text-red-600">
              {severityCounts["critical"] || 0}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidiven shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm font-medium text-gray-500 truncate">
              Warnings
            </div>
            <div className="mt-1 text-3xl font-semibold text-yellow-600">
              {severityCounts["warning"] || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidiven sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Issues
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {errors.map((error: Error) => (
              <li key={error.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {error.title}
                    </p>
                    <p className="text-sm text-gray-500">{error.description}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        error.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : error.severity === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {error.severity}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
