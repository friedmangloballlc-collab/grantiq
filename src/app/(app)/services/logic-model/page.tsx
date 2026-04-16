"use client";
import { ServicePage, JsonReportDisplay } from "@/components/services/service-page";
import { GitBranch } from "lucide-react";

export default function Page() {
  return (
    <ServicePage
      serviceType="logic_model"
      title="Logic Model and Theory of Change Builder"
      description="AI builds your project logic model, SMART objectives, and evaluation plan."
      icon={<GitBranch className="h-12 w-12 text-brand-teal" />}
      features={["Logic Model","Theory of Change","SMART Objectives","KPI Framework","Evaluation Plan"]}
      deliveryTime="Instant (AI)"
      price="$99"
      
      
      renderReport={(data) => <JsonReportDisplay data={data} />}
    />
  );
}
