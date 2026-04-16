"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { Eye } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="application_review"
      title="Grant Application Review"
      description="Upload your completed application for expert AI + human review with scoring and improvement suggestions."
      icon={<Eye className="h-12 w-12 text-brand-teal" />}
      features={["Compliance Score", "Narrative Assessment", "Budget Review", "Competitiveness Rating", "Specific Improvements"]}
      deliveryTime="3-5 business days"
      price="$199-$499"
      additionalInputLabel="Paste your application text (or key sections)"
      additionalInputPlaceholder="Paste your grant application narrative, project description, budget justification, or other sections you'd like reviewed..."
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
