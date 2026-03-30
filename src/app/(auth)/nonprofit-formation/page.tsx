import { FormationWizard } from "@/components/nonprofit/formation-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nonprofit Formation Guide — GrantIQ",
  description:
    "Step-by-step guided wizard to form your nonprofit from scratch — entity type, articles, EIN, bylaws, IRS application, and post-formation setup.",
};

export default function NonprofitFormationPage() {
  return <FormationWizard />;
}
