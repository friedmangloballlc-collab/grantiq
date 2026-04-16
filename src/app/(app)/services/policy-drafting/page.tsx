"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { FileText } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="policy_drafting"
      title="Grant Policy Drafting Package"
      description="AI generates all 8 required grant compliance policies customized to your organization."
      icon={<FileText className="h-12 w-12 text-brand-teal" />}
      features={["8 Customized Policies","Board Resolutions","Signing Forms","Implementation Guide"]}
      deliveryTime="3-5 business days"
      price="$500-$1,000"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
