'use client';

export async function apiCall<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let errorMsg = 'Request failed';
    try {
      const json = await res.json();
      errorMsg = json.error || json.detail || errorMsg;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
