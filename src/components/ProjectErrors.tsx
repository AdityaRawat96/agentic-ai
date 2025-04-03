"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProjectError {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface ProjectErrorsProps {
  projectId: string;
}

export function ProjectErrors({ projectId }: ProjectErrorsProps) {
  const [errors, setErrors] = useState<ProjectError[]>([]);
  const [loading, setLoading] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (!response.ok) {
        if (response.status === 401) {
          setRequiresAuth(true);
          return;
        }
        throw new Error(data.message || "Failed to fetch errors");
      }

      setErrors(data.errors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={fetchErrors} disabled={loading} className="w-full">
        {loading ? "Fetching..." : "Fetch Errors"}
      </Button>

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Errors</h2>
          {errors.map((error) => (
            <Alert key={error.id}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{error.type}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
