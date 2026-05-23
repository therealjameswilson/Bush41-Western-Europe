const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "memcons.json");
const DATA_JS_PATH = path.join(ROOT, "data", "memcons.js");
const REPORT_PATH = path.join(ROOT, "reports", "source-note-normalization.json");

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanSentence(value = "") {
  return value
    .replace(/\s+/g, " ")
    .replace(/--/g, " - ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\s+\./g, ".")
    .trim();
}

function firstSourceSentence(note = "") {
  const normalized = cleanSentence(note);
  const markers = [
    ". NAID ",
    ", NAID ",
    ". Catalog:",
    ", Catalog:",
    ". Catalog URL:",
    ", Catalog URL:",
    ". Digital copy:",
    ", Digital copy:",
    ". Digital object:",
    ", Digital object:",
    ". Page count:",
    ", Page count:",
    ". FOIA tracking:",
    ", FOIA tracking:",
    ". Declassified.",
    ", Declassified,",
    ". Full.",
    ", Full,",
    ". Partial.",
    ", Partial,",
    ". Access restriction:",
    ", Access restriction:",
    ". Originally processed under FOIA",
    ", Originally processed under FOIA",
    ". The project PDF includes",
    ", The project PDF includes"
  ];
  const end = markers.reduce((earliest, marker) => {
    const index = normalized.toLowerCase().indexOf(marker.toLowerCase());
    if (index === -1) return earliest;
    return earliest === -1 ? index : Math.min(earliest, index);
  }, -1);
  const source = (end === -1 ? normalized : normalized.slice(0, end)).replace(/[,.]\s*$/, "");
  return source ? `${source}.` : "";
}

function releaseSentence(record) {
  const status = record.releaseStatus || "";
  if (/withheld|restricted|denied|excised/i.test(status)) {
    const extent = record.pageCount ? ` Approximate extent: ${record.pageCount} ${record.pageCount === 1 ? "page" : "pages"}.` : "";
    return `Not declassified.${extent}`.trim();
  }
  if (/unknown/i.test(status)) return "Release status not determined.";
  if (/partial/i.test(status)) return "Partial release.";
  if (/full/i.test(status)) return "Full release.";
  if (/declassified/i.test(status)) return "Declassified.";
  return "";
}

function sourcePageRange(record) {
  const sourceTitleMatch = (record.sourceTitle || "").match(/source pages?\s+([^;]+)/i);
  if (sourceTitleMatch) return sourceTitleMatch[1].trim();
  const sourceNoteMatch = (record.provenanceNote || record.sourceNote || "").match(/source pages?\s+([0-9,\-\s]+)/i);
  return sourceNoteMatch ? sourceNoteMatch[1].trim() : "";
}

function generatedSource(record) {
  const note = record.provenanceNote || record.sourceNote || "";
  if (
    record.provenanceStatus === "citation-sheet" &&
    record.sourceNote &&
    !/Citation sheet extraction pending/i.test(record.sourceNote)
  ) {
    return cleanSentence([firstSourceSentence(record.sourceNote), releaseSentence(record)].filter(Boolean).join(" "));
  }

  if (
    /Local Bush memcons extractor output|official catalog metadata requires manual reconciliation|citation sheet reconciliation pending/i.test(note) ||
    /local/i.test(record.source?.name || "")
  ) {
    return "Source: Citation sheet extraction pending.";
  }

  const existing = firstSourceSentence(note);
  if (existing) {
    return cleanSentence([existing, releaseSentence(record)].filter(Boolean).join(" "));
  }

  const source = record.source || {};
  const parts = unique([
    source.referenceUnit || "George H.W. Bush Library",
    /Scowcroft/i.test(source.name || "") ? "Bush Presidential Records, Brent Scowcroft Collection" : "Bush Presidential Records",
    source.series,
    record.localIdentifier ? `OA/ID ${record.localIdentifier}` : "",
    record.sourceTitle || record.documentTitle || record.title
  ]);
  const pages = sourcePageRange(record);
  if (pages) parts.push(`source pages ${pages}`);
  return cleanSentence([`Source: ${parts.join(", ")}.`, releaseSentence(record)].filter(Boolean).join(" "));
}

function compilerRisks(record) {
  const risks = [];
  const note = record.provenanceNote || record.sourceNote || "";
  if (
    record.provenanceStatus !== "citation-sheet" &&
    (/Local Bush memcons extractor output|official catalog metadata requires manual reconciliation/i.test(note) ||
      /local/i.test(record.source?.name || ""))
  ) {
    risks.push("citation-sheet-reconciliation");
  }
  if (/unknown/i.test(record.releaseStatus || "")) risks.push("release-status-unknown");
  if (/withheld|restricted|denied|excised/i.test(record.releaseStatus || "")) risks.push("declassification-review");
  if (!record.pageCount) risks.push("page-count-gap");
  if (!record.pdfUrl) risks.push("pdf-gap");
  return risks;
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const normalized = records.map((record) => {
    const provenanceNote = record.provenanceNote || record.sourceNote || "";
    const sourceNote = generatedSource({ ...record, provenanceNote });
    const provenanceLinks = unique([
      record.catalogUrl,
      record.pdfUrl,
      record.source?.objectUrl,
      record.source?.url,
      record.source?.findingAidUrl
    ]);
    return {
      ...record,
      sourceNote,
      provenanceNote,
      provenanceLinks,
      compilerRisks: compilerRisks({ ...record, provenanceNote })
    };
  });

  const json = `${JSON.stringify(normalized, null, 2)}\n`;
  fs.writeFileSync(DATA_PATH, json);
  fs.writeFileSync(DATA_JS_PATH, `window.MEMCONS = ${json};\n`);
  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        records: normalized.length,
        sourceNotesWithUrls: normalized.filter((record) => /https?:\/\//.test(record.sourceNote || "")).length,
        provenanceNotesWithUrls: normalized.filter((record) => /https?:\/\//.test(record.provenanceNote || "")).length,
        citationSheetReconciliation: normalized.filter((record) =>
          (record.compilerRisks || []).includes("citation-sheet-reconciliation")
        ).length,
        releaseStatusUnknown: normalized.filter((record) => (record.compilerRisks || []).includes("release-status-unknown")).length,
        declassificationReview: normalized.filter((record) => (record.compilerRisks || []).includes("declassification-review")).length
      },
      null,
      2
    )}\n`
  );

  console.log(`Normalized ${normalized.length} source notes.`);
}

main();
