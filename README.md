# Document Extraction Tool

Turns credit card statement PDFs into clean, validated JSON using the OpenAI API with structured outputs, and measures accuracy with an eval suite.


1. Generate fake pdf statements - generate.ts
2. Send the PDF and the schema (how we want the response back) to the openAI api.
give the AI
- a prompt
- the PDF as 64 byte
- schema of what the response should be (zodTextFormat, this is a helper funciton for openai)


> All statements in `data/` are generated fake data. Never put real statements in this repo.

## Setup

Requires Node 22+.

```bash
npm install
cp .env.example .env     # then paste your OpenAI API key into .env
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run generate` | Makes 20 fake statement PDFs in `data/statements/`, each with a `.expected.json` answer key |
| `npm run extract -- data/statements/stmt-01.pdf` | Sends one PDF to the model and prints the extracted JSON |
| `npm run eval` | Runs every PDF, scores it against the answer keys, saves results to `results/` |
| `npm run eval -- 3` | Same, but only the first 3 PDFs (cheaper while you're tweaking) |
| `npm run typecheck` | TypeScript check |

## How it works

1. `src/schema.ts` defines the exact JSON shape (Zod). The API is forced to return that shape.
2. `src/extract.ts` sends the PDF plus instructions to the model.
3. `src/validate.ts` checks the answer in plain code: transactions must add up to the balance change, dates must be inside the statement period. Failures get flagged for human review.
4. `src/eval.ts` compares output to the answer keys and reports:
   - **Transaction recall**: share of real transactions found
   - **Invented transactions**: ones the model made up
   - **Merchant accuracy** and **header field accuracy**
   - **Flags that caught real errors**: whether validation catches the mistakes

## Results

| Date | Model | Prompt change | Recall | Merchant acc. | Perfect docs | Sec/doc |
| --- | --- | --- | --- | --- | --- | --- |
| | | baseline | | | | |
