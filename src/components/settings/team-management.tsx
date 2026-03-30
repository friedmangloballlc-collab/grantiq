"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300",
  viewer: "bg-warm-100 text-warm-500 dark:bg-warm-800 dark:text-warm-400",
};

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  email?: string;
  name?: string;
}

interface TeamManagementProps {
  orgId: string | null;
  currentUserId: string | null;
  userRole: string | null;
  members: Member[];
}

export function TeamManagement({
  orgId,
  currentUserId,
  userRole,
  members: initialMembers,
}: TeamManagementProps) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const isAdmin = userRole === "owner" || userRole === "admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !inviteEmail) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch("/api/settings/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send invite");
      }

      setInviteSuccess(true);
      setInviteEmail("");
      setTimeout(() => setInviteSuccess(false), 4000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const res = await fetch("/api/settings/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });

      if (!res.ok) return;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch {
      // Silent fail — optimistic update already reverted
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    try {
      const res = await fetch(`/api/settings/team/members?member_id=${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) return;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Members List */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-warm-100 dark:divide-warm-800">
          {members.length === 0 && (
            <p className="py-4 text-sm text-warm-400">No members found.</p>
          )}
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isOwner = member.role === "owner";
            const canManage = isAdmin && !isCurrentUser && !isOwner;
            const initials = member.name
              ? member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : member.email?.[0]?.toUpperCase() ?? "?";

            return (
              <div key={member.id} className="flex items-center gap-3 py-3">
                {/* Avatar */}
                <div className="size-8 rounded-full bg-brand-teal/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-brand-teal">{initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 dark:text-warm-50 truncate">
                    {member.name ?? member.email ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-warm-400">(you)</span>
                    )}
                  </p>
                  {member.name && member.email && (
                    <p className="text-xs text-warm-500 truncate">{member.email}</p>
                  )}
                </div>

                {/* Status badge for pending invites */}
                {member.status === "invited" && (
                  <span className="text-xs text-warm-400 italic">Pending</span>
                )}

                {/* Role */}
                {canManage ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring"
                  >
                    {["admin", "member", "viewer"].map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_COLORS[member.role] ?? ROLE_COLORS.member
                    }`}
                  >
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                )}

                {/* Remove */}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleRemove(member.id)}
                    className="text-warm-400 hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Invite Form */}
      {isAdmin && (
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader>
            <CardTitle className="text-base">Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.org"
                    required
                  />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Invitation sent!
                </p>
              )}

              <Button type="submit" disabled={inviting || !inviteEmail}>
                {inviting ? "Sending…" : "Send Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
