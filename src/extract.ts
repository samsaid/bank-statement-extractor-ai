// Sends one PDF to the OpenAI API and gets back data in our Statement shape.
// sends the PDF as base64, and uses the new Responses API with structured output.
import fs from "node:fs";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Statement } from "./schema.js";

try { process.loadEnvFile(); } catch { /* no .env file, fall back to real env vars */ }

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}
const client = new OpenAI();

const INSTRUCTIONS = `You extract data from credit card statements.
Return every transaction listed, in order. Rules:
- Dates as YYYY-MM-DD. Statements print MM/DD, so take the year from the statement period.
- Charges are positive. Payments, refunds, and credits are negative.
- Copy merchant text exactly as printed.
- For the card number, return only the last 4 digits.`;

export async function extractStatement(pdfPath: string) {
  const base64 = fs.readFileSync(pdfPath).toString("base64");
  const started = Date.now();

  const response = await client.responses.parse({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input: [{
      role: "user",
      content: [
        { type: "input_file", filename: "statement.pdf", file_data: `data:application/pdf;base64,${base64}` },
        { type: "input_text", text: "Extract this statement." },
      ],
    }],
    text: { format: zodTextFormat(Statement, "statement") },
  });

  if (!response.output_parsed) throw new Error(`No parsed output for ${pdfPath}`);
  return {
    statement: response.output_parsed,
    seconds: (Date.now() - started) / 1000,
    usage: response.usage,
  };
}

// Run directly: npm run extract -- data/statements/stmt-01.pdf
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] ?? "data/statements/stmt-01.pdf";
  const { statement, seconds } = await extractStatement(file);
  console.log(JSON.stringify(statement, null, 2));
  console.error(`\n${statement.transactions.length} transactions in ${seconds.toFixed(1)}s using ${MODEL}`);
}
