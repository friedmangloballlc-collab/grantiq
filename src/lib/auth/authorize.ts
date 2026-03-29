type OrgRole = "owner" | "admin" | "editor" | "viewer";

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

export function canAccessFeature(userRole: OrgRole, minimumRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
