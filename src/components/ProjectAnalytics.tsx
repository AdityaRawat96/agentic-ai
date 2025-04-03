"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface Error {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "critical";
  createdAt: string;
}

interface ProjectAnalyticsProps {
  projectId: string;
}

interface FetchErrorsResponse {
  errors: Error[];
  crawlErrors: any;
  mobileErrors: any;
  javascriptMessages: Array<{
    message: string;
    level: string;
    source: string;
  }>;
  richResults: Array<{
    name: string;
    type: string;
    items: Array<{
      name: string;
      type: string;
      value: string;
    }>;
  }>;
}

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchResults, setFetchResults] = useState<FetchErrorsResponse | null>(
    null
  );

  // Reset states and fetch existing errors when projectId changes
  useEffect(() => {
    setFetchResults(null);
    setError(null);
    setRequiresAuth(false);

    // Fetch existing errors from DB
    const fetchExistingErrors = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/errors`);
        if (!response.ok) {
          throw new Error("Failed to fetch errors");
        }
        const data = await response.json();

        // If there are existing errors, show them
        if (data.length > 0) {
          setFetchResults({
            errors: data,
            crawlErrors: null,
            mobileErrors: null,
            javascriptMessages: [],
            richResults: [],
          });
        }
      } catch (err) {
        console.error("Error fetching existing errors:", err);
      }
    };

    fetchExistingErrors();
  }, [projectId]);

  const { data: errors = [] } = useQuery({
    queryKey: ["errors", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/errors`);
      if (!response.ok) {
        throw new Error("Failed to fetch errors");
      }
      return response.json();
    },
    staleTime: 0,
  });

  const fetchErrors = async () => {
    try {
      setLoading(true);
      setError(null);
      setRequiresAuth(false);

      const response = await fetch(`/api/projects/${projectId}/fetch-errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        setRequiresAuth(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch errors");
      }

      setFetchResults(data);
      console.log("Errors fetched:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching errors:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
        <Button
          onClick={fetchErrors}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-5 w-5 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Fetching..." : "Fetch Errors"}
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
              <AlertTitle className="text-red-800 text-lg">Error</AlertTitle>
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {!fetchResults && errors.length === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ArrowPathIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-blue-800 text-lg">
                No Data Available
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                Click the &ldquo;Fetch Errors&rdquo; button above to analyze
                your project for issues.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {fetchResults && (
        <div className="space-y-6">
          {fetchResults.javascriptMessages.length === 0 &&
          fetchResults.richResults.length === 0 &&
          errors.length === 0 ? (
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
                    Great news! No errors, warnings, or issues were detected in
                    your project.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : (
            <>
              {/* JavaScript Messages */}
              {fetchResults.javascriptMessages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    JavaScript Console Messages
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {fetchResults.javascriptMessages.map((msg, index) => (
                      <Alert
                        key={index}
                        variant={
                          msg.level === "ERROR" ? "destructive" : "default"
                        }
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{msg.level}</AlertTitle>
                        <AlertDescription>
                          {msg.message}
                          <div className="text-sm text-gray-500 mt-1">
                            Source: {msg.source}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich Results */}
              {fetchResults.richResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Rich Results</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {fetchResults.richResults.map((result, index) => (
                      <Alert key={index} variant="default">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{result.name}</AlertTitle>
                        <AlertDescription>
                          Type: {result.type}
                          {result.items.map((item, i) => (
                            <div key={i} className="mt-1">
                              {item.name}: {item.value}
                            </div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Errors */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {errors.map((error: Error) => (
                  <div
                    key={error.id}
                    className="bg-white overflow-hidden shadow rounded-lg"
                  >
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <AlertCircle
                            className={`h-6 w-6 ${
                              error.severity === "critical"
                                ? "text-red-400"
                                : "text-yellow-400"
                            }`}
                          />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              {error.title}
                            </dt>
                            <dd className="text-sm text-gray-900">
                              {error.description}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
