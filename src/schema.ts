import { z } from "zod";

// The shape we force the model to return. Amounts are in dollars:
// charges are positive, payments and refunds are negative.
export const Transaction = z.object({
  date: z.string().describe("Transaction date as YYYY-MM-DD"),
  merchant: z.string().describe("Merchant or description exactly as printed"),
  amount: z.number().describe("Positive for charges, negative for payments/credits"),
});

export const Statement = z.object({
  cardLast4: z.string().describe("Last 4 digits of the card number only"),
  periodStart: z.string().describe("Statement period start as YYYY-MM-DD"),
  periodEnd: z.string().describe("Statement period end as YYYY-MM-DD"),
  previousBalance: z.number(),
  newBalance: z.number(),
  transactions: z.array(Transaction),
});

export type Transaction = z.infer<typeof Transaction>;
export type Statement = z.infer<typeof Statement>;
