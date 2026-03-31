"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Code2, DollarSign, Users, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const PARTNER_TYPES = [
  "SCORE Chapter",
  "SBDC (Small Business Development Center)",
  "Nonprofit Association",
  "Accounting / CPA Firm",
  "Law Firm (Nonprofit / Business)",
  "Community Foundation",
  "Chamber of Commerce",
  "University / Extension Program",
  "Consulting Firm",
  "Other",
];

const BENEFITS = [
  {
    icon: <DollarSign className="h-5 w-5 text-brand-teal" />,
    title: "Earn $25 per signup",
    desc: "Every user who signs up through your embed widget earns you $25. Paid monthly via check or ACH.",
  },
  {
    icon: <Users className="h-5 w-5 text-brand-teal" />,
    title: "Add value for your clients",
    desc: "Give your clients instant access to 5,000+ grants — without lifting a finger. The widget does the work.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-brand-teal" />,
    title: "Track your performance",
    desc: "See how many visitors used your widget, how many signed up, and how much you've earned — all in your partner dashboard.",
  },
  {
    icon: <Code2 className="h-5 w-5 text-brand-teal" />,
    title: "One line of code",
    desc: "Drop a single script tag anywhere on your site. No dev resources needed, no maintenance required.",
  },
];

const PARTNER_LOGOS = [
  { name: "SCORE", color: "#005288" },
  { name: "SBDC", color: "#0073CF" },
  { name: "Nonprofits", color: "#0D9488" },
  { name: "Accountants", color: "#57534E" },
];

export default function PartnersPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    org: "",
    type: "",
    website: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please email partners@grantiq.com directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const embedCode = `<script src="https://grantiq-gold.vercel.app/embed.js" data-partner="YOUR_PARTNER_ID"></script>`;

  return (
    <div className="bg-white dark:bg-warm-900">
      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-brand-teal/5 to-white dark:from-brand-teal/10 dark:to-warm-900 border-b border-warm-100 dark:border-warm-800">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4 uppercase tracking-wider">
            Partner Program
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-warm-900 dark:text-warm-50 leading-tight mb-4">
            Help Your Clients Find Grants.<br />
            <span className="text-brand-teal">Earn $25 Per Signup.</span>
          </h1>
          <p className="text-lg text-warm-500 max-w-2xl mx-auto mb-8">
            Embed the GrantIQ Grant Finder widget on your website. Your clients get instant access to
            5,000+ funding opportunities — and you earn a commission for every one who signs up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold text-sm transition-colors"
            >
              Apply to Become a Partner <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#embed-code"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:border-brand-teal/50 font-medium text-sm transition-colors"
            >
              See Embed Code
            </a>
          </div>
        </div>
      </section>

      {/* Who We Partner With */}
      <section className="py-12 px-4 bg-warm-50 dark:bg-warm-800/30 border-b border-warm-100 dark:border-warm-800">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold text-warm-400 uppercase tracking-widest mb-6">
            Built for organizations that serve small businesses &amp; nonprofits
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {PARTNER_LOGOS.map((p) => (
              <div
                key={p.name}
                className="px-6 py-3 rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 text-sm font-bold"
                style={{ color: p.color }}
              >
                {p.name}
              </div>
            ))}
          </div>
          <p className="text-sm text-warm-400 mt-4">
            SCORE chapters · SBDCs · Nonprofit associations · Accounting firms · Law firms · Chambers of Commerce
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
              Why Partner with GrantIQ?
            </h2>
            <p className="text-warm-500 max-w-xl mx-auto">
              A no-brainer way to add value for your clients — and a new revenue stream for your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="border-warm-200 dark:border-warm-700 hover:border-brand-teal/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center shrink-0">
                      {b.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-warm-900 dark:text-warm-50 mb-1">{b.title}</h3>
                      <p className="text-sm text-warm-500 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-warm-50 dark:bg-warm-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Apply & Get Approved",
                desc: "Fill out the form below. We review applications within 2 business days and provide your unique partner ID.",
              },
              {
                step: "2",
                title: "Add One Line of Code",
                desc: "Drop a single script tag on your website. The widget appears automatically — no developer needed.",
              },
              {
                step: "3",
                title: "Earn on Every Signup",
                desc: "Every visitor who signs up for GrantIQ through your widget earns you $25. We pay monthly.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-teal text-white text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-warm-900 dark:text-warm-50 mb-2">{item.title}</h3>
                <p className="text-sm text-warm-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embed Code Preview */}
      <section id="embed-code" className="py-20 px-4 scroll-mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
              The Widget
            </h2>
            <p className="text-warm-500 max-w-xl mx-auto">
              A clean, responsive grant finder your clients will actually use. Fits any website in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Widget preview */}
            <div className="rounded-2xl overflow-hidden border border-warm-200 dark:border-warm-700 shadow-lg">
              <iframe
                src="/embed/finder?partner=preview"
                style={{ width: "100%", height: "420px", border: "none", display: "block" }}
                title="GrantIQ Grant Finder Widget Preview"
              />
            </div>

            {/* Code + customization */}
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-warm-900 dark:text-warm-50 mb-3 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-brand-teal" />
                  Embed Code
                </h3>
                <div className="bg-warm-900 dark:bg-warm-800 rounded-xl p-4 overflow-x-auto">
                  <code className="text-xs text-green-400 font-mono break-all whitespace-pre-wrap">
                    {embedCode}
                  </code>
                </div>
                <p className="text-xs text-warm-400 mt-2">
                  Replace <code className="text-brand-teal">YOUR_PARTNER_ID</code> with your assigned partner slug.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-warm-900 dark:text-warm-50 mb-3">Customization Options</h3>
                <ul className="space-y-2">
                  {[
                    "data-partner — your unique partner ID (required)",
                    "Responsive: fits 300px–600px width",
                    "No branding conflicts — minimal GrantIQ logo only",
                    "Works on WordPress, Wix, Squarespace, custom sites",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-warm-600 dark:text-warm-400">
                      <CheckCircle2 className="h-4 w-4 text-brand-teal mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-brand-teal/5 dark:bg-brand-teal/10 border border-brand-teal/20">
                <p className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-1">
                  Commission Structure
                </p>
                <p className="text-2xl font-bold text-brand-teal">$25</p>
                <p className="text-xs text-warm-500 mt-1">per paid signup from your widget. Paid monthly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply" className="py-20 px-4 bg-warm-50 dark:bg-warm-800/30 scroll-mt-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
              Apply to Become a Partner
            </h2>
            <p className="text-warm-500">
              We review all applications within 2 business days. Approved partners receive their
              partner ID and embed code immediately.
            </p>
          </div>

          {submitted ? (
            <Card className="border-brand-teal/30 bg-brand-teal/5">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-brand-teal mx-auto mb-4" />
                <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
                  Application Received!
                </h3>
                <p className="text-warm-500">
                  Thanks for applying. We&apos;ll review your application and get back to you within 2 business days.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-warm-200 dark:border-warm-700">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Smith"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Work Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jane@score.org"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="org">Organization Name</Label>
                    <Input
                      id="org"
                      value={form.org}
                      onChange={(e) => setForm({ ...form, org: e.target.value })}
                      placeholder="SCORE Chapter 123 — Atlanta"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Organization Type</Label>
                    <select
                      id="type"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      required
                      className="w-full mt-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">Select type...</option>
                      {PARTNER_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://your-organization.org"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">
                      How do you serve small businesses or nonprofits?{" "}
                      <span className="text-warm-400 font-normal">(optional)</span>
                    </Label>
                    <textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="We advise 200+ small businesses per year on funding, operations, and growth..."
                      rows={3}
                      className="w-full mt-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
                  >
                    {submitting ? "Submitting..." : "Apply to Become a Partner"}
                  </Button>

                  <p className="text-xs text-center text-warm-400">
                    Questions? Email{" "}
                    <a href="mailto:partners@grantiq.com" className="text-brand-teal hover:underline">
                      partners@grantiq.com
                    </a>
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 text-center">
        <Sparkles className="h-8 w-8 text-brand-teal mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-2">
          Already a GrantIQ user?
        </h2>
        <p className="text-warm-500 mb-6">
          Check out our referral program — earn credit for every friend you bring to GrantIQ.
        </p>
        <Button
          className="bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href="/signup">Get Started Free</Link>}
        />
      </section>
    </div>
  );
}
