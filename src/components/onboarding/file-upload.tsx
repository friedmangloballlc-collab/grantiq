"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, X, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

interface FileUploadProps {
  onComplete: (uploadedCount: number) => void;
  onSkip: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onComplete, onSkip }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid: UploadedFile[] = [];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        continue; // silently skip unsupported types
      }
      if (file.size > MAX_FILE_SIZE) {
        valid.push({
          file,
          id: `${file.name}-${Date.now()}`,
          status: "error",
          errorMessage: "File exceeds 10 MB limit",
        });
        continue;
      }
      valid.push({
        file,
        id: `${file.name}-${Date.now()}`,
        status: "pending",
      });
    }
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so the same file can be re-added if removed
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) {
      onComplete(files.filter((f) => f.status === "done").length);
      return;
    }

    setUploading(true);

    let doneCount = files.filter((f) => f.status === "done").length;

    for (const entry of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("document_type", "other");

        const res = await fetch("/api/onboarding/upload-doc", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          setFiles((prev) =>
            prev.map((f) => (f.id === entry.id ? { ...f, status: "done" } : f))
          );
          doneCount += 1;
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: "error", errorMessage: body.error ?? "Upload failed" }
                : f
            )
          );
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "error", errorMessage: "Network error" }
              : f
          )
        );
      }
    }

    setUploading(false);

    // If all pending files finished (even with some errors), advance
    const finalDone = files.filter((f) => f.status === "done").length + doneCount;
    onComplete(finalDone);
  };

  const hasPending = files.some((f) => f.status === "pending");

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-150",
          dragging
            ? "border-brand-teal bg-brand-teal/5"
            : "border-warm-200 dark:border-warm-700 hover:border-brand-teal"
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-warm-400 mb-2" />
        <p className="text-sm font-medium text-warm-700 dark:text-warm-300">
          Drag &amp; drop files here, or{" "}
          <span className="text-brand-teal underline underline-offset-2">browse</span>
        </p>
        <p className="text-xs text-warm-400 mt-1">
          PDF, DOC, DOCX, PNG, JPG — max 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                entry.status === "error"
                  ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                  : entry.status === "done"
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                  : "border-warm-200 dark:border-warm-700"
              )}
            >
              <FileText className="h-4 w-4 shrink-0 text-warm-400" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-warm-800 dark:text-warm-200">
                  {entry.file.name}
                </p>
                {entry.status === "error" ? (
                  <p className="text-xs text-red-500">{entry.errorMessage}</p>
                ) : (
                  <p className="text-xs text-warm-400">
                    {formatBytes(entry.file.size)}
                    {entry.status === "uploading" && " — uploading…"}
                    {entry.status === "done" && " — uploaded"}
                  </p>
                )}
              </div>
              {entry.status !== "uploading" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(entry.id);
                  }}
                  className="text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 shrink-0"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => void handleUpload()}
          disabled={uploading || (!hasPending && files.length === 0)}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white flex items-center gap-2"
        >
          {uploading
            ? "Uploading…"
            : hasPending
            ? `Upload ${files.filter((f) => f.status === "pending").length} file${files.filter((f) => f.status === "pending").length !== 1 ? "s" : ""}`
            : "Continue"}
          {!uploading && <ChevronRight className="h-4 w-4" />}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={uploading}
          className="text-sm text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 text-center disabled:opacity-50"
        >
          Skip for now — upload later from Settings
        </button>
      </div>
    </div>
  );
}
