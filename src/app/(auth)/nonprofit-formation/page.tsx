import { FormationWizard } from "@/components/nonprofit/formation-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nonprofit Formation — GrantIQ",
  description:
    "Start your nonprofit formation with GrantIQ. Our team handles incorporation, EIN, bylaws, 501(c)(3) filing, and grant readiness — you just answer a few questions.",
};

export default function NonprofitFormationPage() {
  return <FormationWizard />;
}
