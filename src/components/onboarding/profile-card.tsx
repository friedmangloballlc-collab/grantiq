"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

export interface ProfileData {
  // Step IDs — match onboarding step ids exactly
  entity_type?: string;
  industry?: string;
  naics_primary?: string;
  funding_use?: string;
  funding_amount?: string;
  federal_certifications?: string;
  sam_registration_status?: string;
  match_funds_capacity?: string;
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
  project_description?: string;
  target_beneficiaries?: string;
  impact_metrics?: string;
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
  const totalFields = 14;
  const progress = Math.round((completedFields / totalFields) * 100);

  const fields = [
    { label: "Organization Type", value: data.entity_type ?? data.entityType },
    { label: "Industry", value: data.industry },
    { label: "NAICS Code", value: data.naics_primary },
    { label: "Funding Purpose", value: data.funding_use ?? data.fundingUse },
    { label: "Funding Range", value: data.funding_amount },
    { label: "Federal Certifications", value: data.federal_certifications },
    { label: "SAM.gov Status", value: data.sam_registration_status },
    { label: "Match Funds", value: data.match_funds_capacity },
    { label: "Business Stage", value: data.business_stage ?? data.businessStage },
    { label: "Mission", value: data.mission ? (data.mission.length > 40 ? data.mission.slice(0, 40) + "..." : data.mission) : undefined },
    { label: "Project", value: data.project_description ? (data.project_description.length > 40 ? data.project_description.slice(0, 40) + "..." : data.project_description) : undefined },
    { label: "Beneficiaries", value: data.target_beneficiaries },
    { label: "Impact Metrics", value: data.impact_metrics },
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
