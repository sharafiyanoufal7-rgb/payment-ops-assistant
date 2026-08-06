// apps/api/src/transactionsRepository.ts
import { PrismaClient } from "../../../generated/prisma/client.js";

export type TransactionForSummary = {
  amount: number;
  status: string;
};

export type TransactionsSummary = {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalProcessedAmount: number; // sum of amount where status = SUCCESS
  successRate: number; // 0-100, rounded to 1 decimal
};

function summarize(transactions: TransactionForSummary[]): TransactionsSummary {
  const totalTransactions = transactions.length;
  let successfulTransactions = 0;
  let failedTransactions = 0;
  let pendingTransactions = 0;
  let totalProcessedAmount = 0;

  for (const t of transactions) {
    if (t.status === "SUCCESS") {
      successfulTransactions += 1;
      totalProcessedAmount += t.amount;
    } else if (t.status === "FAILED") {
      failedTransactions += 1;
    } else if (t.status === "PENDING") {
      pendingTransactions += 1;
    }
  }

  const successRate =
    totalTransactions === 0 ? 0 : Math.round((successfulTransactions / totalTransactions) * 1000) / 10;

  return {
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    pendingTransactions,
    totalProcessedAmount,
    successRate,
  };
}

export async function getTransactionsSummary(
  prisma: PrismaClient | null,
  localTransactions: TransactionForSummary[],
): Promise<TransactionsSummary> {
  if (!prisma) {
    return summarize(localTransactions);
  }

  const [totalTransactions, statusCounts, successSum] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(statusCounts.map((row) => [row.status, row._count.status]));
  const successfulTransactions = countByStatus["SUCCESS"] ?? 0;
  const failedTransactions = countByStatus["FAILED"] ?? 0;
  const pendingTransactions = countByStatus["PENDING"] ?? 0;
  const totalProcessedAmount = Number(successSum._sum.amount ?? 0);

  const successRate =
    totalTransactions === 0 ? 0 : Math.round((successfulTransactions / totalTransactions) * 1000) / 10;

  return {
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    pendingTransactions,
    totalProcessedAmount,
    successRate,
  };
}
