import type { TransactionInput } from "./types";

const REQUIRED = ["date", "merchant", "category", "amount"] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || c === "\r") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseTransactionsCsv(text: string): TransactionInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => {
    const i = headers.indexOf(name);
    if (i < 0) {
      throw new Error(`Missing column "${name}". Found: ${headers.join(", ")}`);
    }
    return i;
  };

  for (const name of REQUIRED) {
    col(name);
  }

  const d = col("date");
  const m = col("merchant");
  const c = col("category");
  const a = col("amount");

  const rows: TransactionInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 4) continue;
    const amount = Number.parseFloat(String(cells[a]).replace(/[$,]/g, ""));
    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount on row ${i + 1}: ${cells[a]}`);
    }
    rows.push({
      date: cells[d],
      merchant: cells[m],
      category: cells[c],
      amount,
    });
  }
  return rows;
}
