"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
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

// --- Added State Interfaces ---
interface AnalysisResult {
  recommendations: string;
  error?: string;
}

interface AnalysisState {
  [errorId: string]: {
    isLoading: boolean;
    result: AnalysisResult | null;
  };
}
// --- End Added State Interfaces ---

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
  // --- Added State for AI Analysis ---
  const [analysisState, setAnalysisState] = useState<AnalysisState>({});
  // --- End Added State ---

  // Reset states when projectId changes
  useEffect(() => {
    setPlaywrightFetchResult(null);
    setError(null);
    setRequiresAuth(false);
    setHasFetchedPlaywright(false);
    setAnalysisState({}); // Reset analysis state on project change
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

  // --- Added AI Analysis Handler ---
  const analyzeErrorWithAI = async (err: StoredError) => {
    setAnalysisState((prev) => ({
      ...prev,
      [err.id]: { isLoading: true, result: null },
    }));

    try {
      const response = await fetch(`/api/analyze-error`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: err.title,
          description: err.description,
          type: err.type,
          severity: err.severity,
          url: err.url,
        }),
      });

      const data: AnalysisResult = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI analysis");
      }

      setAnalysisState((prev) => ({
        ...prev,
        [err.id]: { isLoading: false, result: data },
      }));
    } catch (aiError) {
      console.error("AI Analysis Error:", aiError);
      setAnalysisState((prev) => ({
        ...prev,
        [err.id]: {
          isLoading: false,
          result: {
            recommendations: "", // Ensure recommendations is always a string
            error:
              aiError instanceof Error
                ? aiError.message
                : "An unknown error occurred",
          },
        },
      }));
    }
  };
  // --- End Added AI Analysis Handler ---

  // Determine which set of errors to display
  const fetchedErrorsMapped: StoredError[] =
    playwrightFetchResult?.detectedErrors &&
    playwrightFetchResult.detectedErrors.length > 0
      ? playwrightFetchResult.detectedErrors.map((e) => ({
          ...e,
          id: `fetched-${e.type}-${e.title}-${e.url || Date.now()}`, // Unique ID for React key
          createdAt: new Date().toISOString(), // Timestamp of fetch
          severity: e.severity === "error" ? "critical" : e.severity,
        }))
      : [];

  // --- Added Deduplication Logic ---
  // Create a set of unique identifiers for stored errors for quick lookup
  const storedErrorSignatures = new Set(
    storedErrors.map(
      (err) => `${err.type}|${err.title}|${err.description}|${err.url || ""}`
    )
  );

  // Filter fetched errors to only include those not already stored
  const uniqueFetchedErrors = fetchedErrorsMapped.filter((fetchedErr) => {
    const signature = `${fetchedErr.type}|${fetchedErr.title}|${
      fetchedErr.description
    }|${fetchedErr.url || ""}`;
    return !storedErrorSignatures.has(signature);
  });

  // Combine stored errors and *unique* newly fetched errors
  const errorsToDisplay: StoredError[] = [
    ...storedErrors,
    ...uniqueFetchedErrors,
  ];
  // --- End Deduplication Logic ---

  const showNoDataAlert = !hasFetchedPlaywright && storedErrors.length === 0;

  // Show this alert specifically when the *live fetch* completes successfully with no new issues found.
  const showNoNewIssuesAlert =
    hasFetchedPlaywright &&
    !loading &&
    !error &&
    playwrightFetchResult?.detectedErrors?.length === 0;

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

      {showNoNewIssuesAlert && (
        <Alert className="bg-green-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mr-2">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <AlertTitle className="text-green-800 text-lg">
                Live Check Complete: No New Issues Found
              </AlertTitle>
              <AlertDescription className="text-green-700">
                Great news! The live check found no new errors or warnings.
                {storedErrors.length > 0 &&
                  " Previously detected issues are listed below."}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {errorsToDisplay.length > 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-6 text-black">
              Detected Issues
            </h3>
            <div className="flex flex-col gap-4">
              {errorsToDisplay.map((err: StoredError) => {
                const currentAnalysis = analysisState[err.id];
                const isAnalyzing = currentAnalysis?.isLoading;
                const analysisResult = currentAnalysis?.result;

                return (
                  <div key={err.id}>
                    <div
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
                                Detected:{" "}
                                {new Date(err.createdAt).toLocaleString()}
                              </dd>
                            </dl>
                          </div>
                        </div>
                        {/* --- Added Analyze Button --- */}
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => analyzeErrorWithAI(err)}
                            disabled={isAnalyzing}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles
                              className={`h-4 w-4 mr-2 ${
                                isAnalyzing ? "animate-spin" : "" // Simple spin for loading
                              }`}
                            />
                            {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                          </Button>
                        </div>
                        {/* --- End Added Analyze Button --- */}
                      </div>
                    </div>
                    {/* --- Added AI Analysis Result Display --- */}
                    {analysisResult && (
                      <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-1">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-purple-800 mb-1">
                              AI Analysis
                            </h4>
                            {analysisResult.error ? (
                              <p className="text-sm text-red-700 whitespace-pre-wrap">
                                Error: {analysisResult.error}
                              </p>
                            ) : (
                              <p className="text-sm text-purple-700 whitespace-pre-wrap">
                                {analysisResult.recommendations}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* --- End Added AI Analysis Result Display --- */}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
