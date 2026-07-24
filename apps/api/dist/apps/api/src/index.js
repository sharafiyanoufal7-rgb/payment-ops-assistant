import path from "node:path";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { PrismaClient } from "../../../generated/prisma/client.js";
dotenv.config({ path: path.resolve(process.cwd(), "../..", ".env") });
const app = express();
const port = Number(process.env.PORT || 3001);
const prisma = new PrismaClient({
    adapter: undefined,
});
const REQUIRED_COLUMNS = [
    "transactionId",
    "amount",
    "currency",
    "status",
    "createdAt",
];
function splitCsvLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            }
            else {
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
function parseCsvText(csvText) {
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
        return headers.reduce((accumulator, header, index) => {
            accumulator[header] = values[index] ?? "";
            return accumulator;
        }, {});
    });
}
function validateRow(record, rowIndex) {
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
function parseMultipartFile(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers["content-type"] ?? "";
        const boundaryMatch = contentType.match(/boundary=(.*)$/i);
        if (!boundaryMatch) {
            reject(new Error("Expected multipart/form-data upload"));
            return;
        }
        const boundary = `--${boundaryMatch[1]}`;
        const chunks = [];
        req.on("data", (chunk) => {
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
        req.on("error", (error) => reject(error));
    });
}
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "payment-ops-api",
    });
});
app.post("/transactions/upload", async (req, res) => {
    try {
        const { buffer } = await parseMultipartFile(req);
        const records = parseCsvText(buffer.toString("utf8"));
        if (!records.length) {
            res.status(400).json({ message: "CSV file is empty" });
            return;
        }
        const columns = Object.keys(records[0]);
        const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
        if (missingColumns.length > 0) {
            res.status(400).json({
                message: `Missing required CSV columns: ${missingColumns.join(", ")}`,
            });
            return;
        }
        const validatedRecords = records.map((record, index) => validateRow(record, index + 2));
        await prisma.transaction.createMany({
            data: validatedRecords,
            skipDuplicates: true,
        });
        const importedRecords = await prisma.transaction.findMany({
            where: {
                transactionId: {
                    in: validatedRecords.map((record) => record.transactionId),
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        res.json({
            importedCount: importedRecords.length,
            records: importedRecords,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unable to import transactions";
        res.status(400).json({ message });
    }
});
app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
