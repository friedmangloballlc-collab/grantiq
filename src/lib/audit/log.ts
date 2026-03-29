interface AuditInput {
  userId?: string;
  orgId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  severity?: "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export function buildAuditEntry(input: AuditInput) {
  return {
    user_id: input.userId ?? null,
    org_id: input.orgId ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    severity: input.severity ?? "INFO",
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
    timestamp: new Date().toISOString(),
  };
}
