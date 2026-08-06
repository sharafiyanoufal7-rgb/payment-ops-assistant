// apps/api/src/importValidation.ts
// Fills gaps in the existing validation: currency/status allow-lists.
// Duplicate detection lives in index.ts (needs DB/localTransactions access).
// Pure functions, no I/O — easy to unit test on their own.

export const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "SEK", "NOK", "DKK"]);
export const ALLOWED_STATUSES = new Set(["PENDING", "SUCCESS", "FAILED"]);

export function isSupportedCurrency(currency: string): boolean {
  return ALLOWED_CURRENCIES.has(currency.toUpperCase());
}

export function isValidStatus(status: string): boolean {
  return ALLOWED_STATUSES.has(status.toUpperCase());
}
