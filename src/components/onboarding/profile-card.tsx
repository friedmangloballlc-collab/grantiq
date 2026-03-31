"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

export interface ProfileData {
  // Step IDs — match onboarding step ids exactly
  entity_type?: string;
  industry?: string;
  funding_use?: string;
  business_stage?: string;
  grant_history?: string;
  location?: string;
  business_model?: string;
  phone?: string;
  contact_method?: string;
  employee_count?: string;
  annual_revenue?: string;
  ownership?: string;
  mission?: string;
  documents?: string;
  interested_nonprofit?: string;
  // Legacy fields kept for backward compatibility
  entityType?: string;
  fundingUse?: string;
  businessStage?: string;
  state?: string;
  city?: string;
  annualBudget?: string;
  employeeCount?: string;
  populationServed?: string;
  programAreas?: string;
  grantHistory?: string;
  ownershipDemographics?: string;
  samGov?: boolean;
  has501c3?: boolean;
  hasEin?: boolean;
  documentsMissing?: string;
}

export function ProfileCard({
  data,
  completedFields,
}: {
  data: ProfileData;
  completedFields: number;
}) {
  // Core steps only — 5 required fields
  const totalFields = 5;
  const progress = Math.round((completedFields / totalFields) * 100);

  const fields = [
    { label: "Organization Type", value: data.entity_type ?? data.entityType },
    { label: "Industry", value: data.industry },
    { label: "Funding Purpose", value: data.funding_use ?? data.fundingUse },
    { label: "Business Stage", value: data.business_stage ?? data.businessStage },
    { label: "Location", value: data.location ?? (data.city && data.state ? `${data.city}, ${data.state}` : data.state) },
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
