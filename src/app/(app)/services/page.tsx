"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, FileSearch, ArrowRight, Clock, Shield, Zap } from "lucide-react";

const SERVICES = [
  {
    id: "eligibility-status",
    title: "Grant Eligibility Status",
    description:
      "Get a quick, AI-powered assessment of whether your organization is grant-ready. Receive a clear verdict, eligible grant categories, blockers, and quick wins you can act on immediately.",
    icon: ClipboardCheck,
    href: "/services/eligibility-status",
    highlights: [
      "Clear eligibility verdict",
      "Grant categories you qualify for",
      "Top blockers with fixes",
      "Quick wins under $500",
      "Estimated grant universe",
    ],
    turnaround: "Instant (AI-generated)",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "readiness-diagnostic",
    title: "Grant Eligibility & Readiness Diagnostic",
    description:
      "A comprehensive 10-step diagnostic designed for first-time grant seekers. Covers legal, financial, compliance, internal controls, audit readiness, funder matching, and a full remediation roadmap.",
    icon: FileSearch,
    href: "/services/readiness-diagnostic",
    highlights: [
      "5-layer readiness audit",
      "Risk & red flag screen",
      "COSO internal controls assessment",
      "Audit & site-visit simulation",
      "4 scored dimensions (0-100)",
      "Top funder matches (first-timer focus)",
      "Sequenced remediation roadmap",
      "Service tier recommendation",
    ],
    turnaround: "AI-generated in ~2 minutes",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
];

export default function ServicesPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Grant Services
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          One-time services to assess your grant eligibility and readiness.
          Powered by AI with expert-level analysis.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-lg ${service.bgColor} mb-3`}>
                  <Icon className={`h-6 w-6 ${service.color}`} />
                </div>
                <CardTitle className="text-lg">{service.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {service.description}
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 mb-6 flex-1">
                  {service.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{service.turnaround}</span>
                </div>

                <Link href={service.href}>
                  <Button className="w-full gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Value proposition */}
      <div className="mt-10 rounded-lg border border-border bg-background p-6">
        <h2 className="text-lg font-semibold mb-4">Why Get Assessed?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Stop Guessing</p>
              <p className="text-xs text-muted-foreground">
                Know exactly which grants you qualify for before spending hours on applications.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">First-Timer Focused</p>
              <p className="text-xs text-muted-foreground">
                Designed for organizations that have never won a grant. Honest, clear, actionable.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <FileSearch className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Expert-Level Analysis</p>
              <p className="text-xs text-muted-foreground">
                Same methodology used by senior grant strategists, delivered instantly by AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
