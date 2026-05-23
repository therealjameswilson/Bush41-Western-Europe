const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MEMCONS_PATH = path.join(ROOT, "data", "memcons.json");
const MEMCONS_JS_PATH = path.join(ROOT, "data", "memcons.js");
const STATEMENTS_PATH = path.join(ROOT, "data", "public-statements.json");
const GAPS_PATH = path.join(ROOT, "data", "compiler-gaps.json");
const GAPS_JS_PATH = path.join(ROOT, "data", "compiler-gaps.js");
const REPORT_PATH = path.join(ROOT, "reports", "compiler-gap-remediation.md");

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeWindow(filePath, name, data) {
  fs.writeFileSync(filePath, `window.${name} = ${JSON.stringify(data, null, 2)};\n`);
}

function sourcePages(record) {
  return (
    (record.sourceTitle || "").match(/source pages?\s+([^;]+)/i)?.[1]?.trim() ||
    (record.provenanceNote || record.sourceNote || "").match(/source pages?\s+([0-9,\-\s]+)/i)?.[1]?.trim() ||
    ""
  );
}

function addDuplicateDisambiguation(records) {
  const groups = new Map();
  for (const record of records) {
    const key = [record.date, record.type, record.title, record.naid].join("|").toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const changed = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group
      .sort((a, b) => (sourcePages(a) || "").localeCompare(sourcePages(b) || ""))
      .forEach((record, index) => {
        const pages = sourcePages(record);
        record.disambiguationNote = `Distinct same-day ${record.type.toLowerCase()} ${index + 1} of ${group.length}${
          pages ? `; source pages ${pages}` : ""
        }.`;
        record.topics = [...new Set([...(record.topics || []), "Same-day duplicate disambiguated"])];
        changed.push({ id: record.id, date: record.date, title: record.title, sourcePages: pages });
      });
  }
  return changed;
}

function buildGaps(records, statements, disambiguated) {
  const local = records.filter((record) => (record.compilerRisks || []).includes("citation-sheet-reconciliation"));
  const unknownRelease = records.filter((record) => (record.compilerRisks || []).includes("release-status-unknown"));
  const sourceNoteUrls = records.filter((record) => /https?:\/\//.test(record.sourceNote || ""));
  const fullTextStatements = statements.filter((statement) => statement.selectionBasis === "full text");

  return [
    {
      id: "gap-local-citation-sheets",
      priority: "Critical",
      status: local.length ? "Partly remediated" : "Remediated",
      title: "Reconcile project-only local extractor records against official citation sheets",
      evidence: `${local.length} records remain marked citation-sheet extraction pending; clean Source Notes are separated from full provenance so they no longer masquerade as final FRUS citations.`,
      nextAction: "Use the PDF citation sheets or official catalog items to replace project-only provenance before final document selection.",
      targetCount: local.length
    },
    {
      id: "gap-source-note-working-metadata",
      priority: "High",
      status: sourceNoteUrls.length ? "Open" : "Remediated",
      title: "Keep URLs and project metadata out of FRUS-style Source Notes",
      evidence: `${sourceNoteUrls.length} displayed Source Notes still contain URLs; full URLs are retained in provenanceNote/provenanceLinks.`,
      nextAction: "Use sourceNote for FRUS-style citation text and provenanceNote/provenanceLinks for working metadata.",
      targetCount: sourceNoteUrls.length
    },
    {
      id: "gap-public-papers-full-text",
      priority: "High",
      status: "Remediated",
      title: "Broaden Public Papers beyond title-only selection",
      evidence: `${statements.length} public-statement references are now staged, including ${fullTextStatements.length} full-text matches and title matches. GovInfo granules and full-text search are preferred over APP volume references.`,
      nextAction: "Use the match-basis filter to separate high-precision title hits from broader full-text context.",
      targetCount: fullTextStatements.length
    },
    {
      id: "gap-duplicate-disambiguation",
      priority: "Medium",
      status: disambiguated.length ? "Remediated" : "No duplicates found",
      title: "Disambiguate same-day/same-title conversations",
      evidence: `${disambiguated.length} records now carry same-day duplicate disambiguation notes keyed to source pages.`,
      nextAction: "Use source-page cues when selecting or citing same-day calls.",
      targetCount: disambiguated.length
    },
    {
      id: "gap-release-status-unknown",
      priority: "Medium",
      status: unknownRelease.length ? "Open" : "Remediated",
      title: "Resolve unknown release status records",
      evidence: `${unknownRelease.length} records still have unknown release status, mostly because official catalog/citation metadata has not been reconciled.`,
      nextAction: "Resolve with Bush Library catalog records or citation sheets.",
      targetCount: unknownRelease.length
    },
    {
      id: "gap-broader-source-classes",
      priority: "Medium",
      status: "Open",
      title: "Search non-memcon source classes before closing selection",
      evidence: "The current site is strongest for memcons, telcons, Scowcroft, and Public Papers. State Department central files, Baker files, embassy reporting, defense files, and intelligence/context files are not yet systematically represented.",
      nextAction: "Add source-family sweeps or explicit exclusion notes before treating the volume as source-complete.",
      targetCount: 0
    }
  ];
}

function markdown(gaps) {
  return `# Compiler Gap Remediation - Bush41 Western Europe

Updated: ${new Date().toISOString().slice(0, 10)}

${gaps
  .map(
    (gap) => `## ${gap.priority}: ${gap.title}

- Status: ${gap.status}
- Evidence: ${gap.evidence}
- Next action: ${gap.nextAction}
`
  )
  .join("\n")}
`;
}

function main() {
  const records = JSON.parse(fs.readFileSync(MEMCONS_PATH, "utf8"));
  const statements = JSON.parse(fs.readFileSync(STATEMENTS_PATH, "utf8"));
  const disambiguated = addDuplicateDisambiguation(records);
  const gaps = buildGaps(records, statements, disambiguated);

  const memconJson = `${JSON.stringify(records, null, 2)}\n`;
  fs.writeFileSync(MEMCONS_PATH, memconJson);
  fs.writeFileSync(MEMCONS_JS_PATH, `window.MEMCONS = ${memconJson};\n`);
  writeJson(GAPS_PATH, gaps);
  writeWindow(GAPS_JS_PATH, "COMPILER_GAPS", gaps);
  fs.writeFileSync(REPORT_PATH, markdown(gaps));

  console.log(JSON.stringify({ gaps: gaps.length, disambiguated: disambiguated.length }, null, 2));
}

main();
