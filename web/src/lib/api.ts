const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

let _token: string | null = null;

export function setToken(t: string | null) {
  _token = t;
  if (typeof window !== 'undefined') {
    if (t) localStorage.setItem('dlr_token', t);
    else localStorage.removeItem('dlr_token');
  }
}

export function getToken(): string | null {
  if (_token) return _token;
  if (typeof window !== 'undefined') {
    _token = localStorage.getItem('dlr_token');
  }
  return _token;
}

let _refreshing: Promise<void> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (_refreshing) { await _refreshing; return !!getToken(); }
  _refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const { accessToken } = await res.json();
        setToken(accessToken);
      } else {
        setToken(null);
      }
    } catch {
      setToken(null);
    } finally {
      _refreshing = null;
    }
  })();
  await _refreshing;
  return !!getToken();
}

async function req<T>(path: string, opts: RequestInit = {}, _retry = true): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Try a silent token refresh once before redirecting to login
    if (_retry && path !== '/auth/login' && path !== '/auth/refresh') {
      const ok = await tryRefresh();
      if (ok) return req<T>(path, opts, false);
    }
    setToken(null);
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'API error');
  }

  return res.json();
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    req<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => req<any>('/auth/me'),
  refresh: () => req<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

// Cases
export const cases = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return req<{ data: any[]; meta: any }>(`/cases${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => req<any>(`/cases/${id}`),
  create: (data: any) => req('/cases', { method: 'POST', body: JSON.stringify(data) }),
  searchPerson: (personalId: string) => req<any>(`/cases/search-person?personalId=${encodeURIComponent(personalId)}`),
  update: (id: string, data: any) => req(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: any) => req(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  history: (id: string) => req<any[]>(`/cases/${id}/history`),
  dashboardStats: (officeId?: string) => req<any>(`/cases/dashboard-stats${officeId ? `?officeId=${officeId}` : ''}`),
  updateNextAction: (id: string, data: any) =>
    req(`/cases/${id}/next-action`, { method: 'PATCH', body: JSON.stringify(data) }),
  assign: (id: string, officerId: string) =>
    req(`/cases/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ officerId }) }),
};

// Activities
export const activities = {
  listAll: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return req<{ data: any[]; meta: any }>(`/activities${qs ? `?${qs}` : ''}`);
  },
  list: (caseId: string) => req<any[]>(`/cases/${caseId}/activities`),
  log: (caseId: string, data: any) =>
    req(`/cases/${caseId}/activities`, { method: 'POST', body: JSON.stringify(data) }),
};

// Payments
export const payments = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return req<{ data: any[]; meta: any; stats: any }>(`/payments${qs ? `?${qs}` : ''}`);
  },
  register: (data: any) =>
    req('/payments', { method: 'POST', body: JSON.stringify(data) }),
};

// Agreements
export const agreements = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return req<{ data: any[]; meta: any; stats: any }>(`/agreements${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => req<any>(`/agreements/${id}`),
  create: (data: any) => req('/agreements', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    req(`/agreements/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  payInstallment: (installmentId: string, paidAmount?: number) =>
    req(`/agreements/installments/${installmentId}/pay`, { method: 'PATCH', body: JSON.stringify({ paidAmount }) }),
};

// Legal
export const legal = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return req<{ data: any[]; meta: any; stats: any }>(`/legal${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => req<any>(`/legal/${id}`),
  create: (data: any) => req('/legal', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => req(`/legal/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Tasks
export const tasks = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
    return req<{ data: any[]; meta: any }>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  create: (data: any) => req('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  complete: (id: string) => req(`/tasks/${id}/complete`, { method: 'PATCH' }),
  uncomplete: (id: string) => req(`/tasks/${id}/uncomplete`, { method: 'PATCH' }),
  update: (id: string, data: any) => req(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Users
export const users = {
  list: (params?: { officeId?: string; isActive?: boolean }) => {
    const qs = params
      ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
      : '';
    return req<any[]>(`/users${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => req<any>(`/users/${id}`),
  stats: () => req<any>('/users/stats'),
  create: (data: any) => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => req(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivate: (id: string) => req(`/users/${id}/deactivate`, { method: 'PATCH' }),
};

// Institutions
export const institutions = {
  list: () => req<any[]>('/institutions'),
  stats: () => req<any[]>('/institutions/stats'),
  get: (id: string) => req<any>(`/institutions/${id}`),
  create: (data: any) => req('/institutions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => req(`/institutions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Offices
export const offices = {
  list: () => req<any[]>('/offices'),
  create: (data: any) => req('/offices', { method: 'POST', body: JSON.stringify(data) }),
};

// Documents
export const documents = {
  listByCase: (caseId: string) => req<any[]>(`/documents/case/${caseId}`),
  upload: (caseId: string, file: File, documentType: string, notes?: string): Promise<any> => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (notes) form.append('notes', notes);
    return fetch(`${API_BASE}/documents/case/${caseId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message ?? `Upload failed (${r.status})`); }
      return r.json();
    });
  },
  downloadUrl: (documentId: string) => `${API_BASE}/documents/${documentId}/download?token=${getToken()}`,
  delete: (documentId: string) => req(`/documents/${documentId}`, { method: 'DELETE' }),
};

// Performance
export const performance = {
  officers: (params?: { from?: string; to?: string; officeId?: string }) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : '';
    return req<any[]>(`/performance/officers${qs ? `?${qs}` : ''}`);
  },
  offices: (params?: { from?: string; to?: string }) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : '';
    return req<any[]>(`/performance/offices${qs ? `?${qs}` : ''}`);
  },
};
