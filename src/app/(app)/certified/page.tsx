"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Award, ExternalLink, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Certification {
  id: string;
  certification_type: string;
  issued_at: string;
  expires_at: string;
  verification_code: string;
  is_active: boolean;
}

export default function CertifiedPage() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/services/orders?type=certification")
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(d => {
        // For now, show placeholder until certification is earned
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant-Ready Certification</h1>
        <p className="text-sm text-warm-500 mt-1">Official verification that your organization is grant-ready.</p>
      </div>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-14 w-14 text-brand-teal mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Earn Your Grant-Ready Certification</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Complete a Tier 2 (Remediation Roadmap) or Tier 3 (Readiness Accelerator) engagement
              to earn your Grant-Ready Certified badge. Display it on your website to build credibility
              with funders.
            </p>
            <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                <span>Official "Grant-Ready Certified" badge for your website</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                <span>Public verification page funders can check</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                <span>Embeddable badge code for your site</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                <span>Downloadable certificate PDF</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                <span>Valid for 1 year (renewal $249/yr)</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <a href="/services">
                <Button className="gap-2">
                  View Service Tiers <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {certs.map((cert) => (
            <Card key={cert.id} className="border-brand-teal">
              <CardContent className="py-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-brand-teal/10 flex items-center justify-center">
                    <Award className="h-8 w-8 text-brand-teal" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Grant-Ready Certified</h2>
                    <p className="text-sm text-muted-foreground">
                      Issued: {new Date(cert.issued_at).toLocaleDateString()} &middot;
                      Expires: {new Date(cert.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`ml-auto text-xs px-3 py-1 rounded-full ${cert.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {cert.is_active ? "Active" : "Expired"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Verification URL</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-3 py-1.5 rounded flex-1">
                        grantaq.com/verify/{cert.verification_code}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => {
                        navigator.clipboard.writeText(`https://grantaq.com/verify/${cert.verification_code}`);
                        setCopied(true); setTimeout(() => setCopied(false), 2000);
                      }}>
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Embed Code</p>
                    <code className="text-xs bg-muted px-3 py-2 rounded block overflow-x-auto">
                      {`<a href="https://grantaq.com/verify/${cert.verification_code}"><img src="https://grantaq.com/badges/grant-ready.svg" alt="Grant-Ready Certified by GrantAQ" width="200" /></a>`}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
