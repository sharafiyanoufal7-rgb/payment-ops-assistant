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

export const mockImports: ImportSummary[] = [
  {
    id: "import_001",
    filename: "transactions-2026-07-29.csv",
    status: "COMPLETED",
    totalRows: 120,
    successfulRows: 118,
    failedRows: 2,
    createdAt: new Date("2026-07-29T15:30:00.000Z"),
    importErrors: [
      { rowNumber: 24, message: "Invalid amount format" },
      { rowNumber: 87, message: "Unsupported currency code" },
    ],
  },
  {
    id: "import_002",
    filename: "transactions-2026-07-28.csv",
    status: "FAILED",
    totalRows: 45,
    successfulRows: 0,
    failedRows: 45,
    createdAt: new Date("2026-07-28T09:12:00.000Z"),
    importErrors: [
      { rowNumber: 1, message: "Header row missing required columns" },
    ],
  },
];
