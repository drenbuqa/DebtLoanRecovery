"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth as authApi, getToken } from "@/lib/api";
import { can as canFn, isScopedToSelf, isScopedToOffice, Permission } from "@/lib/permissions";

type AuthCtx = {
  user: any | null;
  loading: boolean;
  can: (p: Permission) => boolean;
  scopedToSelf: boolean;   // OFFICER — data filtered to own assignments
  scopedToOffice: boolean; // MANAGER — data filtered to own office
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  can: () => false,
  scopedToSelf: false,
  scopedToOffice: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (p: Permission) => canFn(user?.role, p);
  const scopedToSelf   = isScopedToSelf(user?.role);
  const scopedToOffice = isScopedToOffice(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, can, scopedToSelf, scopedToOffice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
