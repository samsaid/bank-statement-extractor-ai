// Generates fake credit card statements as PDFs, plus the correct answer
// for each one (stmt-01.expected.json). No real data is used anywhere.
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { faker } from "@faker-js/faker";
import type { Statement, Transaction } from "./schema.js";

const OUT_DIR = "data/statements";
const COUNT = Number(process.argv[2] ?? 20);

faker.seed(42); // same documents every run

const money = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const printed = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`;

function fakeStatement(): Statement {
  const start = faker.date.between({ from: "2026-01-01", to: "2026-09-01" });
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 29 * 86400000);

  const transactions: Transaction[] = [];
  const n = faker.number.int({ min: 5, max: 30 });
  for (let i = 0; i < n; i++) {
    transactions.push({
      date: iso(faker.date.between({ from: start, to: end })),
      merchant: faker.company.name().toUpperCase().slice(0, 28) + " " + faker.location.city().toUpperCase().slice(0, 12),
      amount: round2(faker.number.float({ min: 3, max: 900 })),
    });
  }
  // Occasionally add a refund, and always add a payment.
  if (faker.datatype.boolean()) {
    const t = faker.helpers.arrayElement(transactions);
    transactions.push({ date: iso(faker.date.between({ from: t.date, to: end })), merchant: "REFUND " + t.merchant, amount: -t.amount });
  }
  const previousBalance = round2(faker.number.float({ min: 0, max: 4000 }));
  transactions.push({ date: iso(faker.date.between({ from: start, to: end })), merchant: "PAYMENT RECEIVED - THANK YOU", amount: -previousBalance });
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  return {
    cardLast4: faker.string.numeric(4),
    periodStart: iso(start),
    periodEnd: iso(end),
    previousBalance,
    newBalance: round2(previousBalance + total),
    transactions,
  };
}

function writePdf(s: Statement, file: string) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  doc.pipe(fs.createWriteStream(file));

  doc.fontSize(18).text("Sample Card Co. (FAKE DATA)", { continued: false });
  doc.fontSize(10).fillColor("#555")
    .text(`Account ending in ${s.cardLast4}`)
    .text(`Statement period: ${s.periodStart} to ${s.periodEnd}`)
    .moveDown();

  doc.fillColor("#000").fontSize(12).text("Account Summary", { underline: true }).fontSize(10)
    .text(`Previous Balance: ${money(s.previousBalance)}`)
    .text(`New Balance: ${money(s.newBalance)}`)
    .moveDown();

  doc.fontSize(12).text("Transactions", { underline: true }).moveDown(0.3).fontSize(9);
  for (const t of s.transactions) {
    const y = doc.y;
    doc.text(printed(new Date(t.date)), 50, y, { width: 50 });
    doc.text(t.merchant, 105, y, { width: 340 });
    doc.text(money(t.amount), 450, y, { width: 100, align: "right" });
    doc.moveDown(0.2);
  }
  doc.end();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (let i = 1; i <= COUNT; i++) {
  const name = `stmt-${String(i).padStart(2, "0")}`;
  const s = fakeStatement();
  writePdf(s, path.join(OUT_DIR, `${name}.pdf`));
  fs.writeFileSync(path.join(OUT_DIR, `${name}.expected.json`), JSON.stringify(s, null, 2));
}
console.log(`Wrote ${COUNT} statements to ${OUT_DIR}/`);
