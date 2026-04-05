"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIDisclosure } from "@/components/shared/ai-disclosure";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** When true, renders the message with error styling */
  isError?: boolean;
  /** The user text that triggered this error — used by the Retry button */
  retryText?: string;
}

const GREETING: Message = {
  role: "assistant",
  content: "Hi! I'm Grantie, your AI grant advisor. How can I help today?",
};

const SUGGESTED = [
  "What should I focus on this week?",
  "Which grants are due soon?",
  "How can I improve my readiness?",
];

const STORAGE_KEY = (orgId: string) => `grantie-chat-${orgId}`;
const MAX_STORED_MESSAGES = 50;

export function GrantiePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { orgId, orgName, tier } = useOrg();

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Persistence: load on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(orgId));
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Corrupted storage — ignore and start fresh
    }
    setHydrated(true);
  }, [orgId]);

  // ── Persistence: save on every message change (after hydration) ─────────────
  useEffect(() => {
    if (!hydrated || !orgId) return;
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY(orgId), JSON.stringify(toStore));
    } catch {
      // Quota exceeded or private-browsing restriction — silently skip
    }
  }, [messages, hydrated, orgId]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Core send function ───────────────────────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      setInput("");

      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);

      try {
        // Build a clean conversation history (exclude error messages)
        const conversationHistory = messages
          .filter((m) => !m.isError)
          .map(({ role, content }) => ({ role, content }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            message: text,
            conversation_history: conversationHistory,
            context: {
              tier,
              orgName,
              matchCount: null,
              pipelineCount: null,
            },
          }),
        });

        if (!res.ok) {
          const errorContent =
            res.status === 429
              ? "You've reached your daily Grantie limit. Upgrade for more."
              : "Sorry, I had trouble with that. Try again?";

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: errorContent,
              isError: true,
              retryText: text,
            },
          ]);
          return;
        }

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I had trouble with that. Try again?",
            isError: true,
            retryText: text,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, orgId, orgName, tier]
  );

  // ── Retry: remove the error message then resend the original text ────────────
  const retry = useCallback(
    (retryText: string, errorIndex: number) => {
      setMessages((prev) => prev.filter((_, i) => i !== errorIndex));
      // Also remove the preceding user message at errorIndex - 1 so send()
      // re-appends it cleanly and conversation_history stays consistent.
      setMessages((prev) => {
        const preceding = prev[errorIndex - 1];
        if (preceding?.role === "user" && preceding.content === retryText) {
          return prev.filter((_, i) => i !== errorIndex - 1);
        }
        return prev;
      });
      send(retryText);
    },
    [send]
  );

  // ── New conversation ─────────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setMessages([GREETING]);
    if (orgId) {
      try {
        localStorage.removeItem(STORAGE_KEY(orgId));
      } catch {
        // ignore
      }
    }
  }, [orgId]);

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-full md:w-96 bg-white dark:bg-warm-900 border-l border-warm-200 dark:border-warm-800 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-teal" />
          <span className="font-semibold text-warm-900 dark:text-warm-50">
            Grantie
          </span>
          <AIDisclosure type="chat" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearHistory}
            aria-label="New conversation"
            title="New conversation"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-brand-teal text-white"
                    : msg.isError
                    ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    : "bg-warm-100 dark:bg-warm-800 text-warm-900 dark:text-warm-50"
                )}
              >
                {msg.content}
              </div>

              {/* Retry button — only on error messages */}
              {msg.isError && msg.retryText && (
                <button
                  onClick={() => retry(msg.retryText!, i)}
                  className="flex items-center gap-1 self-start text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 transition-colors pl-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-warm-100 dark:bg-warm-800 rounded-2xl px-4 py-2.5 text-sm text-warm-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts (shown when only the greeting is present) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTED.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-700 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-warm-200 dark:border-warm-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Grantie anything..."
            className="flex-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading}
            className="bg-brand-teal hover:bg-brand-teal-dark text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
