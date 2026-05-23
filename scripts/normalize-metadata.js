const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "memcons.json");
const jsPath = path.join(root, "data", "memcons.js");

const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional", "Germany Reference"];

const DATE_LINE_CORRECTIONS = {
  "1989-12-16-428080395": "December 16, 1989, 1:30 - 3:00 p.m.",
  "1990-02-20-428080533": "February 20, 1990, 3:10 - 3:40 p.m.",
  "1990-04-19-428080645": "April 19, 1990, 11:30 a.m. - 1:05 p.m.",
  "1990-04-19-428080647": "Key Largo, Florida, April 19, 1990, 1:07 - 2:15 p.m.",
  "1990-07-09-428080829": "Founders Room, Rice University, Houston, Texas, July 9, 1990, 2:30 p.m. - 4:35 p.m.",
  "1990-09-30-428081087": "September 30, 1990, 6:40 - 7:00 p.m.",
  "1990-11-18-428081191": "November 18, 1990, 8:00 - 10:18 p.m.",
  "1991-05-07-428081633": "May 7, 1991, 3:06 - 3:50 p.m.",
  "1991-09-24-428081895": "September 24, 1991, 2:00 - 2:30 p.m. EST",
  "1991-11-07-428082005": "November 7, 1991, 5:35 - 6:00 p.m.",
  "1991-12-12-428082071": "December 12, 1991, 11:00 - 11:20 a.m.",
  "local-1990-12-17-helmut-kohl-telcon": "The Oval Office, December 17, 1990, 8:37 - 8:50 a.m."
};

function normalizeSpaces(value = "") {
  return String(value).replace(/--/g, " - ").replace(/\s+/g, " ").trim();
}

function normalizeDateLine(record) {
  if (DATE_LINE_CORRECTIONS[record.id]) return DATE_LINE_CORRECTIONS[record.id];
  return String(record.dateLine || "").replace(/^Date:\s*/i, "").trim();
}

function folderTitleFromSourceTitle(value = "") {
  return normalizeSpaces(String(value).split(";")[0] || value);
}

function sourcePageRange(record) {
  const source = record.source || {};
  if (source.sourcePages) return source.sourcePages;

  const sourceTitleMatch = String(record.sourceTitle || "").match(/source pages?\s+([^;]+)/i);
  if (sourceTitleMatch) return sourceTitleMatch[1].trim();

  const noteMatch = String(record.notes || record.sourceNote || "").match(/source pages?\s+([0-9,\-\s]+)/i);
  return noteMatch ? noteMatch[1].trim() : "";
}

function scowcroftFolderId(record) {
  const objectFilename = record.source?.objectFilename || record.sourceTitle || "";
  return (String(objectFilename).match(/(\d{5}-\d{3})/) || [])[1] || "";
}

function isTelcon(record) {
  return record.type === "Telcon" || /telcon|telephone/i.test(`${record.title || ""} ${record.sourceTitle || ""}`);
}

function scowcroftSourceNote(record) {
  const folderId = scowcroftFolderId(record);
  const folderTitle = folderTitleFromSourceTitle(record.sourceTitle || record.title);
  const pages = sourcePageRange(record);
  const parts = [
    "George H.W. Bush Library",
    "Bush Presidential Records",
    "Brent Scowcroft Collection",
    "Presidential Correspondence Files",
    isTelcon(record) ? "Presidential Telcon Files" : "Presidential Memcons Files",
    folderId ? `OA/ID ${folderId}` : "",
    folderTitle
  ].filter(Boolean);

  const facts = [
    record.releaseStatus === "Full" ? "Full release" : "Declassified",
    "Originally processed under FOIA 2009-0275-S",
    pages ? `The project PDF includes the provenance sheet and source pages ${pages}` : "",
    record.catalogUrl && /^https?:/i.test(record.catalogUrl) ? `Catalog: ${record.catalogUrl}` : ""
  ].filter(Boolean);

  return `Source: ${parts.join(", ")}. ${facts.join(". ")}.`;
}

function catalogSourceNote(record) {
  const parts = [
    "George H.W. Bush Library",
    "Bush Presidential Records",
    "National Security Council",
    normalizeSpaces(record.sourceTitle || record.title)
  ].filter(Boolean);

  const facts = [
    record.naid ? `NAID ${record.naid}` : "",
    record.releaseStatus === "Full" ? "Full release" : record.releaseStatus || "",
    record.source?.foiaNumber ? `FOIA ${record.source.foiaNumber}` : "",
    record.catalogUrl && /^https?:/i.test(record.catalogUrl) ? `Catalog: ${record.catalogUrl}` : ""
  ].filter(Boolean);

  return `Source: ${parts.join(", ")}. ${facts.join(". ")}.`;
}

function projectSourceNote(record) {
  const sourceFile = record.localOriginalFile || record.sourceTitle || record.source?.objectFilename || record.pdfUrl;
  const facts = [
    sourceFile ? `source file ${sourceFile}` : "",
    record.pdfUrl ? `project PDF ${record.pdfUrl}` : "",
    "citation sheet reconciliation pending"
  ].filter(Boolean);

  return `Source: Project-only working copy. ${facts.join(", ")}.`;
}

function provenanceStatus(record) {
  if (
    record.provenanceStatus === "citation-sheet" ||
    (record.provenancePages && /OA\/ID\s+\d{5}/i.test(record.sourceNote || ""))
  ) {
    return "citation-sheet";
  }
  if (record.source?.name === "Brent Scowcroft Papers") return "citation-sheet";
  if (record.naid?.startsWith("local-") || /local/i.test(record.source?.name || "")) return "project-only";
  return "catalog-record";
}

function chapterSortIndex(record) {
  const chapterName = record.chapter?.name || "";
  const index = CHAPTER_ORDER.indexOf(chapterName);
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

function moveGermanyReferencePdfs(records) {
  const targetDir = path.join(root, "documents", "germany-reference");
  fs.mkdirSync(targetDir, { recursive: true });

  const moves = [];
  for (const record of records) {
    if (record.chapter?.name !== "Germany Reference") continue;
    if (!record.pdfUrl || /^https?:/i.test(record.pdfUrl)) continue;
    if (!record.pdfUrl.startsWith("documents/regional/")) continue;

    const oldRelative = record.pdfUrl;
    const newRelative = oldRelative.replace("documents/regional/", "documents/germany-reference/");
    const oldPath = path.join(root, oldRelative);
    const newPath = path.join(root, newRelative);

    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      execFileSync("git", ["mv", oldRelative, newRelative], { cwd: root, stdio: "inherit" });
      moves.push({ from: oldRelative, to: newRelative });
    }

    record.pdfUrl = newRelative;
    if (record.catalogUrl === oldRelative) record.catalogUrl = newRelative;
    if (record.sourceNote) record.sourceNote = record.sourceNote.replaceAll(oldRelative, newRelative);
  }
  return moves;
}

function normalizeRecord(record) {
  record.provenanceStatus = provenanceStatus(record);

  if (record.source?.name === "Brent Scowcroft Papers") {
    record.sourceNote = scowcroftSourceNote(record);
  } else if (
    record.provenanceStatus === "citation-sheet" &&
    /National Security Council, European and Eurasian Directorate/i.test(record.sourceNote || "")
  ) {
    record.sourceNote = normalizeSpaces(record.sourceNote);
  } else if (record.provenanceStatus === "project-only") {
    record.sourceNote = projectSourceNote(record);
  } else {
    record.sourceNote = catalogSourceNote(record);
  }

  if (record.type === "Telcon") {
    record.documentTitle = "Memorandum of a Telephone Conversation";
  }
  if (record.type === "Memcon") {
    record.documentTitle = "Memorandum of Conversation";
  }
  record.dateLine = normalizeDateLine(record);

  return record;
}

const records = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const moves = moveGermanyReferencePdfs(records);
const normalized = records.map(normalizeRecord).sort(byChapterThenDate);

fs.writeFileSync(dataPath, `${JSON.stringify(normalized, null, 2)}\n`);
fs.writeFileSync(jsPath, `window.MEMCONS = ${JSON.stringify(normalized, null, 2)};\n`);

const counts = normalized.reduce(
  (summary, record) => {
    summary.totalRecords += 1;
    summary.totalPages += record.pageCount || 0;
    summary.byProvenanceStatus[record.provenanceStatus] =
      (summary.byProvenanceStatus[record.provenanceStatus] || 0) + 1;
    return summary;
  },
  { totalRecords: 0, totalPages: 0, byProvenanceStatus: {} }
);

fs.writeFileSync(
  path.join(root, "reports", "metadata-normalization-audit.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), moves, ...counts }, null, 2)}\n`
);

fs.writeFileSync(
  path.join(root, "reports", "frus-metadata-style-audit.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      styleModel: "Foreign Relations of the United States, 1989-1992, Volume XXXI, START I, 1989-1991, Document 38",
      styleModelUrl: "https://history.state.gov/historicaldocuments/frus1989-92v31/d38",
      changes: [
        "Recast Source lines to follow the FRUS archival-chain pattern used in the published volume.",
        "For Brent Scowcroft source-folder PDFs, used the provenance sheet hierarchy: Bush Presidential Records; Brent Scowcroft Collection; Presidential Correspondence Files; Presidential Telcon or Memcons Files; OA/ID folder number; folder title.",
        "Marked catalog-only and project-only records with provenanceStatus so the compiler desk does not treat unresolved citation sheets as complete."
      ],
      counts: {
        scowcroftCitationSheetRecords: counts.byProvenanceStatus["citation-sheet"] || 0,
        catalogRecordSourceNotes: counts.byProvenanceStatus["catalog-record"] || 0,
        projectOnlyRecords: counts.byProvenanceStatus["project-only"] || 0,
        totalRecords: counts.totalRecords
      }
    },
    null,
    2
  )}\n`
);

console.log(
  `Normalized ${normalized.length} records; moved ${moves.length} Germany reference PDFs; provenance statuses: ${JSON.stringify(
    counts.byProvenanceStatus
  )}`
);
