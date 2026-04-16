"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { Award } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="starter_grant_package"
      title="Starter Grant Application Package"
      description="AI writes and prepares 3-5 first-timer-friendly grant applications for you."
      icon={<Award className="h-12 w-12 text-brand-teal" />}
      features={["3-5 Applications","Submission Instructions","Tracking Checklist"]}
      deliveryTime="7-10 business days"
      price="$299"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
