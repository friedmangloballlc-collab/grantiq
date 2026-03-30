"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

export interface ProfileData {
  entityType?: string;
  mission?: string;
  state?: string;
  annualBudget?: string;
  populationServed?: string;
  grantHistory?: string;
  samGov?: boolean;
  has501c3?: boolean;
}

export function ProfileCard({
  data,
  completedFields,
}: {
  data: ProfileData;
  completedFields: number;
}) {
  const totalFields = 8;
  const progress = Math.round((completedFields / totalFields) * 100);

  const fields = [
    { label: "Organization Type", value: data.entityType },
    { label: "Mission", value: data.mission },
    { label: "Location", value: data.state },
    { label: "Annual Budget", value: data.annualBudget },
    { label: "Population Served", value: data.populationServed },
    { label: "Grant History", value: data.grantHistory },
    {
      label: "SAM.gov Status",
      value:
        data.samGov != null
          ? data.samGov
            ? "Registered"
            : "Not registered"
          : undefined,
    },
    {
      label: "501(c)(3) Status",
      value:
        data.has501c3 != null ? (data.has501c3 ? "Yes" : "No") : undefined,
    },
  ];

  return (
    <Card className="border-warm-200 dark:border-warm-800 sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your Profile</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-warm-200 dark:bg-warm-700 rounded-full h-2">
            <div
              className="bg-brand-teal rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-warm-500">{progress}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start gap-2">
            {field.value ? (
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-warm-300 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="text-xs text-warm-500">{field.label}</span>
              {field.value && (
                <p className="text-sm text-warm-900 dark:text-warm-50 truncate max-w-48">
                  {field.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
