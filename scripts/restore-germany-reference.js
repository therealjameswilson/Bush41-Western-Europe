const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const HISTORICAL_REF = "1915d3d";
const REFERENCE_SECTION = { number: 5, name: "Germany Reference" };
const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional", "Germany Reference"];
const SUPERSEDED_RECORD_IDS = new Set(["local-1990-02-13-helmut-kohl-telcon"]);
const SUPERSEDED_LOCAL_PDFS = new Set(["documents/regional/1990-02-13-bush-helmut-kohl-telcon.pdf"]);

const FRUS_VOLUME = "Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe";
const SCOWCROFT_FILE_NAIDS = {
  "41-bpr-scow-pcor-telcon-91111-001.pdf": "366551686",
  "41-bpr-scow-pcor-telcon-91111-002.pdf": "366551687",
  "41-bpr-scow-pcor-telcon-91111-003.pdf": "366551688",
  "41-bpr-scow-pcor-telcon-91111-004.pdf": "366551689",
  "41-bpr-scow-pcor-telcon-91111-005.pdf": "366551690",
  "41-bpr-scow-pcor-telcon-91111-006.pdf": "366551691",
  "41-bpr-scow-pcor-telcon-91111-007.pdf": "366551692",
  "41-bpr-scow-pcor-telcon-91112-001.pdf": "366551693",
  "41-bpr-scow-pcor-telcon-91112-002.pdf": "366551694",
  "41-bpr-scow-pcor-telcon-91112-003.pdf": "366551695",
  "41-bpr-scow-pcor-telcon-91112-004.pdf": "366551696",
  "41-bpr-scow-pcor-telcon-91112-005.pdf": "366551697",
  "41-bpr-scow-pcor-telcon-91112-006.pdf": "366551698",
  "41-bpr-scow-pcor-telcon-91112-007.pdf": "366551699",
  "41-bpr-scow-pcor-telcon-91112-008.pdf": "366551700",
  "41-bpr-scow-pcor-telcon-91113-001.pdf": "366551701",
  "41-bpr-scow-pcor-telcon-91113-002.pdf": "366551702",
  "41-bpr-scow-pcor-telcon-91113-003.pdf": "366551703",
  "41-bpr-scow-pcor-telcon-91113-004.pdf": "366551704",
  "41-bpr-scow-pcor-telcon-91113-005.pdf": "366551705",
  "41-bpr-scow-pcor-telcon-91113-006.pdf": "366551706",
  "41-bpr-scow-pcor-memcon-91109-002.pdf": "366551677"
};

const ADDITIONAL_GERMANY_RECORDS = [
  {
    id: "1990-02-13-366551690-45",
    date: "1990-02-13",
    sortDate: "1990-02-13",
    type: "Telcon",
    title: "Telephone conversation: President Bush and Helmut Kohl",
    sourceTitle:
      "Presidential Telephone Calls--Memorandum of Conversations 1/1/90-3/15/90; 41-bpr-scow-pcor-telcon-91111-005.pdf; source pages 45-46",
    participants: ["George H. W. Bush", "Helmut Kohl"],
    countries: ["United States", "Germany"],
    chapter: REFERENCE_SECTION,
    releaseStatus: "Declassified",
    naid: "366551690",
    pdfUrl: "documents/regional/1990-02-13-bush-helmut-kohl-telcon-from-kohl-scowcroft.pdf",
    catalogUrl: "https://catalog.archives.gov/id/366551690",
    source: {
      name: "Brent Scowcroft Papers",
      url: "https://www.bush41library.gov/digital-research-room/finding-aid/brent-scowcroft-papers",
      series: "Presidential Correspondence",
      objectUrl:
        "https://s3.amazonaws.com/NARAprodstorage/lz/presidential-libraries/bush/gb-gbs/4545941/41-bpr-scow-pcor-telcon-91111-005.pdf",
      objectFilename: "41-bpr-scow-pcor-telcon-91111-005.pdf"
    },
    frusVolume: FRUS_VOLUME,
    frusTopics: [
      "Western Europe",
      "Declassified memcons and telcons",
      "Brent Scowcroft Papers",
      "Germany Reference",
      "Germany and German unification"
    ],
    topics: ["Germany Reference", "Telcon", "Germany", "Germany and German unification"],
    pageCount: 2,
    provenancePages: 1,
    documentTitle: "Memorandum of a Telephone Conversation",
    dateLine: "Washington, February 13, 1990, 1:49-2:00 p.m. EST",
    subjectLine: "President Bush and Helmut Kohl; Kohl-initiated call on German unification",
    sourceNote:
      "Source: George H.W. Bush Library, George H.W. Bush Presidential Records, Scowcroft, Brent, Collection, Presidential Correspondence Files, Presidential Telcon Files, OA/ID 91111-005, Presidential Telephone Calls--Memorandum of Conversations 1/1/90-3/15/90, Declassified, Originally processed under FOIA 2009-0275-S, The project PDF includes the provenance sheet and source pages 45-46, Catalog: https://catalog.archives.gov/id/366551690.",
    notes:
      "Added during Germany reference completeness review. This is the first of two distinct Kohl telephone conversations on February 13, 1990."
  },
  {
    id: "1990-02-13-366551690-47",
    date: "1990-02-13",
    sortDate: "1990-02-13",
    type: "Telcon",
    title: "Telephone conversation: President Bush and Helmut Kohl",
    sourceTitle:
      "Presidential Telephone Calls--Memorandum of Conversations 1/1/90-3/15/90; 41-bpr-scow-pcor-telcon-91111-005.pdf; source pages 47-48",
    participants: ["George H. W. Bush", "Helmut Kohl"],
    countries: ["United States", "Germany"],
    chapter: REFERENCE_SECTION,
    releaseStatus: "Declassified",
    naid: "366551690",
    pdfUrl: "documents/regional/1990-02-13-bush-helmut-kohl-telcon-to-kohl-scowcroft.pdf",
    catalogUrl: "https://catalog.archives.gov/id/366551690",
    source: {
      name: "Brent Scowcroft Papers",
      url: "https://www.bush41library.gov/digital-research-room/finding-aid/brent-scowcroft-papers",
      series: "Presidential Correspondence",
      objectUrl:
        "https://s3.amazonaws.com/NARAprodstorage/lz/presidential-libraries/bush/gb-gbs/4545941/41-bpr-scow-pcor-telcon-91111-005.pdf",
      objectFilename: "41-bpr-scow-pcor-telcon-91111-005.pdf"
    },
    frusVolume: FRUS_VOLUME,
    frusTopics: [
      "Western Europe",
      "Declassified memcons and telcons",
      "Brent Scowcroft Papers",
      "Germany Reference",
      "Germany and German unification"
    ],
    topics: ["Germany Reference", "Telcon", "Germany", "Germany and German unification"],
    pageCount: 2,
    provenancePages: 1,
    documentTitle: "Memorandum of a Telephone Conversation",
    dateLine: "Washington, February 13, 1990, 3:01-3:10 p.m. EST",
    subjectLine: "President Bush and Helmut Kohl; follow-up call on Two Plus Four language",
    sourceNote:
      "Source: George H.W. Bush Library, George H.W. Bush Presidential Records, Scowcroft, Brent, Collection, Presidential Correspondence Files, Presidential Telcon Files, OA/ID 91111-005, Presidential Telephone Calls--Memorandum of Conversations 1/1/90-3/15/90, Declassified, Originally processed under FOIA 2009-0275-S, The project PDF includes the provenance sheet and source pages 47-48; duplicate copy appears at source pages 49-50, Catalog: https://catalog.archives.gov/id/366551690.",
    notes:
      "Added during Germany reference completeness review. Source pages 49-50 duplicate this February 13, 1990 follow-up conversation."
  },
  {
    id: "1992-01-23-366551703-12-withheld",
    date: "1992-01-23",
    sortDate: "1992-01-23",
    type: "Telcon",
    title: "Telephone conversation: President Bush and Helmut Kohl",
    sourceTitle:
      "Presidential Telephone Calls--Memorandum of Conversations 1/2/92-4/9/92; 41-bpr-scow-pcor-telcon-91113-003.pdf; withdrawal sheet at source pages 12-13",
    participants: ["George H. W. Bush", "Helmut Kohl"],
    countries: ["United States", "Germany"],
    chapter: REFERENCE_SECTION,
    releaseStatus: "Withheld under b(1)",
    naid: "366551703",
    pdfUrl: "documents/regional/1992-01-23-bush-helmut-kohl-telcon-withheld-scowcroft.pdf",
    catalogUrl: "https://catalog.archives.gov/id/366551703",
    source: {
      name: "Brent Scowcroft Papers",
      url: "https://www.bush41library.gov/digital-research-room/finding-aid/brent-scowcroft-papers",
      series: "Presidential Correspondence",
      objectUrl:
        "https://s3.amazonaws.com/NARAprodstorage/lz/presidential-libraries/bush/gb-gbs/4545941/41-bpr-scow-pcor-telcon-91113-003.pdf",
      objectFilename: "41-bpr-scow-pcor-telcon-91113-003.pdf"
    },
    frusVolume: FRUS_VOLUME,
    frusTopics: [
      "Western Europe",
      "Brent Scowcroft Papers",
      "Germany Reference",
      "Germany and German unification",
      "Withheld memcons and telcons"
    ],
    topics: ["Germany Reference", "Telcon", "Germany", "Germany and German unification", "Withheld"],
    pageCount: 3,
    provenancePages: 2,
    documentTitle: "Memorandum of a Telephone Conversation",
    dateLine: "Washington, January 23, 1992",
    subjectLine: "President Bush and Helmut Kohl; withheld 3-page telcon",
    sourceNote:
      "Source: George H.W. Bush Library, George H.W. Bush Presidential Records, Scowcroft, Brent, Collection, Presidential Correspondence Files, Presidential Telcon Files, OA/ID 91113-003, Presidential Telephone Calls--Memorandum of Conversations 1/2/92-4/9/92, Access restricted: withdrawal sheet identifies Telcon Re: Telcon with Chancellor Helmut Kohl of Germany (3 pp.), January 23, 1992, closed under (b)(1). The project PDF includes the provenance sheet, NSC cover memorandum, and withdrawal sheet; conversation text is not declassified. Catalog: https://catalog.archives.gov/id/366551703.",
    notes:
      "Listed because the Scowcroft file documents a Bush-Kohl telcon that remains withheld. Page count comes from the withdrawal sheet, not released conversation text."
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function historicalRecords() {
  return JSON.parse(execFileSync("git", ["show", `${HISTORICAL_REF}:data/memcons.json`], { encoding: "utf8" }));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function sourcePageRange(record) {
  const match = (record.sourceTitle || "").match(/source pages?\s+([^;]+)/i);
  return match ? match[1].trim() : "";
}

function oaId(record) {
  const filename = record.source?.objectFilename || "";
  const match = filename.match(/-(\d{5}-\d{3})\.pdf$/);
  return match ? match[1] : "";
}

function topicTags(record) {
  const isEastGerman = /German Democratic Republic|de Maiziere|East German|GDR/i.test(
    `${record.title} ${(record.participants || []).join(" ")} ${(record.countries || []).join(" ")}`
  );
  return unique([
    ...(record.frusTopics || []),
    "Germany Reference",
    "Germany and German unification",
    isEastGerman ? "East Germany" : ""
  ]);
}

function subjectLine(record) {
  if (/Kohl/i.test(record.title)) return "President Bush and Helmut Kohl";
  if (/de Maiziere/i.test(record.title)) return "President Bush and Lothar de Maiziere";
  return record.title;
}

function documentTitle(record) {
  if (record.type === "Telcon") return "Memorandum of a Telephone Conversation";
  return "Memorandum of Conversation";
}

function sourceNote(record) {
  const pages = sourcePageRange(record);
  const source = record.source || {};

  if (/Brent Scowcroft/i.test(source.name || "")) {
    return unique([
      "Source: George H.W. Bush Library",
      "George H.W. Bush Presidential Records",
      "Scowcroft, Brent, Collection",
      "Presidential Correspondence Files",
      record.type === "Telcon" ? "Presidential Telcon Files" : "Presidential Memcon Files",
      oaId(record) ? `OA/ID ${oaId(record)}` : "",
      (record.sourceTitle || "").split(";")[0],
      "Declassified",
      "Originally processed under FOIA 2009-0275-S",
      pages ? `The project PDF includes the provenance sheet and source pages ${pages}` : "",
      record.catalogUrl ? `Catalog: ${record.catalogUrl}` : ""
    ]).join(", ") + ".";
  }

  if (/Local Bush memcons extractor/i.test(source.name || "")) {
    return unique([
      "Source: Local Bush memcons extractor output",
      record.localOriginalFile ? `source file ${record.localOriginalFile}` : record.sourceTitle,
      record.pdfUrl ? `project PDF ${record.pdfUrl}` : "",
      `release status ${record.releaseStatus || "Unknown"}`,
      "official catalog metadata requires manual reconciliation"
    ]).join(", ") + ".";
  }

  return unique([
    "Source: George H.W. Bush Library",
    "George H.W. Bush Presidential Records",
    "National Security Council",
    record.sourceTitle || record.title,
    record.naid ? `NAID ${record.naid}` : "",
    record.releaseStatus ? record.releaseStatus : "",
    source.foiaNumber ? `FOIA ${source.foiaNumber}` : "",
    record.catalogUrl ? `Catalog: ${record.catalogUrl}` : "",
    record.pdfUrl ? `Digital copy: ${record.pdfUrl}` : ""
  ]).join(", ") + ".";
}

function oaFromSourceFile(file = "") {
  const match = file.match(/-(\d{5}-\d{3})\.pdf$/);
  return match ? match[1] : "";
}

function sourcePagesLabel(entry) {
  if (!entry.startPage) return "";
  return entry.startPage === entry.endPage ? String(entry.startPage) : `${entry.startPage}-${entry.endPage}`;
}

function duplicateSourceFromSkippedEntry(entry) {
  const isMemconFile = /memcon/i.test(entry.file || "");
  return {
    sourceName: "Brent Scowcroft Papers",
    series: `Presidential Correspondence Files, ${isMemconFile ? "Presidential Memcon Files" : "Presidential Telcon Files"}`,
    localIdentifier: oaFromSourceFile(entry.file),
    naid: SCOWCROFT_FILE_NAIDS[entry.file] || "",
    sourceFile: entry.file,
    sourcePages: sourcePagesLabel(entry),
    reason: entry.reason
  };
}

function duplicateKey(duplicate) {
  return [duplicate.sourceName, duplicate.sourceFile, duplicate.sourcePages, duplicate.naid].join("|");
}

function alreadyHasDuplicate(record, duplicate) {
  return (record.source?.duplicateSources || []).some((existing) => duplicateKey(existing) === duplicateKey(duplicate));
}

function matchesDedupedScowcroftEntry(record, entry) {
  if (entry.date === "1990-02-13") return false;
  if (record.chapter?.name !== "Germany Reference") return false;
  if (record.date !== entry.date || record.type !== entry.type) return false;
  if (!/Kohl/i.test(`${record.title} ${(record.participants || []).join(" ")}`)) return false;

  if (entry.date === "1991-09-16") {
    const isExpandedEntry = /^Expanded/i.test(entry.subject || "");
    const isExpandedRecord = /Expanded/i.test(`${record.title} ${record.sourceTitle || ""}`);
    return isExpandedEntry === isExpandedRecord;
  }

  return true;
}

function annotateDedupedScowcroftProvenance(records) {
  const scowcroftAudit = readJson("reports/scowcroft-missing-records-audit.json");
  let annotations = 0;

  const entries = scowcroftAudit.skipped.filter(
    (entry) =>
      entry.reason === "already-in-current-collection" &&
      /Kohl/i.test(entry.subject || "") &&
      entry.file &&
      entry.startPage
  );

  for (const entry of entries) {
    const duplicate = duplicateSourceFromSkippedEntry(entry);
    const matches = records.filter((record) => matchesDedupedScowcroftEntry(record, entry));

    for (const record of matches) {
      record.source = record.source || {};
      record.source.duplicateSources = record.source.duplicateSources || [];
      if (!alreadyHasDuplicate(record, duplicate)) {
        record.source.duplicateSources.push(duplicate);
        annotations += 1;
      }
    }
  }

  return annotations;
}

function normalizeGermanyRecord(record) {
  const frusTopics = topicTags(record);
  return {
    ...record,
    chapter: REFERENCE_SECTION,
    frusTopics,
    topics: unique([...(record.topics || []), "Germany Reference", "Germany", "Germany and German unification"]),
    documentTitle: record.documentTitle || documentTitle(record),
    subjectLine: record.subjectLine || subjectLine(record),
    dateLine: record.dateLine || `Date: ${formatDate(record.date)}`,
    sourceNote: record.sourceNote || sourceNote(record),
    notes: unique([
      record.notes,
      "Restored as a Germany reference record after the earlier Germany-specific exclusion audit. Keep separate from the four Western Europe chapter sequence unless the compiler elects to fold Germany material into Regional."
    ]).join(" ")
  };
}

function byChapterThenDate(a, b) {
  return (
    CHAPTER_ORDER.indexOf(a.chapter.name) - CHAPTER_ORDER.indexOf(b.chapter.name) ||
    a.sortDate.localeCompare(b.sortDate) ||
    a.title.localeCompare(b.title)
  );
}

const current = readJson("data/memcons.json");
const report = readJson("reports/germany-regional-exclusion-audit.json");
const oldRecords = historicalRecords();
const excludedIds = new Set(report.excludedRecords.map((record) => record.id));
const restored = oldRecords
  .filter((record) => excludedIds.has(record.id) && !SUPERSEDED_RECORD_IDS.has(record.id))
  .map(normalizeGermanyRecord);
const additionalIds = new Set(ADDITIONAL_GERMANY_RECORDS.map((record) => record.id));
const currentIds = new Set(current.map((record) => record.id));
const newRecords = [...restored, ...ADDITIONAL_GERMANY_RECORDS].filter((record) => !currentIds.has(record.id));
const merged = [
  ...current.filter(
    (record) =>
      !excludedIds.has(record.id) &&
      !additionalIds.has(record.id) &&
      !SUPERSEDED_RECORD_IDS.has(record.id)
  ),
  ...restored,
  ...ADDITIONAL_GERMANY_RECORDS
].sort(byChapterThenDate);
const dedupedScowcroftProvenanceAnnotations = annotateDedupedScowcroftProvenance(merged);

for (const pdfPath of report.localPdfsToRemove) {
  if (!SUPERSEDED_LOCAL_PDFS.has(pdfPath) && !fs.existsSync(pdfPath)) {
    execFileSync("git", ["restore", "--source", HISTORICAL_REF, "--", pdfPath]);
  }
}

fs.writeFileSync("data/memcons.json", `${JSON.stringify(merged, null, 2)}\n`);
fs.writeFileSync("data/memcons.js", `window.MEMCONS = ${JSON.stringify(merged, null, 2)};\n`);

const totals = merged.reduce(
  (memo, record) => {
    const chapter = record.chapter.name;
    memo.bySection[chapter] ||= { records: 0, pages: 0 };
    memo.bySection[chapter].records += 1;
    memo.bySection[chapter].pages += record.pageCount || 0;
    memo.records += 1;
    memo.pages += record.pageCount || 0;
    return memo;
  },
  { records: 0, pages: 0, bySection: {} }
);

const audit = {
  generatedAt: new Date().toISOString(),
  historicalRef: HISTORICAL_REF,
  excludedAuditRecords: excludedIds.size,
  restoredRecords: restored.length,
  supplementalRecords: ADDITIONAL_GERMANY_RECORDS.length,
  supersededRecords: [...SUPERSEDED_RECORD_IDS],
  dedupedScowcroftProvenanceAnnotations,
  addedRecords: newRecords.length,
  skippedAlreadyPresent: restored.length + ADDITIONAL_GERMANY_RECORDS.length - newRecords.length,
  restoredLocalPdfs: report.localPdfsToRemove.filter((pdfPath) => !SUPERSEDED_LOCAL_PDFS.has(pdfPath)).length,
  kohlRecords: merged.filter((record) => record.chapter.name === "Germany Reference" && /Kohl/i.test(JSON.stringify(record))).length,
  eastGermanLeaderRecords: merged.filter((record) =>
    record.chapter.name === "Germany Reference" &&
    /German Democratic Republic|de Maiziere|East German|GDR/i.test(JSON.stringify(record))
  ).length,
  sourceMix: merged.filter((record) => record.chapter.name === "Germany Reference").reduce((memo, record) => {
    const sourceName = record.source?.name || "Unknown";
    memo[sourceName] = (memo[sourceName] || 0) + 1;
    return memo;
  }, {}),
  totals,
  restoredIds: restored.map((record) => record.id),
  supplementalIds: ADDITIONAL_GERMANY_RECORDS.map((record) => record.id)
};

fs.writeFileSync(path.join("reports", "germany-reference-restoration-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);

console.log(JSON.stringify(audit, null, 2));
