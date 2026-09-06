// ── Permission strings ───────────────────────────────────────
export type Permission =
  // Page visibility
  | "page:dashboard"
  | "page:cases"
  | "page:activities"
  | "page:payments"
  | "page:agreements"
  | "page:legal"
  | "page:field-visits"
  | "page:institutions"
  | "page:reports"
  | "page:performance"
  | "page:admin:users"
  | "page:admin:offices"
  | "page:settings"
  // Case actions
  | "case:create"
  | "case:edit"
  | "case:assign"
  // Activity actions
  | "activity:create"
  // Payment actions
  | "payment:create"
  // Agreement actions
  | "agreement:create"
  // Legal actions
  | "legal:create"
  // Field visit actions
  | "field-visit:create"
  // Institution actions
  | "institution:create"
  | "institution:edit"
  // User management actions
  | "user:create"
  | "user:edit"
  | "user:deactivate"
  | "user:reset-password"
  // Office actions
  | "office:create"
  // Document actions
  | "document:delete"
  // Report actions
  | "report:export";

// ── Per-role permission sets ─────────────────────────────────
const ADMIN_PERMS: Permission[] = [
  "page:dashboard", "page:cases", "page:activities",
  "page:payments", "page:agreements", "page:legal", "page:field-visits",
  "page:institutions", "page:reports", "page:performance",
  "page:admin:users", "page:admin:offices", "page:settings",
  "case:create", "case:edit", "case:assign",
  "activity:create",
  "payment:create",
  "agreement:create",
  "legal:create",
  "field-visit:create",
  "institution:create", "institution:edit",
  "user:create", "user:edit", "user:deactivate", "user:reset-password",
  "office:create",
  "document:delete",
  "report:export",
];

const MANAGER_PERMS: Permission[] = [
  "page:dashboard", "page:cases", "page:activities",
  "page:payments", "page:agreements", "page:legal", "page:field-visits",
  "page:institutions", "page:reports", "page:performance",
  "page:admin:users", "page:admin:offices", "page:settings",
  "case:create", "case:edit", "case:assign",
  "activity:create",
  "payment:create",
  "agreement:create",
  "legal:create",
  "field-visit:create",
  // Managers can see user list and reset passwords but cannot create/deactivate
  "user:reset-password",
  "document:delete",
  "report:export",
];

const OFFICER_PERMS: Permission[] = [
  "page:dashboard", "page:cases", "page:activities",
  "page:payments", "page:agreements", "page:legal", "page:field-visits",
  "page:settings",
  "activity:create",
  "payment:create",
  "agreement:create",
  "field-visit:create",
  "case:edit",
  "document:delete",
];

const VIEWER_PERMS: Permission[] = [
  "page:dashboard", "page:cases", "page:activities",
  "page:payments", "page:agreements", "page:legal", "page:field-visits",
  "page:institutions", "page:reports", "page:performance",
  "report:export",
];

const ROLE_MAP: Record<string, Set<Permission>> = {
  ADMIN:   new Set(ADMIN_PERMS),
  MANAGER: new Set(MANAGER_PERMS),
  OFFICER: new Set(OFFICER_PERMS),
  VIEWER:  new Set(VIEWER_PERMS),
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_MAP[role]?.has(permission) ?? false;
}

// Data scoping: OFFICERs only see their own cases/activities
export function isScopedToSelf(role: string | null | undefined): boolean {
  return role === "OFFICER";
}

// Office scoping: MANAGERs only see data from their own office
export function isScopedToOffice(role: string | null | undefined): boolean {
  return role === "MANAGER";
}

// Human-readable role labels and descriptions
export const ROLE_META: Record<string, { label: string; color: string; description: string }> = {
  ADMIN: {
    label: "Administrator",
    color: "bg-gray-900 text-white",
    description: "Full platform access. Manages users, offices, and all operational data.",
  },
  MANAGER: {
    label: "Manager",
    color: "bg-brand-100 text-brand-700",
    description: "Oversees operations, assigns cases, generates reports, and manages their office's team.",
  },
  OFFICER: {
    label: "Collection Officer",
    color: "bg-blue-100 text-blue-700",
    description: "Works their assigned cases: logs activities, payments, field visits, and agreements.",
  },
  VIEWER: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-600",
    description: "Read-only access for auditors, executives, or external reviewers.",
  },
};
