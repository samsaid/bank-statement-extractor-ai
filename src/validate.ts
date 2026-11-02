// Plain-code checks on the model's answer. Anything that fails gets
// flagged for a human to review instead of being trusted.
import type { Statement } from "./schema.js";

export function validate(s: Statement): string[] {
  const problems: string[] = [];
  const sum = s.transactions.reduce((acc, t) => acc + t.amount, 0);
  const expected = s.newBalance - s.previousBalance;
  if (Math.abs(sum - expected) > 0.005) {
    problems.push(`Transactions sum to ${sum.toFixed(2)} but balances imply ${expected.toFixed(2)}`);
  }
  for (const t of s.transactions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) problems.push(`Bad date format: ${t.date}`);
    else if (t.date < s.periodStart || t.date > s.periodEnd) problems.push(`Date outside statement period: ${t.date} ${t.merchant}`);
  }
  if (!/^\d{4}$/.test(s.cardLast4)) problems.push(`Card field is not 4 digits: "${s.cardLast4}"`);
  return problems;
}
