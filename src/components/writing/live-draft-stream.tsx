"use client";

// Subscribes to the per-draft Supabase Realtime broadcast channel
// (`draft-stream:{draftId}`) and renders streaming section text as
// Anthropic emits it. The worker's draft-broadcaster.ts is the
// counterpart on the producer side.
//
// Concurrency: sections 2..N stream in parallel against the warmed
// prompt cache (see draft-generator.ts). The component maintains a
// per-section buffer keyed on section_index so interleaved deltas
// land in the right place without scrambling the text.
//
// Lifecycle: mounted by the draft viewer page only while status is
// in {drafting, funder_analyzed, rfp_parsed}. Once the worker writes
// status='draft_complete' (which the parent <LiveDraftProgress />
// will see and trigger router.refresh() on), this component unmounts
// and the persisted sections render via the server component.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LiveDraftStreamProps {
  draftId: string;
}

interface SectionBuffer {
  index: number;
  name: string;
  text: string;
  done: boolean;
}

// Each section's delta arrives on the same broadcast channel; we keep
// a single buffer object per section_index. Order in the rendered list
// follows section_index ascending so parallel arrivals don't reshuffle.
function upsertSection(
  prev: SectionBuffer[],
  index: number,
  name: string,
  patch: Partial<Pick<SectionBuffer, "text" | "done">>
): SectionBuffer[] {
  const existing = prev.find((s) => s.index === index);
  if (existing) {
    return prev
      .map((s) =>
        s.index === index
          ? {
              ...s,
              text: patch.text !== undefined ? s.text + patch.text : s.text,
              done: patch.done ?? s.done,
            }
          : s
      )
      .sort((a, b) => a.index - b.index);
  }
  const next: SectionBuffer = {
    index,
    name,
    text: patch.text ?? "",
    done: patch.done ?? false,
  };
  return [...prev, next].sort((a, b) => a.index - b.index);
}

export function LiveDraftStream({ draftId }: LiveDraftStreamProps) {
  const [sections, setSections] = useState<SectionBuffer[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`draft-stream:${draftId}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    channel
      .on("broadcast", { event: "section_delta" }, (msg) => {
        const payload = msg.payload as {
          section_index: number;
          section_name: string;
          delta: string;
        };
        if (typeof payload?.section_index !== "number") return;
        setSections((prev) =>
          upsertSection(prev, payload.section_index, payload.section_name, {
            text: payload.delta,
          })
        );
      })
      .on("broadcast", { event: "section_done" }, (msg) => {
        const payload = msg.payload as {
          section_index: number;
          section_name: string;
        };
        if (typeof payload?.section_index !== "number") return;
        setSections((prev) =>
          upsertSection(prev, payload.section_index, payload.section_name, {
            done: true,
          })
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftId]);

  if (sections.length === 0) return null;

  // Anthropic emits JSON for each section (DraftSectionOutput schema).
  // While streaming we want to surface the prose, not the JSON braces
  // around it. Best-effort extraction: pull the value of "content"
  // when we can find it; otherwise show the raw stream so users still
  // see motion.
  const renderText = (raw: string): string => {
    if (!raw) return "";
    const contentMatch = raw.match(/"content"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (contentMatch && contentMatch[1]) {
      // Unescape JSON string escapes so newlines and quotes render naturally.
      try {
        return JSON.parse(`"${contentMatch[1]}"`);
      } catch {
        return contentMatch[1];
      }
    }
    // Partial JSON before "content": appears — show a placeholder until
    // the field arrives so users don't see opening braces.
    if (raw.trimStart().startsWith("{") && !raw.includes('"content"')) {
      return "";
    }
    return raw;
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Draft</h2>
        <p className="text-xs text-muted-foreground">
          Streaming as Claude writes
        </p>
      </div>
      {sections.map((s) => {
        const text = renderText(s.text);
        return (
          <div
            key={s.index}
            className="border border-warm-200 dark:border-warm-800 rounded-lg p-4 bg-card"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{s.name}</h3>
              {!s.done && (
                <Loader2 className="h-3.5 w-3.5 text-[var(--color-brand-teal)] animate-spin" />
              )}
            </div>
            {text ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
                {text}
                {!s.done && (
                  <span className="inline-block w-2 h-4 bg-[var(--color-brand-teal)] ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Preparing section…
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
