"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

// Interface for errors stored in the DB (fetched by useQuery)
interface StoredError {
  id: string;
  title: string;
  description: string;
  severity: "error" | "warning" | "info" | "critical";
  createdAt: string;
  url?: string;
  type: string;
}

// Interface for errors collected by Playwright (from API response)
interface CollectedError {
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
  type: "SSL" | "Console" | "Resource" | "Redirect" | "Status Code";
  url?: string;
}

interface ProjectAnalyticsProps {
  projectId: string;
}

// Updated response interface for the Playwright fetch API
interface FetchPlaywrightErrorsResponse {
  message: string;
  detectedErrors: CollectedError[];
}

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false); // Keep for potential future use
  const [error, setError] = useState<string | null>(null);
  // State to hold the result of the manual Playwright fetch
  const [playwrightFetchResult, setPlaywrightFetchResult] =
    useState<FetchPlaywrightErrorsResponse | null>(null);
  // State to track if a Playwright fetch has been performed
  const [hasFetchedPlaywright, setHasFetchedPlaywright] = useState(false);

  // Reset states when projectId changes
  useEffect(() => {
    setPlaywrightFetchResult(null);
    setError(null);
    setRequiresAuth(false);
    setHasFetchedPlaywright(false);
  }, [projectId]);

  // Fetch errors stored in the database
  const { data: storedErrors = [] } = useQuery<StoredError[]>({
    queryKey: ["errors", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/errors`);
      if (!response.ok) {
        throw new Error("Failed to fetch stored errors");
      }
      return response.json();
    },
    staleTime: 0,
  });

  // Trigger the Playwright error fetching API
  const fetchPlaywrightErrors = async () => {
    try {
      setLoading(true);
      setError(null);
      setRequiresAuth(false);
      setPlaywrightFetchResult(null);
      setHasFetchedPlaywright(true);

      const response = await fetch(
        `/api/projects/${projectId}/fetch-errors-playwright`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: FetchPlaywrightErrorsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch Playwright errors");
      }

      setPlaywrightFetchResult(data);
      console.log("Playwright errors fetched:", data);

      await queryClient.invalidateQueries({ queryKey: ["errors", projectId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching Playwright errors:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine which set of errors to display
  const errorsToDisplay: StoredError[] =
    playwrightFetchResult?.detectedErrors &&
    playwrightFetchResult.detectedErrors.length > 0
      ? playwrightFetchResult.detectedErrors.map((e) => ({
          ...e,
          id: `${e.type}-${e.title}-${e.url || ""}`, // Create a pseudo-ID for display key
          createdAt: new Date().toISOString(),
          severity: e.severity === "error" ? "critical" : e.severity,
        }))
      : storedErrors;

  const showNoDataAlert = !hasFetchedPlaywright && storedErrors.length === 0;
  const showNoIssuesAlert =
    hasFetchedPlaywright &&
    !loading &&
    !error &&
    playwrightFetchResult?.detectedErrors?.length === 0 &&
    storedErrors.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
        <Button
          onClick={fetchPlaywrightErrors}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-5 w-5 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Fetching..." : "Fetch Live Errors"}
        </Button>
      </div>

      {requiresAuth && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-yellow-800 text-lg">
                Authentication Required
              </AlertTitle>
              <AlertDescription className="text-yellow-700">
                Please connect with Google Search Console to fetch errors.
                <div className="mt-2">
                  <GoogleAuthButton />
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-red-800 text-lg">
                Error Fetching Live Data
              </AlertTitle>
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {showNoDataAlert && (
        <Alert className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ArrowPathIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-blue-800 text-lg">
                No Stored Data
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                Click the &ldquo;Fetch Live Errors&rdquo; button above to
                analyze your project for issues. Previously detected issues will
                also appear here.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {showNoIssuesAlert && (
        <Alert className="bg-green-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mr-2">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-green-800 text-lg">
                No Issues Found
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Great news! The live check found no new errors, warnings, or
                issues.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {!showNoIssuesAlert && errorsToDisplay.length > 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-6 text-black">
              Detected Issues
            </h3>
            <div className="flex flex-col gap-4">
              {errorsToDisplay.map((err: StoredError) => (
                <div
                  key={err.id}
                  className={`overflow-hidden shadow rounded-lg border-l-4 ${
                    err.severity === "critical" || err.severity === "error"
                      ? "border-red-500 bg-red-50"
                      : err.severity === "warning"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <AlertCircle
                          className={`h-5 w-5 ${
                            err.severity === "critical" ||
                            err.severity === "error"
                              ? "text-red-600"
                              : err.severity === "warning"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-semibold text-gray-800 truncate">
                            {err.title}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                            {err.description}
                          </dd>
                          {err.url && (
                            <dd className="mt-1 text-xs text-gray-500 truncate">
                              URL: {err.url}
                            </dd>
                          )}
                          <dd className="mt-1 text-xs text-gray-500">
                            Type: {err.type}
                          </dd>
                          <dd className="mt-1 text-xs text-gray-400">
                            Detected: {new Date(err.createdAt).toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
