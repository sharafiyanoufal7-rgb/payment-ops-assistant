export type ImportStatus =
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED";

export interface ImportRecord {
  id: string;
  filename: string;
  status: ImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdAt: Date;
}

export function getImportStatus(successfulRows: number, failedRows: number): ImportStatus {
  if (successfulRows === 0 && failedRows > 0) {
    return "FAILED";
  }

  if (successfulRows > 0 && failedRows > 0) {
    return "PARTIALLY_COMPLETED";
  }

  return "COMPLETED";
}
