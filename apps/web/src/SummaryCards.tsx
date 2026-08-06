import type { TransactionsSummary } from "./api.js";

type Props = {
  summary: TransactionsSummary;
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function SummaryCards({ summary }: Props) {
  if (summary.totalTransactions === 0) {
    return <p>No transactions yet. Upload a CSV on the Upload page to get started.</p>;
  }

  const cards: { label: string; value: string | number }[] = [
    { label: "Total Transactions", value: summary.totalTransactions },
    { label: "Successful", value: summary.successfulTransactions },
    { label: "Failed", value: summary.failedTransactions },
    { label: "Pending", value: summary.pendingTransactions },
    { label: "Total Processed", value: formatAmount(summary.totalProcessedAmount) },
    { label: "Success Rate", value: `${summary.successRate}%` },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div key={card.label} className="summary-card">
          <div className="summary-card__label">{card.label}</div>
          <div className="summary-card__value">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
