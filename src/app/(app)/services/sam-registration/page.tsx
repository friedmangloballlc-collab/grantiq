"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { Shield } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="sam_registration"
      title="SAM.gov Registration Service"
      description="Complete guide and preparation for SAM.gov and UEI registration."
      icon={<Shield className="h-12 w-12 text-brand-teal" />}
      features={["Step-by-Step Guide","Common Issues","IRS Validation Tips","Annual Renewal Guide"]}
      deliveryTime="2-6 weeks"
      price="$750-$1,500"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
