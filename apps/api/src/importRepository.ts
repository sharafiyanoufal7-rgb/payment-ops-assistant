import { PrismaClient } from "../../../generated/prisma/client.js";
import { mockImports } from "./importMock.js";
import type { ImportSummary, ImportListQuery, ImportListResponse } from "./importTypes.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export async function listImports(
  prisma: PrismaClient | null,
  query: ImportListQuery = {},
): Promise<ImportListResponse> {
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  if (!prisma) {
    const filtered = applyFilterAndSort(mockImports, query);
    const total = filtered.length;
    const data = filtered.slice(skip, skip + pageSize);

    return { data, total, page, pageSize };
  }

  const where = buildWhere(query);
  const orderBy = buildOrderBy(query);

  const [data, total] = await Promise.all([
    prisma.import.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        importErrors: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    }),
    prisma.import.count({ where }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id,
      filename: item.filename,
      status: item.status as ImportSummary["status"],
      totalRows: item.totalRows,
      successfulRows: item.successfulRows,
      failedRows: item.failedRows,
      createdAt: item.createdAt,
      importErrors: item.importErrors.map((error) => ({
        rowNumber: error.rowNumber,
        message: error.message,
      })),
    })),
    total,
    page,
    pageSize,
  };
}

function buildWhere(query: ImportListQuery) {
  const conditions: Record<string, unknown>[] = [];

  if (query.search) {
    const searchLower = query.search.toLowerCase();
    conditions.push({
      OR: [
        { filename: { contains: query.search, mode: "insensitive" } },
        { status: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  if (query.status) {
    conditions.push({ status: query.status });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return { AND: conditions };
}

function buildOrderBy(query: ImportListQuery) {
  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder ?? "desc";

  return { [sortBy]: sortOrder } as Record<string, "asc" | "desc">;
}

function applyFilterAndSort(imports: ImportSummary[], query: ImportListQuery): ImportSummary[] {
  let result = [...imports];

  if (query.status) {
    result = result.filter((item) => item.status === query.status);
  }

  if (query.search) {
    const searchLower = query.search.toLowerCase();
    result = result.filter(
      (item) =>
        item.filename.toLowerCase().includes(searchLower) ||
        item.status.toLowerCase().includes(searchLower),
    );
  }

  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder ?? "desc";

  result.sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];

    if (left === right) {
      return 0;
    }

    if (sortOrder === "asc") {
      return left < right ? -1 : 1;
    }
    return left > right ? -1 : 1;
  });

  return result;
}
