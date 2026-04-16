"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, FileSearch, ArrowRight, Shield, Award, Building,
  FileText, Eye, GitBranch, ClipboardList, Zap, PenLine, Wallet,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardCheck, FileSearch, Shield, Award, Building, FileText,
  Eye, GitBranch, ClipboardList, Zap, PenLine, Wallet,
};

interface ServiceItem {
  title: string;
  description: string;
  href: string;
  icon: string;
  price: string;
  tag?: string;
  tagColor?: string;
}

const FREE_SERVICES: ServiceItem[] = [
  { title: "Grant Eligibility Status", description: "Quick AI assessment of grant readiness with verdict and quick wins", href: "/services/eligibility-status", icon: "ClipboardCheck", price: "Free", tag: "Instant", tagColor: "bg-emerald-100 text-emerald-700" },
  { title: "Readiness Diagnostic", description: "10-step diagnostic: audit, controls, site-visit sim, funder matches, roadmap", href: "/services/readiness-diagnostic", icon: "FileSearch", price: "Free", tag: "Instant", tagColor: "bg-emerald-100 text-emerald-700" },
  { title: "Compliance Calendar", description: "Auto-generated deadlines for SAM renewal, 990, state filings, insurance", href: "/compliance", icon: "Shield", price: "Free", tag: "Auto-generated", tagColor: "bg-blue-100 text-blue-700" },
  { title: "Grant Portfolio Tracker", description: "Track active grants, spending vs budget, and reporting deadlines", href: "/portfolio-tracker", icon: "Wallet", price: "Free" },
];

const PAID_SERVICES: ServiceItem[] = [
  { title: "Starter Grant Package", description: "AI writes 3-5 starter grant applications to build your track record", href: "/services/starter-grants", icon: "Award", price: "$497", tag: "7-10 days" },
  { title: "501(c)(3) Formation", description: "Guided nonprofit formation with articles, bylaws, and Form 1023 prep", href: "/services/nonprofit-formation", icon: "Building", price: "$3,997", tag: "2-4 weeks" },
  { title: "SAM.gov Registration", description: "Done-for-you SAM.gov and UEI registration — #1 federal grant blocker", href: "/services/sam-registration", icon: "Shield", price: "$750-$1,500", tag: "2-6 weeks" },
  { title: "Policy Drafting Package", description: "8 AI-customized grant compliance policies ready for board adoption", href: "/services/policy-drafting", icon: "FileText", price: "$997", tag: "3-5 days" },
  { title: "Application Review", description: "Expert AI + human review of your completed grant application", href: "/services/application-review", icon: "Eye", price: "$497-$997", tag: "3-5 days" },
  { title: "Logic Model Builder", description: "AI builds logic model, theory of change, SMART objectives, KPIs", href: "/services/logic-model", icon: "GitBranch", price: "$197", tag: "Instant", tagColor: "bg-emerald-100 text-emerald-700" },
  { title: "Compliance Audit Prep", description: "Prepare for a funder site visit with mock Q&A and document checklist", href: "/services/audit-prep", icon: "ClipboardList", price: "$997", tag: "5-7 days" },
  { title: "Grant-Ready Certification", description: "Official badge + verification URL after completing Tier 2 or 3", href: "/certified", icon: "Award", price: "Included in Tier 2/3", tag: "1 year valid", tagColor: "bg-amber-100 text-amber-700" },
];

const TIER_SERVICES: ServiceItem[] = [
  { title: "Tier 1 — Readiness Review", description: "Full diagnostic + 45-min walkthrough call with grant strategist", href: "/services", icon: "ClipboardCheck", price: "$997", tag: "5-7 days" },
  { title: "Tier 2 — Remediation Roadmap", description: "Playbook, templates, vendor directory, 2 strategy calls, 30-day support", href: "/services", icon: "FileSearch", price: "$2,997", tag: "Most Popular", tagColor: "bg-brand-teal/10 text-brand-teal" },
  { title: "Tier 3 — Readiness Accelerator", description: "Done-for-you: SAM, policies, first app drafted, weekly sessions", href: "/services", icon: "Zap", price: "$7,497", tag: "60-120 days" },
  { title: "Strategic Restructuring", description: "For 'Not Eligible' verdicts — structural analysis + alternative capital", href: "/services", icon: "Building", price: "$2,497", tag: "2-4 weeks" },
];

function ServiceCard({ service }: { service: ServiceItem }) {
  const Icon = ICON_MAP[service.icon] ?? ClipboardCheck;
  return (
    <Link href={service.href}>
      <Card className="h-full hover:border-brand-teal/50 transition-colors cursor-pointer">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-brand-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{service.title}</h3>
                {service.tag && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${service.tagColor ?? "bg-gray-100 text-gray-600"}`}>
                    {service.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
              <p className="text-xs font-semibold text-brand-teal mt-2">{service.price}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ServicesPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Services</h1>
        <p className="text-sm text-warm-500 mt-1">Everything you need to become grant-ready, from eligibility check to application submission.</p>
      </div>

      {/* Free Services */}
      <h2 className="text-base font-semibold mb-3">Free Services</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {FREE_SERVICES.map((s) => <ServiceCard key={s.title} service={s} />)}
      </div>

      {/* Service Tiers */}
      <h2 className="text-base font-semibold mb-3">Service Engagements</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {TIER_SERVICES.map((s) => <ServiceCard key={s.title} service={s} />)}
      </div>

      {/* Paid Add-On Services */}
      <h2 className="text-base font-semibold mb-3">Add-On Services</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {PAID_SERVICES.map((s) => <ServiceCard key={s.title} service={s} />)}
      </div>

      {/* Writing CTA */}
      <div className="rounded-lg border border-brand-teal/20 bg-brand-teal/5 p-6 text-center">
        <PenLine className="h-8 w-8 text-brand-teal mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Need Help Writing a Grant Application?</h3>
        <p className="text-sm text-muted-foreground mb-4">AI-powered writing from $249/grant. Expert review available. Full Confidence option: $0 upfront, pay only if you win.</p>
        <Link href="/writing"><Button className="gap-2">View Writing Options <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>
    </div>
  );
}
