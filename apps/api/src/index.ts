import path from "node:path";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { PrismaClient } from "../../../generated/prisma/client.js";
import { getImportStatus, type ImportStatus } from "./importService.js";

dotenv.config({ path: path.resolve(process.cwd(), "../..", ".env") });

const app = express();
const port = Number(process.env.PORT || 3001);
const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
} as any);

const REQUIRED_COLUMNS = [
  "transactionId",
  "amount",
  "currency",
  "status",
  "createdAt",
] as const;

type CsvRow = Record<string, string>;
type TransactionInput = {
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  createdAt: Date;
};

type ImportValidationError = {
  rowNumber: number;
  message: string;
};

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(csvText: string): CsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return headers.reduce<CsvRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
  });
}

function validateRow(record: CsvRow, rowIndex: number): TransactionInput {
  const transactionId = record.transactionId?.trim();
  const currency = record.currency?.trim();
  const status = record.status?.trim();
  const amount = Number(record.amount);
  const createdAt = new Date(record.createdAt);
  const failureReason = record.failureReason?.trim() || null;

  if (!transactionId) {
    throw new Error(`Row ${rowIndex}: transactionId is required`);
  }

  if (!Number.isFinite(amount)) {
    throw new Error(`Row ${rowIndex}: amount must be a valid number`);
  }

  if (!currency) {
    throw new Error(`Row ${rowIndex}: currency is required`);
  }

  if (!status) {
    throw new Error(`Row ${rowIndex}: status is required`);
  }

  if (Number.isNaN(createdAt.getTime())) {
    throw new Error(`Row ${rowIndex}: createdAt must be a valid date`);
  }

  return {
    transactionId,
    amount,
    currency,
    status,
    failureReason,
    createdAt,
  };
}

function parseMultipartFile(req: express.Request): Promise<{ fileName: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] ?? "";
    const boundaryMatch = contentType.match(/boundary=(.*)$/i);

    if (!boundaryMatch) {
      reject(new Error("Expected multipart/form-data upload"));
      return;
    }

    const boundary = `--${boundaryMatch[1]}`;
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.from(chunk));
    });

    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const headerIndex = body.indexOf('Content-Disposition: form-data; name="file"');

      if (headerIndex < 0) {
        reject(new Error("No file field found in multipart request"));
        return;
      }

      const filenameStart = body.indexOf('filename="', headerIndex) + 'filename="'.length;
      const filenameEnd = body.indexOf('"', filenameStart);
      const fileName = body.slice(filenameStart, filenameEnd).trim();
      const fileStart = body.indexOf("\r\n\r\n", filenameEnd) + 4;
      const fileEnd = body.indexOf(`\r\n${boundary}--`, fileStart);

      if (fileEnd < 0) {
        reject(new Error("Unable to extract uploaded CSV content"));
        return;
      }

      const buffer = Buffer.from(body.slice(fileStart, fileEnd), "utf8");
      resolve({ fileName, buffer });
    });

    req.on("error", (error: Error) => reject(error));
  });
}

async function handleImportUpload(req: express.Request, res: express.Response) {
  try {
    const { fileName, buffer } = await parseMultipartFile(req);
    const importRecord = await prisma.import.create({
      data: {
        filename: fileName,
        status: "PROCESSING" as ImportStatus,
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
      },
    });

    const records = parseCsvText(buffer.toString("utf8"));

    if (!records.length) {
      await prisma.import.update({
        where: { id: importRecord.id },
        data: {
          status: "FAILED" as ImportStatus,
          totalRows: 0,
          successfulRows: 0,
          failedRows: 0,
        },
      });

      await prisma.importError.createMany({
        data: [{
          importId: importRecord.id,
          rowNumber: 1,
          message: "CSV file is empty",
        }],
      });

      res.status(400).json({ message: "CSV file is empty" });
      return;
    }

    const columns = Object.keys(records[0]);
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
    const validationErrors: ImportValidationError[] = [];
    const validTransactions: TransactionInput[] = [];

    if (missingColumns.length > 0) {
      validationErrors.push({
        rowNumber: 1,
        message: `Missing required CSV columns: ${missingColumns.join(", ")}`,
      });
    } else {
      records.forEach((record, index) => {
        try {
          validTransactions.push(validateRow(record, index + 2));
        } catch (error) {
          validationErrors.push({
            rowNumber: index + 2,
            message: error instanceof Error ? error.message : "Unknown validation error",
          });
        }
      });
    }

    if (validTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: validTransactions,
        skipDuplicates: true,
      });
    }

    const successfulRows = validTransactions.length;
    const failedRows = validationErrors.length;

    if (validationErrors.length > 0) {
      await prisma.importError.createMany({
        data: validationErrors.map((error) => ({
          importId: importRecord.id,
          rowNumber: error.rowNumber,
          message: error.message,
        })),
      });
    }

    const updatedImport = await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: getImportStatus(successfulRows, failedRows) as ImportStatus,
        totalRows: records.length,
        successfulRows,
        failedRows,
      },
    });

    res.status(201).json(updatedImport);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import transactions";
    res.status(400).json({ message });
  }
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "payment-ops-api",
  });
});

app.post("/api/imports", handleImportUpload);
app.post("/transactions/upload", handleImportUpload);

app.get("/api/imports", async (_req, res) => {
  const imports = await prisma.import.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json(imports);
});

app.get("/api/imports/:id", async (req, res) => {
  const importRecord = await prisma.import.findUnique({
    where: { id: req.params.id },
    include: {
      importErrors: {
        orderBy: {
          rowNumber: "asc",
        },
      },
    },
  });

  if (!importRecord) {
    res.status(404).json({ message: "Import not found" });
    return;
  }

  res.json(importRecord);
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
