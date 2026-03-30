"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrantiePanel } from "./grantie-panel";

export function GrantieButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-brand-teal hover:bg-brand-teal-dark text-white shadow-lg z-50"
        size="icon"
        aria-label="Open Grantie AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
      <GrantiePanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
