const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const memconsPath = path.join(root, "data", "memcons.json");
const memconsJsPath = path.join(root, "data", "memcons.js");
const statementsPath = path.join(root, "data", "public-statements.json");
const reportPath = path.join(root, "reports", "data-quality-audit.json");

const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional", "Germany Reference"];
const VALID_DOCUMENT_TITLES = {
  Memcon: "Memorandum of Conversation",
  Telcon: "Memorandum of a Telephone Conversation"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadMemconsMirror() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(memconsJsPath, "utf8"), sandbox, { filename: memconsJsPath });
  return sandbox.window.MEMCONS;
}

function isRemote(url = "") {
  return /^https?:/i.test(url);
}

function localPdfPages(relativePath) {
  const output = execFileSync("pdfinfo", [path.join(root, relativePath)], { encoding: "utf8" });
  return Number(output.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
}

function chapterSortIndex(record) {
  const index = CHAPTER_ORDER.indexOf(record.chapter?.name || "");
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function byChapterThenDate(a, b) {
  return (
    chapterSortIndex(a) - chapterSortIndex(b) ||
    (a.sortDate || a.date || "").localeCompare(b.sortDate || b.date || "") ||
    (a.date || "").localeCompare(b.date || "") ||
    (a.title || "").localeCompare(b.title || "")
  );
}

function isGermanRecord(record) {
  const haystack = [
    record.title,
    record.subjectLine,
    record.dateLine,
    record.notes,
    ...(record.participants || []),
    ...(record.countries || []),
    ...(record.topics || []),
    ...(record.frusTopics || [])
  ]
    .filter(Boolean)
    .join(" ");
  return /\b(Germany|German|Kohl|Genscher|Maiziere|Maizière)\b/i.test(haystack);
}

function addCount(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

const records = readJson(memconsPath);
const mirror = loadMemconsMirror();
const statements = readJson(statementsPath);
const errors = [];
const warnings = [];

if (JSON.stringify(records) !== JSON.stringify(mirror)) {
  errors.push("data/memcons.js does not exactly mirror data/memcons.json.");
}

const ids = new Set();
for (const record of records) {
  if (ids.has(record.id)) errors.push(`Duplicate record id: ${record.id}`);
  ids.add(record.id);

  if (!record.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) errors.push(`${record.id}: invalid date.`);
  if (/\b(DECLASSIFIED|CONFIDENTIAL|SECRET|SENSITIVE|OADR|Declassify|PER E\.O\.)\b/i.test(record.dateLine || "")) {
    errors.push(`${record.id}: dateLine appears to contain OCR classification/declassification text.`);
  }
  if (/^Date:|The President|Prime The|NSC|\|/.test(record.dateLine || "")) {
    errors.push(`${record.id}: dateLine appears to contain OCR body text or an unnormalized date stub.`);
  }
  if (!VALID_DOCUMENT_TITLES[record.type]) errors.push(`${record.id}: invalid type ${record.type}.`);
  if (record.documentTitle !== VALID_DOCUMENT_TITLES[record.type]) {
    errors.push(`${record.id}: documentTitle must be "${VALID_DOCUMENT_TITLES[record.type]}".`);
  }
  if (!CHAPTER_ORDER.includes(record.chapter?.name)) errors.push(`${record.id}: invalid chapter.`);
  if (!record.sourceNote || !/^Source:/i.test(record.sourceNote)) warnings.push(`${record.id}: missing Source line.`);
  if (/https?:\/\//i.test(record.sourceNote || "")) {
    errors.push(`${record.id}: Source line contains a URL; URLs belong in provenanceNote/provenanceLinks.`);
  }
  if (record.source?.name === "Brent Scowcroft Papers" && !/OA\/ID\s+\d{5}-\d{3}/.test(record.sourceNote || "")) {
    errors.push(`${record.id}: Scowcroft Source line missing OA/ID folder number.`);
  }
  if (
    /European and Eurasian Directorate/i.test(record.sourceNote || "") &&
    !/OA\/ID\s+\d{5}.*Folder ID\s+\d{5}-\d{3}/i.test(record.sourceNote || "")
  ) {
    errors.push(`${record.id}: European/Eurasian Source line missing OA/ID and Folder ID numbers.`);
  }
  if (record.chapter?.name === "Regional" && isGermanRecord(record)) {
    errors.push(`${record.id}: German record is still assigned to Regional.`);
  }
  if (record.chapter?.name === "Germany Reference" && record.pdfUrl?.startsWith("documents/regional/")) {
    errors.push(`${record.id}: Germany reference PDF still lives under documents/regional.`);
  }
  if (record.pdfUrl && !isRemote(record.pdfUrl) && !fs.existsSync(path.join(root, record.pdfUrl))) {
    errors.push(`${record.id}: local PDF missing at ${record.pdfUrl}.`);
  }
  if (record.pdfUrl && !isRemote(record.pdfUrl) && fs.existsSync(path.join(root, record.pdfUrl))) {
    const expectedPages = (record.pageCount || 0) + (record.provenancePages || 0);
    const actualPages = localPdfPages(record.pdfUrl);
    const withheldExtent = /withheld|not declassified|restricted|denied/i.test(
      `${record.releaseStatus || ""} ${record.sourceNote || ""}`
    );
    if (expectedPages && actualPages !== expectedPages && !withheldExtent) {
      errors.push(`${record.id}: local PDF has ${actualPages} pages; expected ${expectedPages} from pageCount + provenancePages.`);
    }
  }
  if (record.catalogUrl && !isRemote(record.catalogUrl) && record.catalogUrl.endsWith(".pdf") && !fs.existsSync(path.join(root, record.catalogUrl))) {
    errors.push(`${record.id}: local catalogUrl PDF missing at ${record.catalogUrl}.`);
  }
  if (record.id === "local-1992-12-03-john-major-telcon") {
    errors.push(`${record.id}: known mislabeled Bush-Dehaene PDF is still present as John Major.`);
  }
  if (
    record.provenanceStatus === "project-only" &&
    !/citation sheet (reconciliation|extraction) pending/i.test(record.sourceNote || "")
  ) {
    errors.push(`${record.id}: project-only record lacks citation-sheet reconciliation marker.`);
  }
}

const sortedIds = [...records].sort(byChapterThenDate).map((record) => record.id);
const currentIds = records.map((record) => record.id);
if (JSON.stringify(sortedIds) !== JSON.stringify(currentIds)) {
  warnings.push("data/memcons.json is not ordered by chapter/date/title.");
}

const byChapter = {};
const byProvenanceStatus = {};
for (const record of records) {
  const chapter = record.chapter?.name || "Unspecified";
  if (!byChapter[chapter]) byChapter[chapter] = { records: 0, pages: 0 };
  byChapter[chapter].records += 1;
  byChapter[chapter].pages += record.pageCount || 0;
  addCount(byProvenanceStatus, record.provenanceStatus || "unspecified");
}

const statementIds = new Set();
for (const statement of statements) {
  if (statementIds.has(statement.id)) errors.push(`Duplicate public statement id: ${statement.id}`);
  statementIds.add(statement.id);
  if (!statement.date || !/^\d{4}-\d{2}-\d{2}$/.test(statement.date)) errors.push(`${statement.id}: invalid public statement date.`);
  if (!statement.sourceNote || !/^Source:/i.test(statement.sourceNote)) warnings.push(`${statement.id}: missing public statement Source line.`);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? "failed" : "passed",
  totals: {
    memconRecords: records.length,
    memconPages: records.reduce((sum, record) => sum + (record.pageCount || 0), 0),
    publicStatements: statements.length
  },
  byChapter,
  byProvenanceStatus,
  errors,
  warnings
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.status.toUpperCase()}: ${errors.length} errors, ${warnings.length} warnings.`);
console.log(JSON.stringify({ totals: report.totals, byChapter, byProvenanceStatus }, null, 2));

if (errors.length) {
  for (const error of errors.slice(0, 20)) console.error(error);
  process.exit(1);
}
