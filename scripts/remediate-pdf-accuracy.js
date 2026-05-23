const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "memcons.json");
const jsPath = path.join(root, "data", "memcons.js");
const reportPath = path.join(root, "reports", "pdf-accuracy-remediation.json");

const FRUS_VOLUME = {
  id: "frus1989-92v08",
  title: "Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe",
  url: "https://history.state.gov/historicaldocuments/frus1989-92v08",
  status: "Being Researched"
};

const LOCAL_SOURCE = {
  name: "Local Bush memcons extractor output",
  url: "https://github.com/therealjameswilson/Bush41-Western-Europe"
};

const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional", "Germany Reference"];

const COVER_ONLY_IDS = new Set([
  "local-1989-10-25-helmut-kohl-telcon",
  "local-1990-04-05-hans-dietrich-genscher-memcon",
  "local-1990-06-12-helmut-kohl-memcon",
  "local-1990-08-23-helmut-kohl-telcon",
  "local-1990-09-06-helmut-kohl-telcon",
  "local-1990-09-10-helmut-kohl-telcon",
  "local-1990-09-12-helmut-kohl-telcon",
  "local-1990-09-13-helmut-kohl-telcon",
  "local-1990-10-03-helmut-kohl-telcon",
  "local-1990-12-31-helmut-kohl-telcon",
  "local-1991-01-22-helmut-kohl-telcon",
  "local-1991-01-26-helmut-kohl-telcon",
  "local-1991-04-18-helmut-kohl-telcon",
  "local-1991-06-24-helmut-kohl-memcon",
  "local-1992-03-31-helmut-kohl-memcon",
  "local-1992-05-06-helmut-kohl-telcon"
]);

const DATE_LINE_CORRECTIONS = {
  "local-1992-10-02-john-major-telcon":
    "Air Force One and 10 Downing Street, October 2, 1992, 1514-1521 and 1525-1537",
  "local-1990-08-20-francois-mitterrand-telcon":
    "Kennebunkport, Maine, August 20, 1990, 3:59 - 4:28 p.m.",
  "local-1991-02-05-francois-mitterrand-telcon":
    "The Oval Office, February 5, 1991, 1:08 - 1:22 p.m.",
  "local-1991-09-24-francois-mitterrand-telcon":
    "Waldorf Astoria, New York, September 24, 1991, 12:52 - 1:05 p.m.",
  "local-1992-01-31-francois-mitterrand-memcon":
    "Waldorf Towers, New York, January 31, 1992, 9:00 - 9:30 a.m. EST",
  "local-1989-10-24-pope-john-paul-ii-telcon":
    "The Oval Office, October 24, 1989, 8:40 - 8:52 a.m. EDT",
  "local-1990-04-17-ruud-lubbers-telcon":
    "The Oval Office, April 17, 1990, 4:20 - 4:32 p.m. EST",
  "local-1990-07-03-ruud-lubbers-telcon":
    "Kennebunkport, July 3, 1990, 1:28 p.m. - 1:35 p.m.",
  "local-1991-01-21-felipe-gonzalez-telcon":
    "Camp David, January 21, 1991, 7:48 - 8:02 a.m. EST",
  "local-1989-10-23-helmut-kohl-telcon":
    "The Oval Office, October 23, 1989, 9:02 - 9:26 a.m. EDT",
  "local-1990-08-22-helmut-kohl-telcon":
    "Kennebunkport, Maine, August 22, 1990, 8:15 - 8:36 a.m.",
  "local-1990-08-30-helmut-kohl-telcon":
    "White House Situation Room, August 30, 1990, 2:45 p.m. - 2:55 p.m.",
  "local-1991-03-21-helmut-kohl-memcon":
    "The Oval Office, March 21, 1991, 3:02 - 3:23 p.m.",
  "local-1991-04-16-helmut-kohl-telcon":
    "The Oval Office, April 16, 1991, 8:42 - 8:59 a.m.",
  "local-1991-11-26-helmut-kohl-telcon":
    "The Oval Office, November 26, 1991, 11:47 - 11:57 a.m.",
  "local-1990-12-17-helmut-kohl-telcon":
    "The Oval Office, December 17, 1990, 8:37 - 8:50 a.m.",
  "local-1992-09-28-helmut-kohl-telcon":
    "Air Force One, September 28, 1992, 1:32 - 1:39 p.m. EST"
};

const MARKER_REBUILDS = {
  "local-1990-08-20-francois-mitterrand-telcon": {
    pages: ["5", "1-4"],
    pageCount: 4,
    marker: { oaId: "30508", folderId: "30508-006", folderTitle: "August 1990 [2]" }
  },
  "local-1990-09-14-francois-mitterrand-telcon": {
    pages: ["3", "1-2"],
    pageCount: 2,
    marker: { oaId: "30510", folderId: "30510-001", folderTitle: "September 1990 [3]" }
  },
  "local-1990-09-16-francois-mitterrand-telcon": {
    pages: ["3", "1-2"],
    pageCount: 2,
    marker: { oaId: "30510", folderId: "30510-001", folderTitle: "September 1990 [3]" }
  },
  "local-1991-09-24-francois-mitterrand-telcon": {
    pages: ["5", "1-4"],
    pageCount: 4,
    marker: { oaId: "30520", folderId: "30520-001", folderTitle: "September 1991 [3]" }
  },
  "local-1990-12-17-helmut-kohl-telcon": {
    pages: ["8", "1-6"],
    pageCount: 6,
    marker: { oaId: "30512", folderId: "30512-003", folderTitle: "December 1990 [1]" }
  }
};

function sourceNoteFromMarker(marker) {
  return [
    "Source: George H.W. Bush Library",
    "Bush Presidential Records",
    "National Security Council",
    "European and Eurasian Directorate",
    "Central Chronological Files",
    `OA/ID ${marker.oaId}`,
    `Folder ID ${marker.folderId}`,
    marker.folderTitle
  ].join(", ") + ".";
}

function provenanceNoteFromMarker(record, marker) {
  return [
    sourceNoteFromMarker(marker),
    "Originally processed under FOIA 2011-0002-F.",
    `The project PDF begins with the FOIA marker provenance sheet and includes ${record.pageCount} pages of conversation text.`,
    `Source file ${record.localOriginalFile || record.sourceTitle || path.basename(record.pdfUrl)}.`
  ].join(" ");
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeMirror(records) {
  fs.writeFileSync(jsPath, `window.MEMCONS = ${JSON.stringify(records, null, 2)};\n`);
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function rewritePdf(record, pages, nextRelativePath = record.pdfUrl) {
  const sourcePath = path.join(root, record.pdfUrl);
  const targetPath = path.join(root, nextRelativePath);
  const tempPath = `${targetPath}.tmp`;
  ensureParent(targetPath);

  const args = ["--empty", "--pages"];
  for (const pageSpec of pages) args.push(sourcePath, pageSpec);
  args.push("--", tempPath);
  execFileSync("qpdf", args);

  if (targetPath !== sourcePath && fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  fs.renameSync(tempPath, targetPath);
  if (targetPath !== sourcePath && fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
}

function movePdf(oldRelativePath, newRelativePath) {
  const oldPath = path.join(root, oldRelativePath);
  const newPath = path.join(root, newRelativePath);
  if (!fs.existsSync(oldPath)) return;
  ensureParent(newPath);
  fs.renameSync(oldPath, newPath);
}

function deletePdf(relativePath) {
  if (!relativePath || /^https?:/i.test(relativePath)) return;
  const filePath = path.join(root, relativePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function rewriteLocalSource(record, marker) {
  const note = sourceNoteFromMarker(marker);
  record.sourceNote = note;
  record.provenanceNote = provenanceNoteFromMarker(record, marker);
  record.provenanceLinks = [record.pdfUrl, LOCAL_SOURCE.url];
  record.provenancePages = 1;
  record.provenanceStatus = "citation-sheet";
  record.source = {
    ...LOCAL_SOURCE,
    series: "European and Eurasian Directorate, Central Chronological Files",
    localIdentifier: marker.folderId,
    foiaNumber: "2011-0002-F"
  };
  record.releaseStatus = record.releaseStatus === "Unknown" ? "Declassified" : record.releaseStatus;
  record.compilerRisks = (record.compilerRisks || []).filter(
    (risk) => !["citation-sheet-reconciliation", "release-status-unknown"].includes(risk)
  );
}

function relabelDehaene(record) {
  const oldPdf = record.pdfUrl;
  const newPdf = "documents/regional/1992-12-03-bush-jean-luc-dehaene-telcon.pdf";
  rewritePdf(record, ["3", "1-2"], newPdf);

  record.id = "local-1992-12-03-jean-luc-dehaene-telcon";
  record.title = "Telephone conversation: President Bush and Jean-Luc Dehaene";
  record.subjectLine = "President Bush and Jean-Luc Dehaene";
  record.sourceTitle = "921203_BushANDMajor_Telcon.pdf";
  record.participants = ["George H. W. Bush", "Jean-Luc Dehaene"];
  record.countries = ["United States", "Belgium"];
  record.chapter = { number: 4, name: "Regional" };
  record.frusTopics = ["Western Europe", "Belgium bilateral relations"];
  record.topics = ["Western Europe", "Belgium bilateral relations", "Corrected mislabeled local PDF"];
  record.naid = "local-921203_BushANDMajor_Telcon-corrected-jean-luc-dehaene";
  record.pdfUrl = newPdf;
  record.catalogUrl = newPdf;
  record.pageCount = 2;
  record.dateLine = "The Oval Office, December 3, 1992, 8:38 - 8:45 a.m.";
  record.notes =
    "Corrected after OCR audit: the clean local PDF is a Bush-Dehaene telcon, not a Bush-Major telcon. The rebuilt PDF begins with the FOIA marker and includes the two pages of telephone-conversation text.";
  rewriteLocalSource(record, { oaId: "30531", folderId: "30531-004", folderTitle: "December 1992 [4]" });

  return { action: "relabeled", oldPdf, newPdf, id: record.id };
}

function relabelGonzalezJanuary4(record) {
  const oldId = record.id;
  const oldPdf = record.pdfUrl;
  const newPdf = "documents/regional/1990-01-04-bush-felipe-gonzalez-telcon.pdf";
  movePdf(oldPdf, newPdf);

  record.id = "local-1990-01-04-felipe-gonzalez-telcon";
  record.date = "1990-01-04";
  record.sortDate = "1990-01-04";
  record.naid = "local-900108_BushANDGonzalez_Telcon-corrected-1990-01-04";
  record.pdfUrl = newPdf;
  record.catalogUrl = newPdf;
  record.dateLine = "The Oval Office, January 4, 1990, 3:20 - 3:35 p.m. EST";
  record.notes =
    "Corrected after OCR audit: the memorandum was dated January 8, but the DATE, TIME, AND PLACE line identifies the telephone conversation as January 4, 1990.";
  record.provenanceNote = (record.provenanceNote || "").replace(oldPdf, newPdf);
  record.provenanceLinks = [newPdf, LOCAL_SOURCE.url];

  return { action: "redated", oldId, id: record.id, oldPdf, newPdf };
}

function normalizeTelcon(record) {
  if (record.id !== "local-1991-03-21-helmut-kohl-memcon") return null;
  record.type = "Telcon";
  record.title = "Telephone conversation: President Bush and Helmut Kohl";
  record.documentTitle = "Memorandum of a Telephone Conversation";
  record.topics = [...new Set([...(record.topics || []), "Corrected type from local filename"])];
  record.notes = `${record.notes || ""} Corrected after OCR audit: the subject line identifies this as a telcon with Chancellor Kohl.`.trim();
  return { action: "type-corrected", id: record.id };
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

const records = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const actions = [];
const kept = [];

for (const record of records) {
  if (COVER_ONLY_IDS.has(record.id)) {
    deletePdf(record.pdfUrl);
    actions.push({
      action: "removed-cover-only",
      id: record.id,
      pdfUrl: record.pdfUrl,
      pageCount: record.pageCount,
      reason:
        "Local PDF contained only an NSC transmitting/cover memorandum and a FOIA marker, without the memorandum of conversation or telephone-conversation text."
    });
    continue;
  }

  if (record.id === "local-1992-12-03-john-major-telcon") {
    actions.push(relabelDehaene(record));
  }

  if (record.id === "local-1990-01-08-felipe-gonzalez-telcon") {
    actions.push(relabelGonzalezJanuary4(record));
  }

  if (DATE_LINE_CORRECTIONS[record.id]) {
    record.dateLine = DATE_LINE_CORRECTIONS[record.id];
    actions.push({ action: "date-line-corrected", id: record.id, dateLine: record.dateLine });
  }

  const markerRebuild = MARKER_REBUILDS[record.id];
  if (markerRebuild) {
    if (!(record.provenancePages === 1 && record.provenanceStatus === "citation-sheet")) {
      rewritePdf(record, markerRebuild.pages);
    }
    record.pageCount = markerRebuild.pageCount;
    rewriteLocalSource(record, markerRebuild.marker);
    actions.push({
      action: "rebuilt-with-provenance-first",
      id: record.id,
      pdfUrl: record.pdfUrl,
      textPages: record.pageCount,
      provenancePages: record.provenancePages,
      source: markerRebuild.marker
    });
  }

  const typeAction = normalizeTelcon(record);
  if (typeAction) actions.push(typeAction);

  if (record.type === "Telcon") record.documentTitle = "Memorandum of a Telephone Conversation";
  if (record.type === "Memcon") record.documentTitle = "Memorandum of Conversation";
  if (!record.frusVolume) record.frusVolume = FRUS_VOLUME;

  kept.push(record);
}

const sorted = kept.sort(byChapterThenDate);
writeJson(dataPath, sorted);
writeMirror(sorted);

const byChapter = {};
for (const record of sorted) {
  const chapter = record.chapter?.name || "Unspecified";
  byChapter[chapter] ||= { records: 0, pages: 0 };
  byChapter[chapter].records += 1;
  byChapter[chapter].pages += record.pageCount || 0;
}

writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  actions,
  totals: {
    records: sorted.length,
    pages: sorted.reduce((sum, record) => sum + (record.pageCount || 0), 0),
    byChapter
  }
});

console.log(JSON.stringify({ actions: actions.length, records: sorted.length, byChapter }, null, 2));
