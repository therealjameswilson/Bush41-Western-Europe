const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "memcons.json");
const REPORT_PATH = path.join(ROOT, "reports", "woerner-coverage-audit.json");
const INDEX_URL =
  "https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons";

function decodeHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const cell = (name) => {
      const result = row.match(
        new RegExp(`<td\\b[^>]*headers=["']view-${name}-table-column["'][^>]*>([\\s\\S]*?)<\\/td>`, "i")
      );
      return decodeHtml(result?.[1] || "");
    };
    const item = {
      dateLabel: cell("date"),
      type: cell("type"),
      participantsLabel: cell("participants"),
      countryLabel: cell("country"),
      status: cell("status"),
      naid: cell("naid")
    };
    if (item.dateLabel && item.type) rows.push(item);
  }
  return rows;
}

function isoDate(value = "") {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}` : "";
}

async function indexRows() {
  const rows = [];
  for (let page = 0; page < 110; page += 1) {
    const response = await fetch(`${INDEX_URL}?page=${page}`, {
      headers: { "User-Agent": "Bush41-Western-Europe/1.0" }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const pageRows = parseRows(await response.text());
    if (!pageRows.length) break;
    rows.push(...pageRows);
  }
  return rows.map((row) => ({ ...row, date: isoDate(row.dateLabel) }));
}

function recordText(record) {
  return [record.title, record.subjectLine, ...(record.participants || [])].filter(Boolean).join(" ");
}

function representedNaids(record) {
  return new Set([
    record.naid,
    ...(record.relatedNaids || []),
    ...(record.duplicateSources || []).map((source) => source.naid)
  ].filter(Boolean).map(String));
}

async function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const rows = (await indexRows()).filter(
    (row) => row.date >= "1989-01-01" && row.date <= "1992-12-31" && /Woerner|W[öo]rner/i.test(row.participantsLabel)
  );
  const werRecords = records.filter(
    (record) => /Woerner|W[öo]rner/i.test(recordText(record)) || String(record.naid) === "428080391"
  );
  const missing = rows.filter(
    (row) => !werRecords.some((record) => representedNaids(record).has(String(row.naid)))
  );
  const report = {
    generatedAt: new Date().toISOString(),
    status: missing.length ? "failed" : "passed",
    sources: {
      bushLibraryIndex: INDEX_URL,
      projectRegister: "data/memcons.json"
    },
    summary: {
      bushIndexRows: rows.length,
      woernerRecordsInWer: werRecords.length,
      woernerMemconsInWer: werRecords.filter((record) => record.type === "Memcon").length,
      woernerTelconsInWer: werRecords.filter((record) => record.type === "Telcon").length,
      missingBushIndexRows: missing.length
    },
    officialIndexRows: rows.map((row) => ({
      ...row,
      representedBy: werRecords
        .filter((record) => representedNaids(record).has(String(row.naid)))
        .map((record) => record.id)
    })),
    records: werRecords.map((record) => ({
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.title,
      naid: record.naid,
      relatedNaids: record.relatedNaids || [],
      sourceNote: record.sourceNote
    })),
    missing
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  if (missing.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
