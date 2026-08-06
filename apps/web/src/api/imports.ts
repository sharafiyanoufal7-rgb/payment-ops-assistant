// apps/web/src/api/imports.ts
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type ImportStatus = 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface ImportError {
  rowNumber: number;
  message: string;
}

export interface ImportSummary {
  id: string;
  filename: string;
  status: ImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdAt: string;
  importErrors: ImportError[];
}

export interface ImportListResponse {
  data: ImportSummary[];
  total: number;
  page: number;
  pageSize: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchImports(page = 1, pageSize = 10): Promise<ImportListResponse> {
  const res = await fetch(`${API_BASE}/api/imports?page=${page}&pageSize=${pageSize}`);
  return handleResponse(res);
}

export async function fetchImportById(id: string): Promise<ImportSummary> {
  const res = await fetch(`${API_BASE}/api/imports/${id}`);
  return handleResponse(res);
}

export async function uploadImportFile(file: File): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/imports`, { method: 'POST', body: formData });
  return handleResponse(res);
}
