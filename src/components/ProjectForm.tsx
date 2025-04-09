"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  errorTypes?: string[];
  frequency?: string;
}

export interface ProjectFormData {
  name: string;
  url: string;
  errorTypes: string[];
  frequency: string;
}

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
  initialData?: Project;
  isSubmitting?: boolean;
}

const ERROR_TYPES = [
  { id: "ssl", label: "SSL Errors" },
  { id: "console", label: "Console Errors" },
  { id: "missingResources", label: "Missing Resources Error" },
  { id: "redirection", label: "Redirection" },
  { id: "statusCode", label: "Status Code" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function ProjectForm({
  onSubmit,
  onCancel,
  initialData,
  isSubmitting = false,
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || "",
    url: initialData?.url || "",
    errorTypes: initialData?.errorTypes || [],
    frequency: initialData?.frequency || "weekly",
  });

  const handleCheckboxChange = (
    checked: boolean | "indeterminate",
    errorTypeId: string
  ) => {
    setFormData((prev) => {
      const currentErrorTypes = prev.errorTypes || [];
      if (checked === true) {
        return {
          ...prev,
          errorTypes: [...currentErrorTypes, errorTypeId],
        };
      } else {
        return {
          ...prev,
          errorTypes: currentErrorTypes.filter((id) => id !== errorTypeId),
        };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      frequency: formData.frequency || "weekly",
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Project" : "Add New Project"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter project name (e.g., My Website)"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Project URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="Enter project URL (e.g., https://example.com)"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Check Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) =>
                setFormData({ ...formData, frequency: value })
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Error Types to Track</Label>
            <div className="space-y-4 py-4">
              {ERROR_TYPES.map((errorType) => (
                <div key={errorType.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`error-${errorType.id}`}
                    checked={formData.errorTypes.includes(errorType.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      handleCheckboxChange(checked, errorType.id)
                    }
                  />
                  <Label
                    htmlFor={`error-${errorType.id}`}
                    className="font-normal"
                  >
                    {errorType.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={isSubmitting}>
              {initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
