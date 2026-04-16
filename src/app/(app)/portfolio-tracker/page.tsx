"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, FileText, Calendar, Plus, Loader2, TrendingUp,
  AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioGrant {
  id: string;
  grant_name: string;
  funder_name: string;
  award_amount: number | null;
  award_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  grant_type: string | null;
  total_spent: number;
  remaining_budget: number | null;
  reports: Array<{
    id: string;
    report_type: string;
    title: string;
    due_date: string;
    status: string;
  }>;
}

interface PortfolioStats {
  total_grants: number;
  active_grants: number;
  total_awarded: number;
  total_spent: number;
  remaining_budget: number;
  upcoming_reports: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PortfolioTrackerPage() {
  const [grants, setGrants] = useState<PortfolioGrant[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ grant_name: "", funder_name: "", award_amount: "", award_date: "", start_date: "", end_date: "", grant_type: "federal", notes: "" });

  async function loadPortfolio() {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants ?? []);
        setStats(data.stats ?? null);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleAdd() {
    setAdding(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          award_amount: form.award_amount ? Number(form.award_amount) : null,
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ grant_name: "", funder_name: "", award_amount: "", award_date: "", start_date: "", end_date: "", grant_type: "federal", notes: "" });
        await loadPortfolio();
      }
    } catch { /* ignore */ } finally { setAdding(false); }
  }

  useEffect(() => { loadPortfolio(); }, []);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Grant Portfolio</h1>
          <p className="text-sm text-warm-500 mt-1">Track active grants, spending, and reporting deadlines.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Grant
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-brand-teal">{stats.active_grants}</p>
            <p className="text-xs text-muted-foreground">Active Grants</p>
          </CardContent></Card>
          <Card><CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{formatCurrency(stats.total_awarded)}</p>
            <p className="text-xs text-muted-foreground">Total Awarded</p>
          </CardContent></Card>
          <Card><CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.remaining_budget)}</p>
            <p className="text-xs text-muted-foreground">Remaining Budget</p>
          </CardContent></Card>
          <Card><CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.upcoming_reports}</p>
            <p className="text-xs text-muted-foreground">Reports Due</p>
          </CardContent></Card>
        </div>
      )}

      {/* Add Grant Form */}
      {showAdd && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Add a Grant Award</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Grant Name *</label>
                <input className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.grant_name} onChange={(e) => setForm({ ...form, grant_name: e.target.value })} placeholder="USDA Community Facilities Grant" />
              </div>
              <div>
                <label className="text-sm font-medium">Funder Name *</label>
                <input className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.funder_name} onChange={(e) => setForm({ ...form, funder_name: e.target.value })} placeholder="USDA Rural Development" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Award Amount</label>
                <input type="number" className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.award_amount} onChange={(e) => setForm({ ...form, award_amount: e.target.value })} placeholder="50000" />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input type="date" className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input type="date" className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional details..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={adding || !form.grant_name || !form.funder_name} className="gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Grant
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant List */}
      {grants.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-brand-teal mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Track Your Grant Awards</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Add your active grants to track award amounts, spending, and reporting deadlines all in one place.
              Reporting deadlines are auto-generated based on your grant period.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Your First Grant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grants.map((g) => {
            const spentPct = g.award_amount ? Math.round((g.total_spent / g.award_amount) * 100) : 0;
            const upcomingReports = g.reports.filter((r) => r.status !== "submitted" && r.status !== "approved");
            const nextReport = upcomingReports[0];

            return (
              <Card key={g.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{g.grant_name}</h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          g.status === "active" ? "bg-emerald-100 text-emerald-700" :
                          g.status === "completed" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{g.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.funder_name}
                        {g.start_date && g.end_date && <> &middot; {formatDate(g.start_date)} — {formatDate(g.end_date)}</>}
                      </p>
                    </div>
                    {g.award_amount && (
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(g.award_amount)}</p>
                        <p className="text-xs text-muted-foreground">{spentPct}% spent</p>
                      </div>
                    )}
                  </div>

                  {/* Budget bar */}
                  {g.award_amount && (
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", spentPct > 90 ? "bg-red-500" : spentPct > 70 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(100, spentPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Spent: {formatCurrency(g.total_spent)}</span>
                        <span>Remaining: {formatCurrency(g.remaining_budget ?? 0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Upcoming reports */}
                  {upcomingReports.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Reports</p>
                      <div className="space-y-1.5">
                        {upcomingReports.slice(0, 3).map((r) => {
                          const days = daysUntil(r.due_date);
                          return (
                            <div key={r.id} className="flex items-center gap-2 text-xs">
                              {days < 0 ? (
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                              ) : days <= 14 ? (
                                <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                              ) : (
                                <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                              )}
                              <span className="flex-1">{r.title}</span>
                              <span className={cn(
                                "font-medium",
                                days < 0 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-muted-foreground"
                              )}>
                                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
