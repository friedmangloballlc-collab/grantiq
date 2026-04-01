"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELD_OPTIONS = [
  { value: "description", label: "Description" },
  { value: "eligibility", label: "Eligibility" },
  { value: "amount", label: "Award Amount" },
  { value: "deadline", label: "Deadline" },
  { value: "url", label: "URL / Link" },
  { value: "requirements", label: "Requirements" },
  { value: "other", label: "Other" },
] as const;

type FieldValue = (typeof FIELD_OPTIONS)[number]["value"];

interface ReportIssueButtonProps {
  grantId: string;
}

export function ReportIssueButton({ grantId }: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FieldValue>("description");
  const [currentValue, setCurrentValue] = useState("");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function resetForm() {
    setField("description");
    setCurrentValue("");
    setSuggestedValue("");
    setNotes("");
    setFieldError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);

    if (!suggestedValue.trim()) {
      setFieldError("Please enter a suggested correction.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/grants/${grantId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          currentValue: currentValue.trim(),
          suggestedValue: suggestedValue.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      toast.success("Thank you — your correction has been submitted for review.");
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Report an issue with this grant listing"
          />
        }
      >
        <Flag className="h-3 w-3 shrink-0" aria-hidden="true" />
        Report an Issue
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Incorrect Information</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Field selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-field">Which field is incorrect?</Label>
            <select
              id="report-field"
              value={field}
              onChange={(e) => setField(e.target.value as FieldValue)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-current">What&apos;s incorrect? (optional)</Label>
            <Input
              id="report-current"
              type="text"
              placeholder="Paste or describe the wrong information"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Suggested value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-suggested">
              Suggested correction <span className="text-destructive">*</span>
            </Label>
            <Input
              id="report-suggested"
              type="text"
              placeholder="What should it say instead?"
              value={suggestedValue}
              onChange={(e) => { setSuggestedValue(e.target.value); setFieldError(null); }}
              maxLength={500}
              aria-invalid={fieldError !== null}
              required
            />
            {fieldError && (
              <p className="text-xs text-destructive">{fieldError}</p>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-notes">Additional notes (optional)</Label>
            <Textarea
              id="report-notes"
              placeholder="Any context that would help us verify this correction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand-teal hover:bg-brand-teal-dark text-white"
            >
              {submitting ? "Submitting..." : "Submit Correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
