"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { PipelineCard } from "./pipeline-card";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "researching", label: "Researching", color: "border-t-blue-400" },
  { id: "preparing", label: "Preparing", color: "border-t-purple-400" },
  { id: "writing", label: "Writing", color: "border-t-amber-400" },
  { id: "submitted", label: "Submitted", color: "border-t-teal-400" },
  { id: "awarded", label: "Awarded", color: "border-t-green-400" },
  { id: "declined", label: "Declined", color: "border-t-warm-400" },
];

export interface PipelineItem {
  id: string;
  stage: string;
  grantName: string;
  funderName: string;
  amount: number | null;
  deadline: string | null;
  progress: number;
  aiStatus: string;
}

export function KanbanBoard({
  items: initialItems,
  onStageChange,
}: {
  items: PipelineItem[];
  onStageChange: (itemId: string, newStage: string) => void;
}) {
  const [items, setItems] = useState<PipelineItem[]>(initialItems);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (destination.droppableId === source.droppableId) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggableId
          ? { ...item, stage: destination.droppableId }
          : item
      )
    );
    onStageChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageItems = items.filter((item) => item.stage === stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-64">
              <div
                className={cn(
                  "border-t-2 rounded-t-lg px-3 py-2 bg-warm-100 dark:bg-warm-800",
                  stage.color
                )}
              >
                <span className="text-sm font-medium text-warm-700 dark:text-warm-300">
                  {stage.label} ({stageItems.length})
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
                          >
                            <PipelineCard {...item} />
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
  );
}
