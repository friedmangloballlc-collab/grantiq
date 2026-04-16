"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { Building } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="nonprofit_formation"
      title="501(c)(3) Formation Assistance"
      description="Guided nonprofit formation with AI-generated documents and IRS prep."
      icon={<Building className="h-12 w-12 text-brand-teal" />}
      features={["Formation Checklist","Articles Template","Bylaws Template","Form 1023 Guide","EIN Guide"]}
      deliveryTime="2-4 weeks"
      price="$1,500-$3,500"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
