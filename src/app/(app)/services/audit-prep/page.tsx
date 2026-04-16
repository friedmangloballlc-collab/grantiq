"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { ClipboardList } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="audit_prep"
      title="Compliance Audit Preparation"
      description="Prepare for a funder site visit or pre-award compliance review."
      icon={<ClipboardList className="h-12 w-12 text-brand-teal" />}
      features={["Document Checklist","Mock Site-Visit Q&A","Gap Analysis","30-Day Action Plan"]}
      deliveryTime="5-7 business days"
      price="$497"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
