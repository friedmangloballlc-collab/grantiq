"use client";

import { useCallback } from "react";
import { KanbanBoard, type PipelineItem } from "./kanban-board";

interface PipelineBoardWrapperProps {
  items: PipelineItem[];
}

export function PipelineBoardWrapper({ items }: PipelineBoardWrapperProps) {
  const handleStageChange = useCallback(
    async (itemId: string, newStage: string) => {
      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, stage: newStage }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Failed to persist stage change:", data.error ?? res.status);
        }
      } catch (err) {
        console.error("Failed to persist stage change:", err);
      }
    },
    []
  );

  return <KanbanBoard items={items} onStageChange={handleStageChange} />;
}
