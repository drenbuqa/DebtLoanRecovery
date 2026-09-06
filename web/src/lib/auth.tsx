"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth as authApi } from "@/lib/api";
import { can as canFn, isScopedToSelf, isScopedToOffice, Permission } from "@/lib/permissions";

type AuthCtx = {
  user: any | null;
  loading: boolean;
  can: (p: Permission) => boolean;
  scopedToSelf: boolean;
  scopedToOffice: boolean;
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
    // Cookie is httpOnly — invisible to JS. Just call /me; if no valid session
    // the API returns 401 and the req() helper redirects to /login.
    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
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
