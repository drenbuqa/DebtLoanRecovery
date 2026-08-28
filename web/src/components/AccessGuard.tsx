"use client";

import React from "react";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Permission } from "@/lib/permissions";

interface Props {
  permission: Permission;
  children: React.ReactNode;
}

export function AccessGuard({ permission, children }: Props) {
  const { can, loading } = useAuth();

  if (loading) return null;

  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <ShieldOff size={22} className="text-gray-400" />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-gray-900 mb-1">Access Restricted</div>
          <div className="text-[13px] text-gray-400 max-w-sm">
            You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
