export type ImportStatus = "PROCESSING" | "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED";

export type ImportSummary = {
  id: string;
  filename: string;
  status: ImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdAt: string;
};

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
  sortOrder?: "asc" | "desc";
};

export type PagedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ImportListResponse = PagedResult<ImportSummary>;

export async function fetchImports(
  query: ImportListQuery = {},
): Promise<ImportListResponse> {
  const params = new URLSearchParams();

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const url = `http://localhost:3001/api/imports?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to load imports");
  }

  return response.json();
}

export type TransactionsSummary = {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalProcessedAmount: number;
  successRate: number;
};

export async function fetchTransactionsSummary(): Promise<TransactionsSummary> {
  const response = await fetch("http://localhost:3001/api/transactions/summary");
  if (!response.ok) {
    throw new Error("Failed to load dashboard summary");
  }
  return response.json();
}
