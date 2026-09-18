const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

// All requests include credentials so the httpOnly cookie is sent automatically.
// There is no token in JavaScript memory or localStorage — it lives only in the cookie.

let _refreshing: Promise<void> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (_refreshing) { await _refreshing; return true; }
  _refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('refresh failed');
    } catch {
      // Refresh failed — session is gone
    } finally {
      _refreshing = null;
    }
  })();
  await _refreshing;
  return true;
}

function translateApiError(raw: string | string[], status: number): string {
  const text = Array.isArray(raw) ? raw.join(' ') : (raw ?? '');
  const r = text.toLowerCase();
  if (r.includes('internal server error') || status === 500) return 'Ndodhi një gabim i brendshëm. Ju lutem provoni përsëri.';
  if (r.includes('not found') || status === 404) return 'Rekordi nuk u gjet.';
  if (r.includes('forbidden') || status === 403) return 'Nuk keni leje për këtë veprim.';
  if (r.includes('conflict') || status === 409) return 'Ky rekord ekziston tashmë.';
  if (r.includes('bad request') || status === 400) return text || 'Kërkesa nuk është e vlefshme.';
  if (r.includes('unauthorized') || status === 401) return 'Sesioni juaj ka skaduar. Ju lutem hyni përsëri.';
  if (r.includes('too many requests') || status === 429) return 'Shumë kërkesa. Ju lutem prisni pak dhe provoni përsëri.';
  if (r.includes('service unavailable') || status === 503) return 'Shërbimi nuk është i disponueshëm. Provoni përsëri pas pak.';
  return text || 'Ndodhi një gabim i papritur. Ju lutem provoni përsëri.';
}

async function req<T>(path: string, opts: RequestInit = {}, _retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: 'include', // sends the httpOnly cookie automatically
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });

  if (res.status === 401) {
    if (path === '/auth/login') {
      const err = await res.json().catch(() => ({ message: 'Kredencialet janë të pasakta' }));
      throw new Error(err.message ?? 'Kredencialet janë të pasakta');
    }
    if (_retry && path !== '/auth/refresh') {
      await tryRefresh();
      return req<T>(path, opts, false);
    }
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const raw: string | string[] = err.message ?? '';
    const msg = translateApiError(raw, res.status);
    throw new Error(msg);
  }

  return res.json();
}

// Fetches every page of a paginated endpoint and returns all items combined.
// Used by reports so exports are never silently truncated at an arbitrary limit.
export async function fetchAllPages<T>(
  fetcher: (params: { page: number; limit: number }) => Promise<{ data: T[]; meta: { pages: number } }>,
  extra: Record<string, any> = {},
  pageSize = 500,
): Promise<T[]> {
  const first = await fetcher({ ...extra, page: 1, limit: pageSize });
  const all: T[] = [...first.data];
  const total = first.meta.pages;
  for (let p = 2; p <= total; p++) {
    const res = await fetcher({ ...extra, page: p, limit: pageSize });
    all.push(...res.data);
  }
  return all;
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    req<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req<any>('/auth/me'),
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
  deletePreview: (id: string) => req<any>(`/cases/${id}/delete-preview`),
  delete: (id: string) => req(`/cases/${id}`, { method: 'DELETE' }),
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
  delete: (id: string) => req(`/activities/${id}`, { method: 'DELETE' }),
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
  void: (id: string, reason: string) =>
    req(`/payments/${id}/void`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
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
  delete: (id: string) => req(`/institutions/${id}`, { method: 'DELETE' }),
};

// Offices
export const offices = {
  list: () => req<any[]>('/offices'),
  create: (data: any) => req('/offices', { method: 'POST', body: JSON.stringify(data) }),
};

// Documents — file upload uses FormData, still needs credentials: 'include'
export const documents = {
  listByCase: (caseId: string) => req<any[]>(`/documents/case/${caseId}`),
  upload: (caseId: string, file: File, documentType: string, notes?: string): Promise<any> => {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (notes) form.append('notes', notes);
    return fetch(`${API_BASE}/documents/case/${caseId}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
      // No Content-Type header — browser sets it with the boundary for multipart
    }).then(async (r) => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message ?? `Upload failed (${r.status})`); }
      return r.json();
    });
  },
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
  institutions: (params?: { from?: string; to?: string; institutionId?: string }) => {
    const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as any).toString() : '';
    return req<any[]>(`/performance/institutions${qs ? `?${qs}` : ''}`);
  },
};

// Import
async function importFetch(path: string, form: FormData) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', credentials: 'include', body: form });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message ?? text; } catch {}
    throw new Error(msg);
  }
  return JSON.parse(text);
}

export const importApi = {
  templateUrl: () => `${API_BASE}/import/template`,
  referenceData: () => req<{ officers: any[]; institutions: any[]; cities: string[]; nplCategories: string[] }>('/import/reference-data'),
  fields: () => req<any[]>('/import/fields'),
  jobs: () => req<any[]>('/import/jobs'),
  preview: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return importFetch('/import/preview', form);
  },
  upload: async (file: File, mapping?: Record<string, string>, institution?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    if (institution) form.append('institution', institution);
    return importFetch('/import/loans', form);
  },
  bulkUpdate: async (file: File, type: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return importFetch('/import/bulk-update', form);
  },
};

// Reports — PDF download via fetch with credentials
export const reports = {
  downloadCase: async (caseId: string) => {
    const res = await fetch(`${API_BASE}/reports/case/${caseId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Report generation failed');
    return res.blob();
  },
  downloadCaseStatusXlsx: async (params?: { officerId?: string; officeId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    const res = await fetch(`${API_BASE}/reports/case-status/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
  downloadActivityLogXlsx: async (params?: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    const res = await fetch(`${API_BASE}/reports/activity-log/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
  downloadLegalCasesXlsx: async (params?: { officerId?: string; officeId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    const res = await fetch(`${API_BASE}/reports/legal-cases/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
  downloadOverdueInstallmentsXlsx: async (params?: { officerId?: string; officeId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    const res = await fetch(`${API_BASE}/reports/overdue-installments/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
  downloadAgreementStatusXlsx: async (params?: { officerId?: string; officeId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    if (params?.status) qs.set('status', params.status);
    const res = await fetch(`${API_BASE}/reports/agreement-status/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
  downloadCollectionsXlsx: async (params?: { officerId?: string; officeId?: string; dateFrom?: string; dateTo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.officerId) qs.set('officerId', params.officerId);
    if (params?.officeId) qs.set('officeId', params.officeId);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    const res = await fetch(`${API_BASE}/reports/collections/xlsx?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Gjenerimi i raportit dështoi');
    return res.blob();
  },
};
