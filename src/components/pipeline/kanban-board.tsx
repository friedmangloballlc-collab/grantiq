"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { PipelineCard } from "./pipeline-card";
import { CompliancePanel } from "./compliance-panel";
import { DeclinedPanel } from "./declined-panel";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  { id: "identified", label: "Identified", color: "border-t-slate-400", description: "Discovered, not yet evaluated" },
  { id: "qualified", label: "Qualified", color: "border-t-blue-400", description: "Scored and worth pursuing" },
  { id: "in_development", label: "In Development", color: "border-t-purple-400", description: "Actively writing application" },
  { id: "under_review", label: "Under Review", color: "border-t-amber-400", description: "Internal review and revisions" },
  { id: "submitted", label: "Submitted", color: "border-t-cyan-400", description: "Application sent to funder" },
  { id: "pending_decision", label: "Pending Decision", color: "border-t-orange-400", description: "Awaiting funder's award decision" },
  { id: "awarded", label: "Awarded", color: "border-t-green-400", description: "Grant won! Move to compliance" },
  { id: "declined", label: "Declined", color: "border-t-red-400", description: "Not funded this cycle" },
];

export type LOIStatus = "not_required" | "sent" | "accepted" | "declined" | null;

export interface PipelineItem {
  id: string;
  stage: string;
  grantName: string;
  funderName: string;
  amount: number | null;
  deadline: string | null;
  progress: number;
  aiStatus: string;
  loiStatus?: LOIStatus;
}

// Auto-action prompts triggered when a grant moves between stages
export function getAutoAction(
  fromStage: string,
  toStage: string
): string | null {
  if (fromStage === "identified" && toStage === "qualified") {
    return "Run the Qualification Scorecard to confirm this grant is worth pursuing.";
  }
  if (fromStage === "qualified" && toStage === "in_development") {
    return "Auto-generating application checklist by cross-referencing grant requirements with your document vault.";
  }
  if (fromStage === "submitted" && toStage === "pending_decision") {
    return "Decision timer started. A follow-up reminder has been scheduled for 30 days out.";
  }
  if (fromStage === "pending_decision" && toStage === "awarded") {
    return "Congratulations! Compliance calendar created. Review your obligations in the Awarded panel.";
  }
  if (fromStage === "pending_decision" && toStage === "declined") {
    return "Marked as declined. Consider requesting feedback and flagging for resubmission next cycle.";
  }
  return null;
}

export function KanbanBoard({
  items: initialItems,
  onStageChange,
}: {
  items: PipelineItem[];
  onStageChange: (itemId: string, newStage: string) => void;
}) {
  const [items, setItems] = useState<PipelineItem[]>(initialItems);
  const [autoActionMessage, setAutoActionMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [panelType, setPanelType] = useState<"compliance" | "declined" | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (destination.droppableId === source.droppableId) return;

    const fromStage = source.droppableId;
    const toStage = destination.droppableId;

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggableId
          ? { ...item, stage: toStage }
          : item
      )
    );
    onStageChange(draggableId, toStage);

    const action = getAutoAction(fromStage, toStage);
    if (action) {
      setAutoActionMessage(action);
      setTimeout(() => setAutoActionMessage(null), 6000);
    }
  };

  const handleCardClick = (item: PipelineItem) => {
    if (item.stage === "awarded") {
      setSelectedItem(item);
      setPanelType("compliance");
    } else if (item.stage === "declined") {
      setSelectedItem(item);
      setPanelType("declined");
    }
  };

  const closePanel = () => {
    setSelectedItem(null);
    setPanelType(null);
  };

  return (
    <>
      {autoActionMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-brand-teal/10 border border-brand-teal/30 text-sm text-brand-teal font-medium flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚡</span>
          <span>{autoActionMessage}</span>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageItems = items.filter((item) => item.stage === stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-60">
                <div
                  className={cn(
                    "border-t-2 rounded-t-lg px-3 py-2 bg-warm-100 dark:bg-warm-800",
                    stage.color
                  )}
                  title={stage.description}
                >
                  <span className="text-sm font-medium text-warm-700 dark:text-warm-300">
                    {stage.label}
                  </span>
                  <span className="ml-1.5 text-xs text-warm-400">
                    ({stageItems.length})
                  </span>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[200px] space-y-2 p-2 bg-warm-50 dark:bg-warm-900/50 rounded-b-lg"
                    >
                      {stageItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleCardClick(item)}
                            >
                              <PipelineCard
                                {...item}
                                clickable={
                                  item.stage === "awarded" ||
                                  item.stage === "declined"
                                }
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedItem && panelType === "compliance" && (
        <CompliancePanel item={selectedItem} onClose={closePanel} />
      )}
      {selectedItem && panelType === "declined" && (
        <DeclinedPanel item={selectedItem} onClose={closePanel} />
      )}
    </>
  );
}
