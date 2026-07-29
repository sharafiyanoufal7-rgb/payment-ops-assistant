import type { ImportStatus } from "./importService.js";

export type ImportError = {
  rowNumber: number;
  message: string;
};

export type ImportSummary = {
  id: string;
  filename: string;
  status: ImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdAt: Date;
  importErrors: ImportError[];
};

export type SortOrder = "asc" | "desc";

export type ImportSortField =
  | "createdAt"
  | "filename"
  | "status"
  | "totalRows"
  | "successfulRows"
  | "failedRows";

export type ImportListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ImportStatus;
  sortBy?: ImportSortField;
  sortOrder?: SortOrder;
};

export type PagedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ImportListResponse = PagedResult<ImportSummary>;
