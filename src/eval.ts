// Runs every test PDF through the extractor and scores it against the
// known answers. Usage: npm run eval   (or: npm run eval -- 5  to run only 5)
import fs from "node:fs";
import path from "node:path";
import { extractStatement, MODEL } from "./extract.js";
import { validate } from "./validate.js";
import type { Statement, Transaction } from "./schema.js";

const DIR = "data/statements";
const limit = Number(process.argv[2] ?? Infinity);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Pair each expected transaction with an extracted one that has the same
// date and amount. Unpaired expected = missed; unpaired extracted = invented.
function matchTransactions(expected: Transaction[], got: Transaction[]) {
  const unused = [...got];
  const pairs: [Transaction, Transaction][] = [];
  for (const e of expected) {
    const i = unused.findIndex((g) => g.date === e.date && Math.abs(g.amount - e.amount) < 0.005);
    if (i >= 0) pairs.push([e, unused.splice(i, 1)[0]]);
  }
  return { pairs, missed: expected.length - pairs.length, extra: unused.length };
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".pdf")).sort().slice(0, limit);
const totals = { expectedTx: 0, foundTx: 0, extraTx: 0, merchantOk: 0, headerFields: 0, headerOk: 0, flagged: 0, flaggedWithErrors: 0, perfectDocs: 0, seconds: 0 };
const rows: unknown[] = [];

for (const file of files) {
  const expected: Statement = JSON.parse(fs.readFileSync(path.join(DIR, file.replace(".pdf", ".expected.json")), "utf8"));
  const { statement: got, seconds } = await extractStatement(path.join(DIR, file));

  const { pairs, missed, extra } = matchTransactions(expected.transactions, got.transactions);
  const merchantOk = pairs.filter(([e, g]) => norm(e.merchant) === norm(g.merchant)).length;
  const header = (["cardLast4", "periodStart", "periodEnd", "previousBalance", "newBalance"] as const)
    .filter((k) => got[k] === expected[k]).length;
  const problems = validate(got);
  const perfect = missed === 0 && extra === 0 && merchantOk === pairs.length && header === 5;

  totals.expectedTx += expected.transactions.length;
  totals.foundTx += pairs.length;
  totals.extraTx += extra;
  totals.merchantOk += merchantOk;
  totals.headerFields += 5;
  totals.headerOk += header;
  totals.seconds += seconds;
  if (perfect) totals.perfectDocs++;
  if (problems.length) { totals.flagged++; if (!perfect) totals.flaggedWithErrors++; }

  console.log(`${file}: ${pairs.length}/${expected.transactions.length} tx found, ${extra} extra, ${problems.length ? "FLAGGED" : "ok"}${perfect ? "" : "  <- has errors"}`);
  rows.push({ file, missed, extra, merchantOk, header, problems, seconds });
}

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + "%" : "n/a");
const summary = {
  model: MODEL,
  documents: files.length,
  perfectDocuments: pct(totals.perfectDocs, files.length),
  transactionRecall: pct(totals.foundTx, totals.expectedTx),
  inventedTransactions: totals.extraTx,
  merchantAccuracy: pct(totals.merchantOk, totals.foundTx),
  headerFieldAccuracy: pct(totals.headerOk, totals.headerFields),
  flaggedForReview: totals.flagged,
  flagsThatCaughtRealErrors: `${totals.flaggedWithErrors}/${totals.flagged}`,
  avgSecondsPerDoc: (totals.seconds / files.length).toFixed(1),
};
console.log("\n", summary);

fs.mkdirSync("results", { recursive: true });
const out = `results/run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(out, JSON.stringify({ summary, rows }, null, 2));
console.log(`Saved ${out}`);
