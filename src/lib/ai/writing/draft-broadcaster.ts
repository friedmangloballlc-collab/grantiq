// grantiq/src/lib/ai/writing/draft-broadcaster.ts
//
// Per-draft Supabase Realtime broadcaster used by the worker to stream
// section text deltas to the browser as Anthropic emits them. The
// frontend's <LiveDraftStream /> client component subscribes to the
// matching broadcast channel and renders accumulated text per section.
//
// Why broadcast (not postgres_changes):
//   - Tokens arrive at 50-100/sec per stream; persisting each delta to
//     a DB column would burn thousands of writes per draft. Realtime
//     broadcasts are ephemeral pub/sub — zero DB load.
//   - The final draft text is still persisted via the existing
//     grant_drafts.sections JSONB write at the end of generateDraft,
//     so a mid-stream page reload gracefully falls back to the
//     persisted-final or in-progress states (no replay needed).
//
// Channel naming: `draft-stream:{draftId}`. One channel per draft;
// payloads are tagged with section_index so the client can route
// concurrent parallel-section deltas into the right buffer.

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

export interface DraftSectionDeltaPayload {
  section_index: number;
  section_name: string;
  delta: string;
}

export interface DraftSectionDonePayload {
  section_index: number;
  section_name: string;
}

export interface DraftBroadcaster {
  /** Broadcasts one text delta. Fire-and-forget — never throws. */
  delta(sectionIndex: number, sectionName: string, delta: string): void;
  /** Marks a section complete. Useful for clients to lock in the buffer. */
  done(sectionIndex: number, sectionName: string): void;
  /** Tears down the channel. Call on pipeline completion or failure. */
  close(): Promise<void>;
}

/**
 * Creates a per-draft broadcaster. Caller is responsible for invoking
 * `close()` (typically in a finally block in the worker handler).
 *
 * On any broadcast failure (channel disconnected, network blip, etc.)
 * the error is swallowed: the worker MUST keep generating tokens even
 * if the streaming-UI subscriber has dropped. The frontend has the
 * persisted-final fallback for that case.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Worker already has it loaded;
 * callers in other contexts should not be using the worker code path
 * to begin with.
 */
export function createDraftBroadcaster(draftId: string): DraftBroadcaster {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Degrade gracefully: return a no-op broadcaster so generation still works.
    return {
      delta: () => {},
      done: () => {},
      close: async () => {},
    };
  }

  const client: SupabaseClient = createClient(url, serviceKey);
  const channel: RealtimeChannel = client.channel(`draft-stream:${draftId}`, {
    config: {
      broadcast: {
        // self: true would echo our own broadcasts back — we don't want that.
        self: false,
        // ack: true would await server confirmation per send — extra latency
        // we can't afford at 50-100 deltas/sec per parallel section.
        ack: false,
      },
    },
  });

  // Subscribe so the channel is wired up before any send. Failures here
  // log silently (see file-level rationale). The worker still produces
  // tokens even if the broadcast plane is down.
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") {
      console.warn(`[draft-broadcaster] Channel subscribe status: ${status} (draftId=${draftId})`);
    }
  });

  const safeSend = (event: string, payload: object) => {
    void channel.send({ type: "broadcast", event, payload }).catch((err) => {
      // Best-effort: a failing broadcast must not abort generation.
      console.warn(`[draft-broadcaster] send failed (event=${event}, draftId=${draftId}):`, String(err));
    });
  };

  return {
    delta(sectionIndex, sectionName, delta) {
      const payload: DraftSectionDeltaPayload = {
        section_index: sectionIndex,
        section_name: sectionName,
        delta,
      };
      safeSend("section_delta", payload);
    },
    done(sectionIndex, sectionName) {
      const payload: DraftSectionDonePayload = {
        section_index: sectionIndex,
        section_name: sectionName,
      };
      safeSend("section_done", payload);
    },
    async close() {
      try {
        await client.removeChannel(channel);
      } catch (err) {
        console.warn(`[draft-broadcaster] close failed (draftId=${draftId}):`, String(err));
      }
    },
  };
}
