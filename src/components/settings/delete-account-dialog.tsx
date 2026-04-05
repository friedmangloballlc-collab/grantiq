"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRMATION_WORD = "DELETE";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isConfirmed = confirmText === CONFIRMATION_WORD;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmText("");
    }
    setOpen(next);
  }

  function handleDelete() {
    if (!isConfirmed) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/account/delete", { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Failed to delete account. Please try again.");
          return;
        }

        toast.success("Your account has been deleted.");
        setOpen(false);
        router.push("/login");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" />
        }
      >
        Delete my account and all data
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All of your
            organizations, grant matches, pipeline items, AI usage history, and
            account data will be deleted immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <Label htmlFor="confirm-delete">
            Type{" "}
            <span className="font-mono font-semibold text-destructive">
              {CONFIRMATION_WORD}
            </span>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRMATION_WORD}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Delete account permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
